"""
Houses API: управление домами CB.
GET  /                   — список домов, отсортированных по rating_points DESC
GET  /?action=house&id=N — детали дома (фото галерея + members)
POST action=create_house — создать дом
POST action=update_house — обновить дом (owner или admin)
POST action=join_house   — вступить в дом
POST action=leave_house  — покинуть дом
POST action=award_points — начислить баллы (только из других функций)
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
MAX_IMAGE_SIZE = 5 * 1024 * 1024    # 5 MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100 MB


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
    """Возвращает id, username, is_admin, house_id, house_name."""
    if not session_id:
        return None
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT u.id, u.username, u.is_admin, u.house_id, u.house_name "
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

def fmt_house(row):
    return {
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


# ─── rating update ───────────────────────────────────────────────────────────

def refresh_rating_points(conn):
    """Пересчитывает rating_points для всех домов на основе activity_points."""
    with conn.cursor() as cur:
        cur.execute(
            f"""
            UPDATE {SCHEMA}.houses SET rating_points = (
                SELECT COALESCE(SUM(ap.points), 0)
                FROM {SCHEMA}.activity_points ap
                JOIN {SCHEMA}.users u ON u.id = ap.user_id
                WHERE u.house_id = {SCHEMA}.houses.id
            )
            """
        )


# ─── GET handlers ────────────────────────────────────────────────────────────

def handle_list(conn):
    """GET / — список домов, отсортированных по rating_points DESC."""
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT h.id, h.name, h.emblem_url, h.short_desc, h.server,
                   h.owner_id, u.username, h.rating_points,
                   COUNT(m.id) AS member_count, h.created_at
            FROM {SCHEMA}.houses h
            JOIN {SCHEMA}.users u ON u.id = h.owner_id
            LEFT JOIN {SCHEMA}.users m ON m.house_id = h.id
            GROUP BY h.id, u.username
            ORDER BY h.rating_points DESC, h.created_at ASC
            """
        )
        rows = cur.fetchall()
    conn.close()
    return ok({'houses': [fmt_house(r) for r in rows]})


def handle_house_detail(house_id, conn):
    """GET /?action=house&id=N — детали дома + галерея + участники."""
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
            f"SELECT description, video_url FROM {SCHEMA}.houses WHERE id = %s",
            (house_id,)
        )
        extra = cur.fetchone()
        house['description'] = extra[0] if extra else None
        house['video_url'] = extra[1] if extra else None

        # Фото галерея
        cur.execute(
            f"SELECT id, photo_url FROM {SCHEMA}.house_photos WHERE house_id = %s ORDER BY id ASC",
            (house_id,)
        )
        house['photos'] = [{'id': r[0], 'photo_url': r[1]} for r in cur.fetchall()]

        # Участники
        cur.execute(
            f"""
            SELECT id, username, avatar_url, house_name
            FROM {SCHEMA}.users
            WHERE house_id = %s
            ORDER BY username ASC
            """,
            (house_id,)
        )
        house['members'] = [
            {'id': r[0], 'username': r[1], 'avatar_url': r[2], 'house_name': r[3] or ''}
            for r in cur.fetchall()
        ]

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

        # Автоматически вступить в дом
        cur.execute(
            f"UPDATE {SCHEMA}.users SET house_id = %s, house_name = %s WHERE id = %s",
            (house_id, name, user['id'])
        )
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

    # Загрузка видео
    if body.get('video_file'):
        try:
            video_url = upload_file(
                body['video_file'],
                body.get('video_content_type', 'video/mp4'),
                'house-videos',
                ALLOWED_VIDEO_TYPES,
                MAX_VIDEO_SIZE,
            )
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE {SCHEMA}.houses SET video_url = %s WHERE id = %s",
                    (video_url, house_id)
                )
        except ValueError as e:
            conn.close()
            return err(str(e))

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
    """POST action=join_house — вступить в дом."""
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
            f"UPDATE {SCHEMA}.users SET house_id = %s, house_name = %s WHERE id = %s",
            (house_id, house_name, user['id'])
        )

        # Начислить 5 баллов за вступление
        cur.execute(
            f"""
            INSERT INTO {SCHEMA}.activity_points (user_id, action_type, points)
            VALUES (%s, %s, %s)
            """,
            (user['id'], 'join_house', 5)
        )

        # Обновить рейтинг домов
        refresh_rating_points(conn)
        conn.commit()

    conn.close()
    return ok({'ok': True, 'house_id': house_id, 'house_name': house_name})


def handle_leave_house(user, conn):
    """POST action=leave_house — покинуть дом."""
    with conn.cursor() as cur:
        cur.execute(
            f"UPDATE {SCHEMA}.users SET house_id = NULL, house_name = '' WHERE id = %s",
            (user['id'],)
        )
        conn.commit()

    conn.close()
    return ok({'ok': True})


def handle_award_points(body, user, conn):
    """POST action=award_points — начислить баллы (только из других функций)."""
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

    # Авторизованный пользователь не может сам себе начислять баллы
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

        # Обновить рейтинг домов
        refresh_rating_points(conn)
        conn.commit()

    conn.close()
    return ok({'ok': True, 'user_id': target_user_id, 'points': points})


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

        # Список домов (по умолчанию)
        return handle_list(conn)

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

        if action == 'award_points':
            return handle_award_points(body, user, conn)

        conn.close()
        return err('Неизвестное действие')

    conn.close()
    return err('Метод не поддерживается', 405)
