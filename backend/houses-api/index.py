"""
Houses API: управление домами CB.
GET  /                       — список домов. Поддерживает sort=points|members|date_new|date_old (по умолчанию points)
GET  /?action=house&id=N     — детали дома (видео + фото галерея + members с ролями + audio + соцсети + трофеи)
POST action=create_house     — создать дом
POST action=update_house     — обновить дом: шапка (name/short_desc/server/emblem), описание,
                                фото, соцсети (owner или admin)
POST action=join_house       — вступить в дом
POST action=leave_house      — покинуть дом
POST action=kick_member      — исключить участника (owner или admin)
POST action=delete_house     — удалить дом (owner или admin)
POST action=transfer_ownership — передать права главы дома другому участнику (owner или admin)
POST action=upload_video     — загрузить видео дома, до 30 МБ, максимум 10 штук (owner или admin)
POST action=delete_video     — удалить видео дома (owner или admin)
POST action=delete_photo     — удалить фото дома (owner или admin)
POST action=upload_audio     — загрузить аудио дома, до 25 МБ (owner или admin)
POST action=delete_audio     — удалить аудио дома (owner или admin)
POST action=award_points     — начислить баллы активности (только из других функций)
POST action=set_member_role  — назначить роль участнику: diplomat/marshal/lord/knight (owner или admin)
POST action=award_trophy     — выдать дому трофей: capital/secondary_capital (только admin)
POST action=revoke_trophy    — забрать трофей у дома (только admin)
"""
import json, os, base64, uuid
import psycopg2
import boto3

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
    'Access-Control-Max-Age': '86400',
}

ALLOWED_IMAGE_TYPES = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
}
ALLOWED_VIDEO_TYPES = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
    'video/quicktime': 'mov',
}
ALLOWED_AUDIO_TYPES = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/webm': 'weba',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
}
MAX_IMAGE_SIZE = 5 * 1024 * 1024    # 5 MB
MAX_VIDEO_SIZE = 30 * 1024 * 1024   # 30 MB — большие файлы не проходят через шлюз облачной функции в виде base64
MAX_AUDIO_SIZE = 25 * 1024 * 1024   # 25 MB
MAX_VIDEOS_PER_HOUSE = 10

SOCIAL_FIELDS = ['telegram', 'discord', 'vk', 'youtube', 'rutube', 'twitch']

HOUSE_ROLES = {
    'owner': 'Глава дома',
    'diplomat': 'Сенешаль',
    'marshal': 'Маршал',
    'lord': 'Лорд',
    'knight': 'Рыцарь',
}

TROPHY_TYPES = {
    'capital': 'Главная столица',
    'secondary_capital': 'Второстепенная столица',
}

TROPHY_POINTS = {
    'capital': 50,
    'secondary_capital': 30,
}


# ─── helpers ────────────────────────────────────────────────────────────────

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
    """Возвращает id, username, is_admin, house_id, house_name, house_role."""
    if not session_id:
        return None
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT u.id, u.username, u.is_admin, u.house_id, u.house_name, u.house_role "
            f"FROM {SCHEMA}.sessions s "
            f"JOIN {SCHEMA}.users u ON u.id = s.user_id "
            f"WHERE s.id = %s AND s.expires_at > now()",
            (session_id,)
        )
        row = cur.fetchone()
        if row:
            return {
                'id': row[0],
                'username': row[1],
                'is_admin': row[2],
                'house_id': row[3],
                'house_name': row[4] or '',
                'house_role': row[5] or '',
            }
    return None


def get_s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def cdn_url(filename):
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{filename}"


def upload_file(file_data, content_type, folder, allowed_types, max_size):
    if content_type not in allowed_types:
        raise ValueError(f'Неподдерживаемый тип файла: {content_type}')
    if ',' in file_data:
        file_data = file_data.split(',', 1)[1]
    file_bytes = base64.b64decode(file_data)
    if len(file_bytes) > max_size:
        mb = max_size // (1024 * 1024)
        raise ValueError(f'Файл слишком большой (максимум {mb} МБ)')
    ext = allowed_types[content_type]
    filename = f"{folder}/{uuid.uuid4().hex}.{ext}"
    s3 = get_s3()
    s3.put_object(Bucket='files', Key=filename, Body=file_bytes, ContentType=content_type)
    return cdn_url(filename)


# ─── formatting ─────────────────────────────────────────────────────────────

HOUSE_LIST_FIELDS = """
    h.id, h.name, h.emblem_url, h.short_desc, h.server,
    h.owner_id, u.username, h.rating_points,
    COUNT(m.id) AS member_count, h.created_at,
    h.telegram_url, h.discord_url, h.vk_url, h.youtube_url, h.rutube_url, h.twitch_url,
    h.telegram_visible, h.discord_visible, h.vk_visible, h.youtube_visible, h.rutube_visible, h.twitch_visible
"""


def fmt_house(row):
    house = {
        'id': row[0],
        'name': row[1],
        'emblem_url': row[2],
        'short_desc': row[3],
        'server': row[4],
        'owner_id': row[5],
        'owner': row[6],
        'rating_points': row[7],
        'member_count': int(row[8]),
        'created_at': str(row[9]),
    }
    if len(row) > 10:
        house['socials'] = {
            'telegram': {'url': row[10] or '', 'visible': row[16]},
            'discord': {'url': row[11] or '', 'visible': row[17]},
            'vk': {'url': row[12] or '', 'visible': row[18]},
            'youtube': {'url': row[13] or '', 'visible': row[19]},
            'rutube': {'url': row[14] or '', 'visible': row[20]},
            'twitch': {'url': row[15] or '', 'visible': row[21]},
        }
    return house


def fetch_trophies(conn, house_ids):
    """Возвращает { house_id: [{type, label, count}] } для списка домов."""
    if not house_ids:
        return {}
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT house_id, trophy_type, COUNT(*) FROM {SCHEMA}.house_trophies
            WHERE house_id = ANY(%s)
            GROUP BY house_id, trophy_type
            """,
            (list(house_ids),)
        )
        result: dict = {}
        for house_id, trophy_type, count in cur.fetchall():
            result.setdefault(house_id, []).append({
                'type': trophy_type,
                'label': TROPHY_TYPES.get(trophy_type, trophy_type),
                'count': int(count),
            })
        return result


# ─── rating update ───────────────────────────────────────────────────────────

def refresh_rating_points(conn, house_id=None):
    """Пересчитывает rating_points:
    - герб +10, краткое описание +10, полное описание (от 20 символов) +10, фото +10
    - видео +5, аудио +5, ссылка на соцсеть (любая) +10
    - каждый участник дома +5
    - трофей «Главная столица» +50, «Второстепенная столица» +30 (за каждый выданный трофей)."""
    where = "WHERE h.id = %s" if house_id else ""
    params = (house_id,) if house_id else ()
    with conn.cursor() as cur:
        cur.execute(
            f"""
            UPDATE {SCHEMA}.houses h SET rating_points = (
                (CASE WHEN h.emblem_url <> '' THEN 10 ELSE 0 END) +
                (CASE WHEN h.short_desc <> '' THEN 10 ELSE 0 END) +
                (CASE WHEN length(h.description) > 20 THEN 10 ELSE 0 END) +
                (CASE WHEN EXISTS(SELECT 1 FROM {SCHEMA}.house_photos p WHERE p.house_id = h.id) THEN 10 ELSE 0 END) +
                (CASE WHEN EXISTS(SELECT 1 FROM {SCHEMA}.house_videos v WHERE v.house_id = h.id) THEN 5 ELSE 0 END) +
                (CASE WHEN EXISTS(SELECT 1 FROM {SCHEMA}.house_audio a WHERE a.house_id = h.id) THEN 5 ELSE 0 END) +
                (CASE WHEN (h.telegram_url <> '' OR h.discord_url <> '' OR h.vk_url <> ''
                           OR h.youtube_url <> '' OR h.rutube_url <> '' OR h.twitch_url <> '')
                      THEN 10 ELSE 0 END)
            ) + (SELECT COUNT(*) FROM {SCHEMA}.users m WHERE m.house_id = h.id) * 5
              + (SELECT COALESCE(SUM(CASE t.trophy_type WHEN 'capital' THEN {TROPHY_POINTS['capital']} WHEN 'secondary_capital' THEN {TROPHY_POINTS['secondary_capital']} ELSE 0 END), 0)
                 FROM {SCHEMA}.house_trophies t WHERE t.house_id = h.id)
            {where}
            """,
            params
        )


# ─── GET handlers ────────────────────────────────────────────────────────────

SORT_OPTIONS = {
    'points': 'h.rating_points DESC, h.created_at ASC',
    'members': 'member_count DESC, h.rating_points DESC',
    'date_new': 'h.created_at DESC',
    'date_old': 'h.created_at ASC',
}


def handle_list(conn, params):
    """GET / — список домов. sort: points (по умолчанию), members, date_new, date_old."""
    sort = params.get('sort', 'points')
    order_sql = SORT_OPTIONS.get(sort, SORT_OPTIONS['points'])

    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT {HOUSE_LIST_FIELDS}
            FROM {SCHEMA}.houses h
            JOIN {SCHEMA}.users u ON u.id = h.owner_id
            LEFT JOIN {SCHEMA}.users m ON m.house_id = h.id
            GROUP BY h.id, u.username
            ORDER BY {order_sql}
            """
        )
        rows = cur.fetchall()

    houses = [fmt_house(r) for r in rows]
    trophies = fetch_trophies(conn, [h['id'] for h in houses])
    for h in houses:
        h['trophies'] = trophies.get(h['id'], [])

    conn.close()
    return ok({'houses': houses})


def handle_house_detail(house_id, conn):
    """GET /?action=house&id=N — детали дома + галерея + участники с ролями + трофеи."""
    with conn.cursor() as cur:
        # Основная информация о доме
        cur.execute(
            f"""
            SELECT h.id, h.name, h.emblem_url, h.short_desc, h.server,
                   h.owner_id, u.username, h.rating_points,
                   COUNT(m.id) AS member_count, h.created_at
            FROM {SCHEMA}.houses h
            JOIN {SCHEMA}.users u ON u.id = h.owner_id
            LEFT JOIN {SCHEMA}.users m ON m.house_id = h.id
            WHERE h.id = %s
            GROUP BY h.id, u.username
            """,
            (house_id,)
        )
        house_row = cur.fetchone()
        if not house_row:
            conn.close()
            return err('Дом не найден', 404)

        house = fmt_house(house_row)

        # Дополнительные поля
        cur.execute(
            f"""
            SELECT description,
                   telegram_url, discord_url, vk_url, youtube_url, rutube_url, twitch_url,
                   telegram_visible, discord_visible, vk_visible, youtube_visible, rutube_visible, twitch_visible
            FROM {SCHEMA}.houses WHERE id = %s
            """,
            (house_id,)
        )
        extra = cur.fetchone()
        house['description'] = extra[0] if extra else None
        house['socials'] = {
            'telegram': {'url': extra[1] or '', 'visible': extra[7]},
            'discord': {'url': extra[2] or '', 'visible': extra[8]},
            'vk': {'url': extra[3] or '', 'visible': extra[9]},
            'youtube': {'url': extra[4] or '', 'visible': extra[10]},
            'rutube': {'url': extra[5] or '', 'visible': extra[11]},
            'twitch': {'url': extra[6] or '', 'visible': extra[12]},
        } if extra else {}

        # Видео (до 10 штук)
        cur.execute(
            f"SELECT id, video_url, title FROM {SCHEMA}.house_videos WHERE house_id = %s ORDER BY id ASC",
            (house_id,)
        )
        house['videos'] = [{'id': r[0], 'video_url': r[1], 'title': r[2]} for r in cur.fetchall()]

        # Фото галерея
        cur.execute(
            f"SELECT id, photo_url FROM {SCHEMA}.house_photos WHERE house_id = %s ORDER BY id ASC",
            (house_id,)
        )
        house['photos'] = [{'id': r[0], 'photo_url': r[1]} for r in cur.fetchall()]

        # Участники (с ролями)
        cur.execute(
            f"""
            SELECT id, username, avatar_url, house_name, house_role
            FROM {SCHEMA}.users
            WHERE house_id = %s
            ORDER BY username ASC
            """,
            (house_id,)
        )
        house['members'] = [
            {
                'id': r[0], 'username': r[1], 'avatar_url': r[2], 'house_name': r[3] or '',
                'house_role': r[4] or '', 'house_role_label': HOUSE_ROLES.get(r[4] or '', ''),
            }
            for r in cur.fetchall()
        ]

        # Аудио
        cur.execute(
            f"SELECT id, audio_url, title FROM {SCHEMA}.house_audio WHERE house_id = %s ORDER BY id ASC",
            (house_id,)
        )
        house['audio'] = [{'id': r[0], 'audio_url': r[1], 'title': r[2]} for r in cur.fetchall()]

        # Трофеи
        house['trophies'] = fetch_trophies(conn, [house_id]).get(house_id, [])

    conn.close()
    return ok({'house': house})


# ─── POST handlers ───────────────────────────────────────────────────────────

def handle_create_house(body, user, conn):
    """POST action=create_house — создать дом."""
    name = (body.get('name') or '').strip()
    short_desc = (body.get('short_desc') or '').strip()
    server = (body.get('server') or '').strip()

    if not name:
        conn.close()
        return err('Название дома обязательно')
    if not server:
        conn.close()
        return err('Сервер обязателен')

    # Проверить что пользователь ещё не создавал дом
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT COUNT(*) FROM {SCHEMA}.houses WHERE owner_id = %s",
            (user['id'],)
        )
        if cur.fetchone()[0] > 0:
            conn.close()
            return err('Вы уже создали дом')

    # Загрузка герба
    emblem_url = None
    if body.get('emblem_file'):
        try:
            emblem_url = upload_file(
                body['emblem_file'],
                body.get('emblem_content_type', 'image/jpeg'),
                'house-emblems',
                ALLOWED_IMAGE_TYPES,
                MAX_IMAGE_SIZE,
            )
        except ValueError as e:
            conn.close()
            return err(str(e))

    with conn.cursor() as cur:
        cur.execute(
            f"""
            INSERT INTO {SCHEMA}.houses (name, short_desc, server, owner_id, emblem_url)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
            """,
            (name, short_desc, server, user['id'], emblem_url)
        )
        house_id = cur.fetchone()[0]

        # Автоматически вступить в дом с ролью главы
        cur.execute(
            f"UPDATE {SCHEMA}.users SET house_id = %s, house_name = %s, house_role = %s WHERE id = %s",
            (house_id, name, 'owner', user['id'])
        )
        conn.commit()

    refresh_rating_points(conn, house_id)
    conn.commit()

    conn.close()
    return ok({'ok': True, 'house_id': house_id})


def handle_update_house(body, user, conn):
    """POST action=update_house — обновить дом (owner или admin)."""
    house_id = body.get('house_id')
    if not house_id:
        conn.close()
        return err('house_id обязателен')

    try:
        house_id = int(house_id)
    except (TypeError, ValueError):
        conn.close()
        return err('Некорректный house_id')

    # Проверить права
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT owner_id FROM {SCHEMA}.houses WHERE id = %s",
            (house_id,)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return err('Дом не найден', 404)
        if row[0] != user['id'] and not user['is_admin']:
            conn.close()
            return err('Нет прав для редактирования', 403)

    # Обновить описание
    if 'description' in body:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {SCHEMA}.houses SET description = %s WHERE id = %s",
                (body['description'], house_id)
            )

    # Обновить шапку (название, краткое описание, сервер)
    if 'name' in body:
        name = (body['name'] or '').strip()
        if not name:
            conn.close()
            return err('Название дома обязательно')
        with conn.cursor() as cur:
            cur.execute(f"UPDATE {SCHEMA}.houses SET name = %s WHERE id = %s", (name, house_id))
            cur.execute(f"UPDATE {SCHEMA}.users SET house_name = %s WHERE house_id = %s", (name, house_id))

    if 'short_desc' in body:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {SCHEMA}.houses SET short_desc = %s WHERE id = %s",
                ((body['short_desc'] or '').strip(), house_id)
            )

    if 'server' in body:
        server = (body['server'] or '').strip()
        if not server:
            conn.close()
            return err('Сервер обязателен')
        with conn.cursor() as cur:
            cur.execute(f"UPDATE {SCHEMA}.houses SET server = %s WHERE id = %s", (server, house_id))

    # Загрузка герба
    if body.get('emblem_file'):
        try:
            emblem_url = upload_file(
                body['emblem_file'],
                body.get('emblem_content_type', 'image/jpeg'),
                'house-emblems',
                ALLOWED_IMAGE_TYPES,
                MAX_IMAGE_SIZE,
            )
            with conn.cursor() as cur:
                cur.execute(f"UPDATE {SCHEMA}.houses SET emblem_url = %s WHERE id = %s", (emblem_url, house_id))
        except ValueError as e:
            conn.close()
            return err(str(e))

    # Соцсети (ссылки и видимость)
    for social in SOCIAL_FIELDS:
        url_key = f'{social}_url'
        if url_key in body:
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE {SCHEMA}.houses SET {url_key} = %s WHERE id = %s",
                    ((body[url_key] or '').strip(), house_id)
                )
        visible_key = f'{social}_visible'
        if visible_key in body:
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE {SCHEMA}.houses SET {visible_key} = %s WHERE id = %s",
                    (bool(body[visible_key]), house_id)
                )

    # Загрузка фото
    if body.get('photo_file'):
        try:
            photo_url = upload_file(
                body['photo_file'],
                body.get('photo_content_type', 'image/jpeg'),
                'house-photos',
                ALLOWED_IMAGE_TYPES,
                MAX_IMAGE_SIZE,
            )
            with conn.cursor() as cur:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.house_photos (house_id, photo_url) VALUES (%s, %s)",
                    (house_id, photo_url)
                )
        except ValueError as e:
            conn.close()
            return err(str(e))

    refresh_rating_points(conn, house_id)
    conn.commit()

    # Вернуть обновлённый дом
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT h.id, h.name, h.emblem_url, h.short_desc, h.server,
                   h.owner_id, u.username, h.rating_points,
                   COUNT(m.id) AS member_count, h.created_at
            FROM {SCHEMA}.houses h
            JOIN {SCHEMA}.users u ON u.id = h.owner_id
            LEFT JOIN {SCHEMA}.users m ON m.house_id = h.id
            WHERE h.id = %s
            GROUP BY h.id, u.username
            """,
            (house_id,)
        )
        row = cur.fetchone()

    conn.close()
    return ok({'ok': True, 'house': fmt_house(row) if row else None})


def handle_join_house(body, user, conn):
    """POST action=join_house — вступить в дом (роль по умолчанию — рыцарь)."""
    house_id = body.get('house_id')
    if not house_id:
        conn.close()
        return err('house_id обязателен')

    try:
        house_id = int(house_id)
    except (TypeError, ValueError):
        conn.close()
        return err('Некорректный house_id')

    with conn.cursor() as cur:
        cur.execute(
            f"SELECT name FROM {SCHEMA}.houses WHERE id = %s",
            (house_id,)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return err('Дом не найден', 404)
        house_name = row[0]

        cur.execute(
            f"UPDATE {SCHEMA}.users SET house_id = %s, house_name = %s, house_role = %s WHERE id = %s",
            (house_id, house_name, 'knight', user['id'])
        )

    refresh_rating_points(conn, house_id)
    conn.commit()

    conn.close()
    return ok({'ok': True, 'house_id': house_id, 'house_name': house_name})


def handle_leave_house(user, conn):
    """POST action=leave_house — покинуть дом."""
    house_id = user['house_id']
    with conn.cursor() as cur:
        cur.execute(
            f"UPDATE {SCHEMA}.users SET house_id = NULL, house_name = '', house_role = '' WHERE id = %s",
            (user['id'],)
        )
    if house_id:
        refresh_rating_points(conn, house_id)
    conn.commit()
    conn.close()
    return ok({'ok': True})


def handle_transfer_ownership(body, user, conn):
    """POST action=transfer_ownership — передать права главы дома другому участнику (owner или admin)."""
    house_id = body.get('house_id')
    new_owner_id = body.get('new_owner_id')
    if not house_id or not new_owner_id:
        conn.close()
        return err('house_id и new_owner_id обязательны')

    try:
        house_id = int(house_id)
        new_owner_id = int(new_owner_id)
    except (TypeError, ValueError):
        conn.close()
        return err('Некорректные значения')

    with conn.cursor() as cur:
        cur.execute(f"SELECT owner_id FROM {SCHEMA}.houses WHERE id = %s", (house_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return err('Дом не найден', 404)
        owner_id = row[0]
        if owner_id != user['id'] and not user['is_admin']:
            conn.close()
            return err('Нет прав для передачи главенства', 403)
        if new_owner_id == owner_id:
            conn.close()
            return err('Этот пользователь уже глава дома')

        cur.execute(
            f"SELECT id FROM {SCHEMA}.users WHERE id = %s AND house_id = %s",
            (new_owner_id, house_id)
        )
        if not cur.fetchone():
            conn.close()
            return err('Пользователь должен быть участником дома')

        cur.execute(
            f"UPDATE {SCHEMA}.houses SET owner_id = %s WHERE id = %s",
            (new_owner_id, house_id)
        )
        cur.execute(
            f"UPDATE {SCHEMA}.users SET house_role = %s WHERE id = %s",
            ('owner', new_owner_id)
        )
        cur.execute(
            f"UPDATE {SCHEMA}.users SET house_role = %s WHERE id = %s AND house_id = %s",
            ('knight', owner_id, house_id)
        )

    conn.commit()
    conn.close()
    return ok({'ok': True})


def handle_kick_member(body, user, conn):
    """POST action=kick_member — исключить участника из дома (owner или admin)."""
    house_id = body.get('house_id')
    member_id = body.get('member_id')
    if not house_id or not member_id:
        conn.close()
        return err('house_id и member_id обязательны')

    try:
        house_id = int(house_id)
        member_id = int(member_id)
    except (TypeError, ValueError):
        conn.close()
        return err('Некорректные значения')

    with conn.cursor() as cur:
        cur.execute(f"SELECT owner_id FROM {SCHEMA}.houses WHERE id = %s", (house_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return err('Дом не найден', 404)
        owner_id = row[0]
        if owner_id != user['id'] and not user['is_admin']:
            conn.close()
            return err('Нет прав для исключения участников', 403)
        if member_id == owner_id:
            conn.close()
            return err('Нельзя исключить основателя дома')

        cur.execute(
            f"UPDATE {SCHEMA}.users SET house_id = NULL, house_name = '', house_role = '' WHERE id = %s AND house_id = %s",
            (member_id, house_id)
        )

    refresh_rating_points(conn, house_id)
    conn.commit()
    conn.close()
    return ok({'ok': True})


def handle_delete_house(body, user, conn):
    """POST action=delete_house — удалить дом (owner или admin)."""
    house_id = body.get('house_id')
    if not house_id:
        conn.close()
        return err('house_id обязателен')

    try:
        house_id = int(house_id)
    except (TypeError, ValueError):
        conn.close()
        return err('Некорректный house_id')

    with conn.cursor() as cur:
        cur.execute(f"SELECT owner_id FROM {SCHEMA}.houses WHERE id = %s", (house_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return err('Дом не найден', 404)
        if row[0] != user['id'] and not user['is_admin']:
            conn.close()
            return err('Нет прав для удаления дома', 403)

        cur.execute(
            f"UPDATE {SCHEMA}.users SET house_id = NULL, house_name = '', house_role = '' WHERE house_id = %s",
            (house_id,)
        )
        cur.execute(f"DELETE FROM {SCHEMA}.house_trophies WHERE house_id = %s", (house_id,))
        cur.execute(f"DELETE FROM {SCHEMA}.house_audio WHERE house_id = %s", (house_id,))
        cur.execute(f"DELETE FROM {SCHEMA}.house_videos WHERE house_id = %s", (house_id,))
        cur.execute(f"DELETE FROM {SCHEMA}.house_photos WHERE house_id = %s", (house_id,))
        cur.execute(f"DELETE FROM {SCHEMA}.houses WHERE id = %s", (house_id,))

    conn.commit()
    conn.close()
    return ok({'ok': True})


def handle_upload_video(body, user, conn):
    """POST action=upload_video — загрузить видео дома, до 30 МБ, максимум 10 видео (owner или admin)."""
    house_id = body.get('house_id')
    if not house_id:
        conn.close()
        return err('house_id обязателен')
    if not body.get('video_file'):
        conn.close()
        return err('video_file обязателен')

    try:
        house_id = int(house_id)
    except (TypeError, ValueError):
        conn.close()
        return err('Некорректный house_id')

    with conn.cursor() as cur:
        cur.execute(f"SELECT owner_id FROM {SCHEMA}.houses WHERE id = %s", (house_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return err('Дом не найден', 404)
        if row[0] != user['id'] and not user['is_admin']:
            conn.close()
            return err('Нет прав для загрузки видео', 403)

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.house_videos WHERE house_id = %s", (house_id,))
        if cur.fetchone()[0] >= MAX_VIDEOS_PER_HOUSE:
            conn.close()
            return err(f'Достигнут лимит в {MAX_VIDEOS_PER_HOUSE} видео. Удалите старое видео, чтобы добавить новое.')

    try:
        video_url = upload_file(
            body['video_file'],
            body.get('video_content_type', 'video/mp4'),
            'house-videos',
            ALLOWED_VIDEO_TYPES,
            MAX_VIDEO_SIZE,
        )
    except ValueError as e:
        conn.close()
        return err(str(e))

    title = (body.get('title') or '').strip()[:150]

    with conn.cursor() as cur:
        cur.execute(
            f"INSERT INTO {SCHEMA}.house_videos (house_id, video_url, title) VALUES (%s, %s, %s) RETURNING id",
            (house_id, video_url, title)
        )
        video_id = cur.fetchone()[0]

    refresh_rating_points(conn, house_id)
    conn.commit()
    conn.close()
    return ok({'ok': True, 'video': {'id': video_id, 'video_url': video_url, 'title': title}})


def handle_delete_video(body, user, conn):
    """POST action=delete_video — удалить видео дома (owner или admin)."""
    video_id = body.get('video_id')
    if not video_id:
        conn.close()
        return err('video_id обязателен')

    try:
        video_id = int(video_id)
    except (TypeError, ValueError):
        conn.close()
        return err('Некорректный video_id')

    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT h.owner_id, h.id FROM {SCHEMA}.house_videos v
            JOIN {SCHEMA}.houses h ON h.id = v.house_id
            WHERE v.id = %s
            """,
            (video_id,)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return err('Видео не найдено', 404)
        if row[0] != user['id'] and not user['is_admin']:
            conn.close()
            return err('Нет прав для удаления видео', 403)
        house_id = row[1]

        cur.execute(f"DELETE FROM {SCHEMA}.house_videos WHERE id = %s", (video_id,))

    refresh_rating_points(conn, house_id)
    conn.commit()
    conn.close()
    return ok({'ok': True})


def handle_delete_photo(body, user, conn):
    """POST action=delete_photo — удалить фото дома (owner или admin)."""
    photo_id = body.get('photo_id')
    if not photo_id:
        conn.close()
        return err('photo_id обязателен')

    try:
        photo_id = int(photo_id)
    except (TypeError, ValueError):
        conn.close()
        return err('Некорректный photo_id')

    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT h.owner_id, h.id FROM {SCHEMA}.house_photos p
            JOIN {SCHEMA}.houses h ON h.id = p.house_id
            WHERE p.id = %s
            """,
            (photo_id,)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return err('Фото не найдено', 404)
        if row[0] != user['id'] and not user['is_admin']:
            conn.close()
            return err('Нет прав для удаления фото', 403)
        house_id = row[1]

        cur.execute(f"DELETE FROM {SCHEMA}.house_photos WHERE id = %s", (photo_id,))

    refresh_rating_points(conn, house_id)
    conn.commit()
    conn.close()
    return ok({'ok': True})


def handle_upload_audio(body, user, conn):
    """POST action=upload_audio — загрузить аудио дома, до 25 МБ (owner или admin)."""
    house_id = body.get('house_id')
    if not house_id:
        conn.close()
        return err('house_id обязателен')
    if not body.get('audio_file'):
        conn.close()
        return err('audio_file обязателен')

    try:
        house_id = int(house_id)
    except (TypeError, ValueError):
        conn.close()
        return err('Некорректный house_id')

    with conn.cursor() as cur:
        cur.execute(f"SELECT owner_id FROM {SCHEMA}.houses WHERE id = %s", (house_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return err('Дом не найден', 404)
        if row[0] != user['id'] and not user['is_admin']:
            conn.close()
            return err('Нет прав для загрузки аудио', 403)

    try:
        audio_url = upload_file(
            body['audio_file'],
            body.get('audio_content_type', 'audio/mpeg'),
            'house-audio',
            ALLOWED_AUDIO_TYPES,
            MAX_AUDIO_SIZE,
        )
    except ValueError as e:
        conn.close()
        return err(str(e))

    title = (body.get('title') or '').strip()[:150]

    with conn.cursor() as cur:
        cur.execute(
            f"INSERT INTO {SCHEMA}.house_audio (house_id, audio_url, title) VALUES (%s, %s, %s) RETURNING id",
            (house_id, audio_url, title)
        )
        audio_id = cur.fetchone()[0]

    refresh_rating_points(conn, house_id)
    conn.commit()
    conn.close()
    return ok({'ok': True, 'audio': {'id': audio_id, 'audio_url': audio_url, 'title': title}})


def handle_delete_audio(body, user, conn):
    """POST action=delete_audio — удалить аудио дома (owner или admin)."""
    audio_id = body.get('audio_id')
    if not audio_id:
        conn.close()
        return err('audio_id обязателен')

    try:
        audio_id = int(audio_id)
    except (TypeError, ValueError):
        conn.close()
        return err('Некорректный audio_id')

    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT h.owner_id, h.id FROM {SCHEMA}.house_audio a
            JOIN {SCHEMA}.houses h ON h.id = a.house_id
            WHERE a.id = %s
            """,
            (audio_id,)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return err('Аудио не найдено', 404)
        if row[0] != user['id'] and not user['is_admin']:
            conn.close()
            return err('Нет прав для удаления аудио', 403)
        house_id = row[1]

        cur.execute(f"DELETE FROM {SCHEMA}.house_audio WHERE id = %s", (audio_id,))

    refresh_rating_points(conn, house_id)
    conn.commit()
    conn.close()
    return ok({'ok': True})


def handle_award_points(body, user, conn):
    """POST action=award_points — начислить баллы активности (только из других функций)."""
    target_user_id = body.get('user_id')
    action_type = body.get('action_type', '').strip()
    points = body.get('points')
    ref_id = body.get('ref_id')

    if not target_user_id:
        conn.close()
        return err('user_id обязателен')
    if not action_type:
        conn.close()
        return err('action_type обязателен')
    if points is None:
        conn.close()
        return err('points обязательны')

    try:
        target_user_id = int(target_user_id)
        points = int(points)
    except (TypeError, ValueError):
        conn.close()
        return err('Некорректные значения user_id или points')

    if user['id'] == target_user_id:
        conn.close()
        return err('Нельзя начислять баллы самому себе', 403)

    with conn.cursor() as cur:
        cur.execute(
            f"""
            INSERT INTO {SCHEMA}.activity_points (user_id, action_type, points, ref_id)
            VALUES (%s, %s, %s, %s)
            """,
            (target_user_id, action_type, points, ref_id)
        )
        conn.commit()

    conn.close()
    return ok({'ok': True, 'user_id': target_user_id, 'points': points})


def handle_set_member_role(body, user, conn):
    """POST action=set_member_role — назначить роль участнику дома (owner или admin).
    Роли: diplomat, marshal, lord, knight (owner присваивается автоматически главе дома)."""
    house_id = body.get('house_id')
    member_id = body.get('member_id')
    role = (body.get('role') or '').strip()

    if not house_id or not member_id:
        conn.close()
        return err('house_id и member_id обязательны')
    if role not in ('diplomat', 'marshal', 'lord', 'knight'):
        conn.close()
        return err('Некорректная роль')

    try:
        house_id = int(house_id)
        member_id = int(member_id)
    except (TypeError, ValueError):
        conn.close()
        return err('Некорректные значения')

    with conn.cursor() as cur:
        cur.execute(f"SELECT owner_id FROM {SCHEMA}.houses WHERE id = %s", (house_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return err('Дом не найден', 404)
        owner_id = row[0]
        if owner_id != user['id'] and not user['is_admin']:
            conn.close()
            return err('Нет прав для назначения ролей', 403)
        if member_id == owner_id:
            conn.close()
            return err('Глава дома всегда имеет роль владельца')

        cur.execute(
            f"SELECT id FROM {SCHEMA}.users WHERE id = %s AND house_id = %s",
            (member_id, house_id)
        )
        if not cur.fetchone():
            conn.close()
            return err('Пользователь должен быть участником дома')

        cur.execute(
            f"UPDATE {SCHEMA}.users SET house_role = %s WHERE id = %s",
            (role, member_id)
        )

    conn.commit()
    conn.close()
    return ok({'ok': True, 'member_id': member_id, 'role': role, 'role_label': HOUSE_ROLES.get(role, '')})


def handle_award_trophy(body, user, conn):
    """POST action=award_trophy — выдать дому трофей (только admin)."""
    if not user['is_admin']:
        conn.close()
        return err('Только администратор может выдавать трофеи', 403)

    house_id = body.get('house_id')
    trophy_type = (body.get('trophy_type') or '').strip()

    if not house_id:
        conn.close()
        return err('house_id обязателен')
    if trophy_type not in TROPHY_TYPES:
        conn.close()
        return err('Некорректный тип трофея')

    try:
        house_id = int(house_id)
    except (TypeError, ValueError):
        conn.close()
        return err('Некорректный house_id')

    with conn.cursor() as cur:
        cur.execute(f"SELECT id FROM {SCHEMA}.houses WHERE id = %s", (house_id,))
        if not cur.fetchone():
            conn.close()
            return err('Дом не найден', 404)

        cur.execute(
            f"INSERT INTO {SCHEMA}.house_trophies (house_id, trophy_type, awarded_by) VALUES (%s, %s, %s)",
            (house_id, trophy_type, user['id'])
        )

    refresh_rating_points(conn, house_id)
    conn.commit()
    trophies = fetch_trophies(conn, [house_id]).get(house_id, [])
    conn.close()
    return ok({'ok': True, 'trophies': trophies})


def handle_revoke_trophy(body, user, conn):
    """POST action=revoke_trophy — забрать один трофей у дома (только admin)."""
    if not user['is_admin']:
        conn.close()
        return err('Только администратор может управлять трофеями', 403)

    house_id = body.get('house_id')
    trophy_type = (body.get('trophy_type') or '').strip()

    if not house_id:
        conn.close()
        return err('house_id обязателен')
    if trophy_type not in TROPHY_TYPES:
        conn.close()
        return err('Некорректный тип трофея')

    try:
        house_id = int(house_id)
    except (TypeError, ValueError):
        conn.close()
        return err('Некорректный house_id')

    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT id FROM {SCHEMA}.house_trophies
            WHERE house_id = %s AND trophy_type = %s
            ORDER BY created_at DESC LIMIT 1
            """,
            (house_id, trophy_type)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return err('У дома нет такого трофея')
        cur.execute(f"DELETE FROM {SCHEMA}.house_trophies WHERE id = %s", (row[0],))

    refresh_rating_points(conn, house_id)
    conn.commit()
    trophies = fetch_trophies(conn, [house_id]).get(house_id, [])
    conn.close()
    return ok({'ok': True, 'trophies': trophies})


def handle_list_all_for_admin(conn):
    """Возвращает краткий список всех домов с трофеями — для панели администратора."""
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT h.id, h.name, h.emblem_url, h.server
            FROM {SCHEMA}.houses h
            ORDER BY h.name ASC
            """
        )
        rows = cur.fetchall()
    houses = [{'id': r[0], 'name': r[1], 'emblem_url': r[2], 'server': r[3]} for r in rows]
    trophies = fetch_trophies(conn, [h['id'] for h in houses])
    for h in houses:
        h['trophies'] = trophies.get(h['id'], [])
    conn.close()
    return ok({'houses': houses})


# ─── main handler ────────────────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    session_id = (event.get('headers') or {}).get('X-Session-Id', '').strip()
    params = event.get('queryStringParameters') or {}

    conn = get_conn()

    # ── GET ──────────────────────────────────────────────────────────────────
    if method == 'GET':
        action = params.get('action', '')

        if action == 'house':
            house_id_raw = params.get('id')
            if not house_id_raw:
                conn.close()
                return err('id обязателен')
            try:
                house_id = int(house_id_raw)
            except (TypeError, ValueError):
                conn.close()
                return err('Некорректный id')
            return handle_house_detail(house_id, conn)

        if action == 'admin_list':
            user = get_user(session_id, conn)
            if not user or not user['is_admin']:
                conn.close()
                return err('Нет прав', 403)
            return handle_list_all_for_admin(conn)

        # Список домов (по умолчанию)
        return handle_list(conn, params)

    # ── POST ─────────────────────────────────────────────────────────────────
    if method == 'POST':
        try:
            body = json.loads(event.get('body') or '{}')
        except (json.JSONDecodeError, TypeError):
            conn.close()
            return err('Некорректный JSON')

        action = body.get('action', '').strip()

        user = get_user(session_id, conn)
        if not user:
            conn.close()
            return err('Не авторизован', 401)

        if action == 'create_house':
            return handle_create_house(body, user, conn)

        if action == 'update_house':
            return handle_update_house(body, user, conn)

        if action == 'join_house':
            return handle_join_house(body, user, conn)

        if action == 'leave_house':
            return handle_leave_house(user, conn)

        if action == 'kick_member':
            return handle_kick_member(body, user, conn)

        if action == 'transfer_ownership':
            return handle_transfer_ownership(body, user, conn)

        if action == 'delete_house':
            return handle_delete_house(body, user, conn)

        if action == 'upload_video':
            return handle_upload_video(body, user, conn)

        if action == 'delete_video':
            return handle_delete_video(body, user, conn)

        if action == 'delete_photo':
            return handle_delete_photo(body, user, conn)

        if action == 'upload_audio':
            return handle_upload_audio(body, user, conn)

        if action == 'delete_audio':
            return handle_delete_audio(body, user, conn)

        if action == 'award_points':
            return handle_award_points(body, user, conn)

        if action == 'set_member_role':
            return handle_set_member_role(body, user, conn)

        if action == 'award_trophy':
            return handle_award_trophy(body, user, conn)

        if action == 'revoke_trophy':
            return handle_revoke_trophy(body, user, conn)

        conn.close()
        return err('Неизвестное действие')

    conn.close()
    return err('Метод не поддерживается', 405)