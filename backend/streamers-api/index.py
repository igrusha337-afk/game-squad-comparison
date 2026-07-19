"""
Streamers API: список Twitch/YouTube-стримеров сообщества с live-статусом.
GET  /                      — список активных стримеров с текущим live-статусом
                               (кэш live-статуса 60 сек, кэш аватарок/баннеров/превью 10 мин)
GET  /?action=admin_list    — полный список для админки (только admin)
POST action=add             — добавить стримера по twitch_login (+ опционально youtube_channel) (только admin)
POST action=update          — изменить display_name/is_active/sort_order/youtube_channel (только admin)
POST action=delete          — удалить стримера (только admin)
"""
import json
import os
import re
import time
import urllib.request
import urllib.parse
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
    'Access-Control-Max-Age': '86400',
}

TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
TWITCH_STREAMS_URL = 'https://api.twitch.tv/helix/streams'
TWITCH_USERS_URL = 'https://api.twitch.tv/helix/users'

YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search'
YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos'
YOUTUBE_CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels'

# In-memory кэш живёт, пока функция "тёплая" между вызовами
_cache = {
    'token': None, 'token_expires': 0,
    'streams': None, 'streams_at': 0, 'streams_key': None,
    'yt_streams': None, 'yt_streams_at': 0, 'yt_streams_key': None,
    'avatars': None, 'avatars_at': 0, 'avatars_key': None,
    'yt_info': None, 'yt_info_at': 0, 'yt_info_key': None,
    'yt_last_video': None, 'yt_last_video_at': 0, 'yt_last_video_key': None,
}
STREAMS_CACHE_TTL = 60
# Аватарки/баннеры/превью последних видео меняются редко — кэшируем дольше,
# чтобы не дёргать Twitch/YouTube на каждый опрос клиента (экономия вычислительного времени)
META_CACHE_TTL = 600


def ok(data, status=200):
    return {
        'statusCode': status,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, ensure_ascii=False, default=str),
    }


def err(msg, status=400):
    return ok({'error': msg}, status)


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_user(session_id, conn):
    if not session_id:
        return None
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT u.id, u.username, u.is_admin FROM {SCHEMA}.sessions s "
            f"JOIN {SCHEMA}.users u ON u.id = s.user_id "
            f"WHERE s.id = %s AND s.expires_at > now()",
            (session_id,)
        )
        row = cur.fetchone()
        if row:
            return {'id': row[0], 'username': row[1], 'is_admin': row[2]}
    return None


# ───────────────────────── Twitch ─────────────────────────

def get_twitch_token():
    now = time.time()
    if _cache['token'] and _cache['token_expires'] > now + 30:
        return _cache['token']

    client_id = os.environ.get('TWITCH_CLIENT_ID', '')
    client_secret = os.environ.get('TWITCH_CLIENT_SECRET', '')
    if not client_id or not client_secret:
        return None

    data = urllib.parse.urlencode({
        'client_id': client_id,
        'client_secret': client_secret,
        'grant_type': 'client_credentials',
    }).encode()
    req = urllib.request.Request(TWITCH_TOKEN_URL, data=data, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            payload = json.loads(resp.read())
    except Exception:
        return None

    token = payload.get('access_token')
    if not token:
        return None
    _cache['token'] = token
    _cache['token_expires'] = now + payload.get('expires_in', 3600)
    return token


def fetch_live_status(logins):
    """Возвращает { login_lower: {is_live, title, viewer_count, thumbnail_url, started_at, game_name} }."""
    if not logins:
        return {}

    now = time.time()
    cache_key = tuple(sorted(logins))
    if _cache['streams'] is not None and _cache.get('streams_key') == cache_key and now - _cache['streams_at'] < STREAMS_CACHE_TTL:
        return _cache['streams']

    token = get_twitch_token()
    client_id = os.environ.get('TWITCH_CLIENT_ID', '')
    if not token or not client_id:
        return {}

    qs = '&'.join(f'user_login={urllib.parse.quote(l)}' for l in logins[:100])
    req = urllib.request.Request(
        f'{TWITCH_STREAMS_URL}?{qs}',
        headers={'Client-Id': client_id, 'Authorization': f'Bearer {token}'},
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            payload = json.loads(resp.read())
    except Exception:
        return {}

    result = {}
    for s in payload.get('data', []):
        login = (s.get('user_login') or '').lower()
        thumb = (s.get('thumbnail_url') or '').replace('{width}', '440').replace('{height}', '248')
        result[login] = {
            'is_live': True,
            'title': s.get('title', ''),
            'viewer_count': s.get('viewer_count', 0),
            'thumbnail_url': thumb,
            'started_at': s.get('started_at', ''),
            'game_name': s.get('game_name', ''),
        }

    _cache['streams'] = result
    _cache['streams_key'] = cache_key
    _cache['streams_at'] = now
    return result


def fetch_avatars(logins):
    """Подтягивает profile_image_url и offline_image_url для указанных логинов (кэш 10 мин)."""
    if not logins:
        return {}
    now = time.time()
    cache_key = tuple(sorted(logins))
    if _cache['avatars'] is not None and _cache.get('avatars_key') == cache_key and now - _cache['avatars_at'] < META_CACHE_TTL:
        return _cache['avatars']

    token = get_twitch_token()
    client_id = os.environ.get('TWITCH_CLIENT_ID', '')
    if not token or not client_id:
        return {}
    qs = '&'.join(f'login={urllib.parse.quote(l)}' for l in logins[:100])
    req = urllib.request.Request(
        f'{TWITCH_USERS_URL}?{qs}',
        headers={'Client-Id': client_id, 'Authorization': f'Bearer {token}'},
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            payload = json.loads(resp.read())
    except Exception:
        return {}
    result = {}
    for u in payload.get('data', []):
        login = (u.get('login') or '').lower()
        result[login] = {
            'avatar_url': u.get('profile_image_url', ''),
            'offline_image_url': u.get('offline_image_url', ''),
        }
    _cache['avatars'] = result
    _cache['avatars_key'] = cache_key
    _cache['avatars_at'] = now
    return result


# ───────────────────────── YouTube ─────────────────────────

def get_youtube_key():
    return os.environ.get('YOUTUBE_API_KEY', '')


def _yt_get(url, params):
    key = get_youtube_key()
    if not key:
        return None
    qs = urllib.parse.urlencode({**params, 'key': key})
    req = urllib.request.Request(f'{url}?{qs}')
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            return json.loads(resp.read())
    except Exception:
        return None


def resolve_youtube_channel(raw):
    """Принимает ссылку/handle/ID канала YouTube, возвращает channel_id или None."""
    raw = (raw or '').strip()
    if not raw:
        return None

    m = re.search(r'youtube\.com/channel/([\w-]+)', raw)
    if m:
        return m.group(1)

    if re.fullmatch(r'UC[\w-]{20,}', raw):
        return raw

    m = re.search(r'youtube\.com/@([\w.-]+)', raw)
    handle = m.group(1) if m else (raw[1:] if raw.startswith('@') else raw)
    handle = handle.strip('/')

    payload = _yt_get(YOUTUBE_CHANNELS_URL, {'part': 'id', 'forHandle': handle})
    items = (payload or {}).get('items', [])
    if items:
        return items[0]['id']

    payload = _yt_get(YOUTUBE_CHANNELS_URL, {'part': 'id', 'forUsername': handle})
    items = (payload or {}).get('items', [])
    if items:
        return items[0]['id']

    payload = _yt_get(YOUTUBE_SEARCH_URL, {'part': 'snippet', 'type': 'channel', 'q': handle, 'maxResults': 1})
    items = (payload or {}).get('items', [])
    if items:
        return items[0]['snippet']['channelId']

    return None


def fetch_youtube_live(channel_ids):
    """Возвращает { channel_id: {is_live, title, viewer_count, thumbnail_url, started_at, video_id} }."""
    if not channel_ids:
        return {}

    now = time.time()
    cache_key = tuple(sorted(channel_ids))
    if _cache['yt_streams'] is not None and _cache.get('yt_streams_key') == cache_key and now - _cache['yt_streams_at'] < STREAMS_CACHE_TTL:
        return _cache['yt_streams']

    if not get_youtube_key():
        return {}

    result = {}
    for cid in channel_ids[:25]:
        payload = _yt_get(YOUTUBE_SEARCH_URL, {
            'part': 'snippet', 'channelId': cid, 'eventType': 'live', 'type': 'video', 'maxResults': 1,
        })
        items = (payload or {}).get('items', [])
        if not items:
            continue
        video_id = items[0]['id']['videoId']
        snippet = items[0]['snippet']

        details = _yt_get(YOUTUBE_VIDEOS_URL, {'part': 'liveStreamingDetails,snippet', 'id': video_id})
        vitems = (details or {}).get('items', [])
        live_details = vitems[0].get('liveStreamingDetails', {}) if vitems else {}
        thumb = snippet.get('thumbnails', {}).get('high', {}).get('url', '')

        result[cid] = {
            'is_live': True,
            'title': snippet.get('title', ''),
            'viewer_count': int(live_details.get('concurrentViewers', 0) or 0),
            'thumbnail_url': thumb,
            'started_at': live_details.get('actualStartTime', ''),
            'video_id': video_id,
        }

    _cache['yt_streams'] = result
    _cache['yt_streams_key'] = cache_key
    _cache['yt_streams_at'] = now
    return result


def fetch_youtube_channel_info(channel_ids):
    """Возвращает { channel_id: {avatar_url, title, banner_url} } (кэш 10 мин)."""
    if not channel_ids:
        return {}
    now = time.time()
    cache_key = tuple(sorted(channel_ids))
    if _cache['yt_info'] is not None and _cache.get('yt_info_key') == cache_key and now - _cache['yt_info_at'] < META_CACHE_TTL:
        return _cache['yt_info']

    payload = _yt_get(YOUTUBE_CHANNELS_URL, {'part': 'snippet,brandingSettings', 'id': ','.join(channel_ids[:50])})
    result = {}
    for item in (payload or {}).get('items', []):
        banner = item.get('brandingSettings', {}).get('image', {}).get('bannerExternalUrl', '')
        result[item['id']] = {
            'avatar_url': item.get('snippet', {}).get('thumbnails', {}).get('default', {}).get('url', ''),
            'title': item.get('snippet', {}).get('title', ''),
            'banner_url': f'{banner}=w1280-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj' if banner else '',
        }
    _cache['yt_info'] = result
    _cache['yt_info_key'] = cache_key
    _cache['yt_info_at'] = now
    return result


def fetch_youtube_last_video(channel_ids):
    """Возвращает { channel_id: thumbnail_url } последнего загруженного видео (для офлайн-превью, кэш 10 мин)."""
    if not channel_ids or not get_youtube_key():
        return {}
    now = time.time()
    cache_key = tuple(sorted(channel_ids))
    if _cache['yt_last_video'] is not None and _cache.get('yt_last_video_key') == cache_key and now - _cache['yt_last_video_at'] < META_CACHE_TTL:
        return _cache['yt_last_video']

    result = {}
    for cid in channel_ids[:25]:
        payload = _yt_get(YOUTUBE_SEARCH_URL, {
            'part': 'snippet', 'channelId': cid, 'order': 'date', 'type': 'video', 'maxResults': 1,
        })
        items = (payload or {}).get('items', [])
        if not items:
            continue
        thumbs = items[0].get('snippet', {}).get('thumbnails', {})
        result[cid] = thumbs.get('high', {}).get('url', '') or thumbs.get('default', {}).get('url', '')
    _cache['yt_last_video'] = result
    _cache['yt_last_video_key'] = cache_key
    _cache['yt_last_video_at'] = now
    return result


# ───────────────────────── Handlers ─────────────────────────

def handle_list(conn):
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT id, twitch_login, display_name, youtube_channel_id FROM {SCHEMA}.streamers "
            f"WHERE is_active = true ORDER BY sort_order ASC, id ASC"
        )
        rows = cur.fetchall()

    logins = [r[1] for r in rows if r[1]]
    yt_ids = [r[3] for r in rows if r[3]]

    live_tw = fetch_live_status(logins)
    avatars_tw = fetch_avatars(logins) if logins else {}
    live_yt = fetch_youtube_live(yt_ids) if yt_ids else {}
    info_yt = fetch_youtube_channel_info(yt_ids) if yt_ids else {}
    last_video_yt = fetch_youtube_last_video(yt_ids) if yt_ids else {}

    streamers = []
    for row in rows:
        sid, twitch_login, display_name, youtube_channel_id = row
        platforms = []
        tw_data = avatars_tw.get(twitch_login.lower(), {}) if twitch_login else {}

        if twitch_login:
            tw_info = live_tw.get(twitch_login.lower(), {})
            platforms.append({
                'platform': 'twitch',
                'url': f'https://twitch.tv/{twitch_login}',
                'is_live': tw_info.get('is_live', False),
                'title': tw_info.get('title', ''),
                'viewer_count': tw_info.get('viewer_count', 0),
                'thumbnail_url': tw_info.get('thumbnail_url', ''),
                'offline_thumbnail_url': tw_data.get('offline_image_url', ''),
                'started_at': tw_info.get('started_at', ''),
                'game_name': tw_info.get('game_name', ''),
            })

        if youtube_channel_id:
            yt_info = live_yt.get(youtube_channel_id, {})
            yt_channel = info_yt.get(youtube_channel_id, {})
            platforms.append({
                'platform': 'youtube',
                'url': f'https://youtube.com/channel/{youtube_channel_id}',
                'is_live': yt_info.get('is_live', False),
                'title': yt_info.get('title', ''),
                'viewer_count': yt_info.get('viewer_count', 0),
                'thumbnail_url': yt_info.get('thumbnail_url', ''),
                'offline_thumbnail_url': last_video_yt.get(youtube_channel_id, '') or yt_channel.get('banner_url', ''),
                'started_at': yt_info.get('started_at', ''),
                'game_name': '',
            })

        is_live = any(p['is_live'] for p in platforms)
        primary = next((p for p in platforms if p['is_live']), platforms[0] if platforms else {})
        offline_thumb = primary.get('offline_thumbnail_url', '') if primary else ''

        avatar_url = tw_data.get('avatar_url', '')
        if not avatar_url and youtube_channel_id:
            avatar_url = info_yt.get(youtube_channel_id, {}).get('avatar_url', '')

        streamers.append({
            'id': sid,
            'twitch_login': twitch_login or '',
            'youtube_channel_id': youtube_channel_id or '',
            'display_name': display_name or twitch_login or (info_yt.get(youtube_channel_id, {}) or {}).get('title', ''),
            'channel_url': primary.get('url', ''),
            'avatar_url': avatar_url,
            'is_live': is_live,
            'title': primary.get('title', ''),
            'viewer_count': primary.get('viewer_count', 0),
            'thumbnail_url': primary.get('thumbnail_url', ''),
            'offline_thumbnail_url': offline_thumb,
            'started_at': primary.get('started_at', ''),
            'game_name': primary.get('game_name', ''),
            'platforms': platforms,
        })

    streamers.sort(key=lambda s: (not s['is_live'],))
    return ok({'streamers': streamers})


def handle_admin_list(conn):
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT id, twitch_login, display_name, is_active, sort_order, created_at, youtube_channel_id "
            f"FROM {SCHEMA}.streamers ORDER BY sort_order ASC, id ASC"
        )
        rows = cur.fetchall()
    return ok({'streamers': [
        {
            'id': r[0], 'twitch_login': r[1], 'display_name': r[2],
            'is_active': r[3], 'sort_order': r[4], 'created_at': str(r[5]),
            'youtube_channel_id': r[6] or '',
        } for r in rows
    ]})


def handle_add(body, user, conn):
    login = (body.get('twitch_login') or '').strip().lower()
    if not login:
        return err('Укажите логин канала Twitch')
    display_name = (body.get('display_name') or '').strip() or login

    youtube_channel_id = None
    youtube_raw = (body.get('youtube_channel') or '').strip()
    if youtube_raw:
        youtube_channel_id = resolve_youtube_channel(youtube_raw)
        if not youtube_channel_id:
            return err('Не удалось найти канал YouTube по указанной ссылке/ID')

    with conn.cursor() as cur:
        cur.execute(f"SELECT id FROM {SCHEMA}.streamers WHERE twitch_login = %s", (login,))
        if cur.fetchone():
            return err('Этот стример уже добавлен')
        cur.execute(
            f"INSERT INTO {SCHEMA}.streamers (twitch_login, display_name, added_by, youtube_channel_id) "
            f"VALUES (%s, %s, %s, %s) RETURNING id",
            (login, display_name, user['id'], youtube_channel_id),
        )
        new_id = cur.fetchone()[0]
        conn.commit()
    return ok({'id': new_id, 'youtube_channel_id': youtube_channel_id})


def handle_update(body, conn):
    streamer_id = body.get('id')
    if not streamer_id:
        return err('id обязателен')
    fields, values = [], []
    if 'display_name' in body:
        fields.append('display_name = %s')
        values.append((body.get('display_name') or '').strip())
    if 'is_active' in body:
        fields.append('is_active = %s')
        values.append(bool(body.get('is_active')))
    if 'sort_order' in body:
        fields.append('sort_order = %s')
        values.append(int(body.get('sort_order') or 0))
    if 'youtube_channel' in body:
        youtube_raw = (body.get('youtube_channel') or '').strip()
        if not youtube_raw:
            fields.append('youtube_channel_id = %s')
            values.append(None)
        else:
            resolved = resolve_youtube_channel(youtube_raw)
            if not resolved:
                return err('Не удалось найти канал YouTube по указанной ссылке/ID')
            fields.append('youtube_channel_id = %s')
            values.append(resolved)
    if not fields:
        return err('Нечего обновлять')
    values.append(streamer_id)
    with conn.cursor() as cur:
        cur.execute(f"UPDATE {SCHEMA}.streamers SET {', '.join(fields)} WHERE id = %s", values)
        conn.commit()
    return ok({'success': True})


def handle_delete(body, conn):
    streamer_id = body.get('id')
    if not streamer_id:
        return err('id обязателен')
    with conn.cursor() as cur:
        cur.execute(f"DELETE FROM {SCHEMA}.streamers WHERE id = %s", (streamer_id,))
        conn.commit()
    return ok({'success': True})


def handler(event: dict, context) -> dict:
    """Список Twitch/YouTube-стримеров сообщества с live-статусом + управление ими из админки."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    session_id = (event.get('headers') or {}).get('X-Session-Id', '').strip()
    params = event.get('queryStringParameters') or {}

    conn = get_conn()
    try:
        if method == 'GET':
            action = params.get('action', '')
            if action == 'admin_list':
                user = get_user(session_id, conn)
                if not user or not user['is_admin']:
                    return err('Нет прав', 403)
                return handle_admin_list(conn)
            return handle_list(conn)

        if method == 'POST':
            try:
                body = json.loads(event.get('body') or '{}')
            except (json.JSONDecodeError, TypeError):
                return err('Некорректный JSON')

            user = get_user(session_id, conn)
            if not user or not user['is_admin']:
                return err('Нет прав', 403)

            action = body.get('action', '').strip()
            if action == 'add':
                return handle_add(body, user, conn)
            if action == 'update':
                return handle_update(body, conn)
            if action == 'delete':
                return handle_delete(body, conn)
            return err('Неизвестное действие')

        return err('Метод не поддерживается', 405)
    finally:
        conn.close()