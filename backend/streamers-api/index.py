"""
Streamers API: список Twitch-стримеров сообщества с live-статусом.
GET  /                      — список активных стримеров с текущим live-статусом (кэш Twitch-данных на 60 сек)
GET  /?action=admin_list    — полный список для админки (только admin)
POST action=add             — добавить стримера по twitch_login (только admin)
POST action=update          — изменить display_name/is_active/sort_order (только admin)
POST action=delete          — удалить стримера (только admin)
"""
import json
import os
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

# In-memory кэш живёт, пока функция "тёплая" между вызовами
_cache = {'token': None, 'token_expires': 0, 'streams': None, 'streams_at': 0}
STREAMS_CACHE_TTL = 60


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
    """Подтягивает profile_image_url для указанных логинов (без кэша, только при необходимости)."""
    if not logins:
        return {}
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
        result[login] = u.get('profile_image_url', '')
    return result


def handle_list(conn):
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT id, twitch_login, display_name FROM {SCHEMA}.streamers "
            f"WHERE is_active = true ORDER BY sort_order ASC, id ASC"
        )
        rows = cur.fetchall()

    logins = [r[1] for r in rows]
    live = fetch_live_status(logins)
    avatars = fetch_avatars(logins) if logins else {}

    streamers = []
    for row in rows:
        login_lower = row[1].lower()
        info = live.get(login_lower, {})
        streamers.append({
            'id': row[0],
            'twitch_login': row[1],
            'display_name': row[2] or row[1],
            'channel_url': f'https://twitch.tv/{row[1]}',
            'avatar_url': avatars.get(login_lower, ''),
            'is_live': info.get('is_live', False),
            'title': info.get('title', ''),
            'viewer_count': info.get('viewer_count', 0),
            'thumbnail_url': info.get('thumbnail_url', ''),
            'started_at': info.get('started_at', ''),
            'game_name': info.get('game_name', ''),
        })

    streamers.sort(key=lambda s: (not s['is_live'],))
    return ok({'streamers': streamers})


def handle_admin_list(conn):
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT id, twitch_login, display_name, is_active, sort_order, created_at "
            f"FROM {SCHEMA}.streamers ORDER BY sort_order ASC, id ASC"
        )
        rows = cur.fetchall()
    return ok({'streamers': [
        {
            'id': r[0], 'twitch_login': r[1], 'display_name': r[2],
            'is_active': r[3], 'sort_order': r[4], 'created_at': str(r[5]),
        } for r in rows
    ]})


def handle_add(body, user, conn):
    login = (body.get('twitch_login') or '').strip().lower()
    if not login:
        return err('Укажите логин канала Twitch')
    display_name = (body.get('display_name') or '').strip() or login
    with conn.cursor() as cur:
        cur.execute(f"SELECT id FROM {SCHEMA}.streamers WHERE twitch_login = %s", (login,))
        if cur.fetchone():
            return err('Этот стример уже добавлен')
        cur.execute(
            f"INSERT INTO {SCHEMA}.streamers (twitch_login, display_name, added_by) "
            f"VALUES (%s, %s, %s) RETURNING id",
            (login, display_name, user['id']),
        )
        new_id = cur.fetchone()[0]
        conn.commit()
    return ok({'id': new_id})


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
