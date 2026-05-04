"""
Guides API: гайды сообщества.
GET  /                        — список гайдов (id, title, author, avatar, cover_url, likes, dislikes, user_vote, views, created_at)
GET  /?action=guide&id=N      — полный гайд + контент + голоса
POST action=create_guide      — создать гайд {title, content, cover_file?, cover_content_type?}
POST action=update_guide      — редактировать {guide_id, title, content} (автор или админ)
POST action=vote              — голосовать {guide_id, vote: 1 или -1} (повторный = отмена)
POST action=upload_file       — загрузить файл {file_data (base64), content_type, filename} → возвращает url
                                фото до 5мб, видео до 30мб
"""
import json
import os
import base64
import uuid
import psycopg2
import boto3

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
    'Access-Control-Max-Age': '86400',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def resp(data, status=200):
    return {
        'statusCode': status,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, ensure_ascii=False, default=str),
    }


def award_and_refresh(conn, user_id, action_type, points, ref_id=None):
    with conn.cursor() as cur:
        cur.execute(
            f"INSERT INTO {SCHEMA}.activity_points (user_id, action_type, points, ref_id) VALUES (%s, %s, %s, %s)",
            (user_id, action_type, points, ref_id)
        )
        cur.execute(
            f"""UPDATE {SCHEMA}.houses SET rating_points = (
                SELECT COALESCE(SUM(ap.points), 0) FROM {SCHEMA}.activity_points ap
                JOIN {SCHEMA}.users u ON u.id = ap.user_id WHERE u.house_id = houses.id
            )"""
        )


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
        return {'id': row[0], 'username': row[1], 'is_admin': row[2]} if row else None


def s3_client():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def cdn_url(filename):
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{filename}"


COVER_TYPES = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
}


def upload_cover(file_data, content_type):
    if content_type not in COVER_TYPES:
        raise ValueError('Неподдерживаемый тип файла для обложки')
    if ',' in file_data:
        file_data = file_data.split(',', 1)[1]
    file_bytes = base64.b64decode(file_data)
    if len(file_bytes) > 5 * 1024 * 1024:
        raise ValueError('Файл слишком большой (максимум 5 МБ)')
    ext = COVER_TYPES[content_type]
    filename = f"guide-covers/{uuid.uuid4().hex}.{ext}"
    s3 = s3_client()
    s3.put_object(Bucket='files', Key=filename, Body=file_bytes, ContentType=content_type)
    return cdn_url(filename)


def fmt_guide(row):
    return {
        'id': row[0],
        'title': row[1],
        'author_id': row[2],
        'author': row[3],
        'author_avatar': row[4],
        'guide_avatar_url': row[5],
        'views': row[6],
        'created_at': str(row[7]),
        'updated_at': str(row[8]),
        'likes': int(row[9]),
        'dislikes': int(row[10]),
        'user_vote': row[11],
    }


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    session_id = headers.get('X-Session-Id', '').strip()

    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except Exception:
            body = {}

    action = qs.get('action') or body.get('action', '')

    conn = get_conn()
    user = get_user(session_id, conn)

    # ── GET: список гайдов ───────────────────────────────────────────
    if method == 'GET' and not action:
        user_id = user['id'] if user else None
        with conn.cursor() as cur:
            if user_id is not None:
                cur.execute(
                    f"""SELECT g.id, g.title, g.author_id, u.username, u.avatar_url,
                               g.guide_avatar_url, g.views, g.created_at, g.updated_at,
                               COALESCE(SUM(CASE WHEN v.vote=1 THEN 1 ELSE 0 END),0) as likes,
                               COALESCE(SUM(CASE WHEN v.vote=-1 THEN 1 ELSE 0 END),0) as dislikes,
                               MAX(CASE WHEN v.user_id=%s THEN v.vote ELSE NULL END) as user_vote
                        FROM {SCHEMA}.guides g
                        JOIN {SCHEMA}.users u ON u.id = g.author_id
                        LEFT JOIN {SCHEMA}.guide_votes v ON v.guide_id = g.id
                        WHERE g.is_published = true
                        GROUP BY g.id, u.username, u.avatar_url
                        ORDER BY g.created_at DESC""",
                    (user_id,)
                )
            else:
                cur.execute(
                    f"""SELECT g.id, g.title, g.author_id, u.username, u.avatar_url,
                               g.guide_avatar_url, g.views, g.created_at, g.updated_at,
                               COALESCE(SUM(CASE WHEN v.vote=1 THEN 1 ELSE 0 END),0) as likes,
                               COALESCE(SUM(CASE WHEN v.vote=-1 THEN 1 ELSE 0 END),0) as dislikes,
                               NULL as user_vote
                        FROM {SCHEMA}.guides g
                        JOIN {SCHEMA}.users u ON u.id = g.author_id
                        LEFT JOIN {SCHEMA}.guide_votes v ON v.guide_id = g.id
                        WHERE g.is_published = true
                        GROUP BY g.id, u.username, u.avatar_url
                        ORDER BY g.created_at DESC"""
                )
            rows = cur.fetchall()
        conn.close()
        return resp({'guides': [fmt_guide(r) for r in rows]})

    # ── GET: один гайд ──────────────────────────────────────────────
    if method == 'GET' and action == 'guide':
        guide_id = int(qs.get('id', 0))
        user_id = user['id'] if user else None
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {SCHEMA}.guides SET views = views + 1 WHERE id = %s",
                (guide_id,)
            )
            if user_id is not None:
                cur.execute(
                    f"""SELECT g.id, g.title, g.author_id, u.username, u.avatar_url,
                               g.guide_avatar_url, g.views, g.created_at, g.updated_at,
                               COALESCE(SUM(CASE WHEN v.vote=1 THEN 1 ELSE 0 END),0) as likes,
                               COALESCE(SUM(CASE WHEN v.vote=-1 THEN 1 ELSE 0 END),0) as dislikes,
                               MAX(CASE WHEN v.user_id=%s THEN v.vote ELSE NULL END) as user_vote,
                               g.content
                        FROM {SCHEMA}.guides g
                        JOIN {SCHEMA}.users u ON u.id = g.author_id
                        LEFT JOIN {SCHEMA}.guide_votes v ON v.guide_id = g.id
                        WHERE g.id = %s
                        GROUP BY g.id, u.username, u.avatar_url, g.content""",
                    (user_id, guide_id)
                )
            else:
                cur.execute(
                    f"""SELECT g.id, g.title, g.author_id, u.username, u.avatar_url,
                               g.guide_avatar_url, g.views, g.created_at, g.updated_at,
                               COALESCE(SUM(CASE WHEN v.vote=1 THEN 1 ELSE 0 END),0) as likes,
                               COALESCE(SUM(CASE WHEN v.vote=-1 THEN 1 ELSE 0 END),0) as dislikes,
                               NULL as user_vote,
                               g.content
                        FROM {SCHEMA}.guides g
                        JOIN {SCHEMA}.users u ON u.id = g.author_id
                        LEFT JOIN {SCHEMA}.guide_votes v ON v.guide_id = g.id
                        WHERE g.id = %s
                        GROUP BY g.id, u.username, u.avatar_url, g.content""",
                    (guide_id,)
                )
            row = cur.fetchone()
            if not row:
                conn.commit()
                conn.close()
                return resp({'error': 'Гайд не найден'}, 404)
            conn.commit()
        conn.close()
        guide = fmt_guide(row)
        guide['content'] = row[12]
        guide['posts'] = []
        return resp({'guide': guide})

    # Для записи нужна авторизация
    if not user:
        conn.close()
        return resp({'error': 'Необходима авторизация'}, 401)

    # ── POST: создать гайд ───────────────────────────────────────────
    if action == 'create_guide':
        title = body.get('title', '').strip()
        content = body.get('content', '').strip()
        if not title:
            conn.close()
            return resp({'error': 'Укажите заголовок гайда'}, 400)
        if not content:
            conn.close()
            return resp({'error': 'Напишите содержимое гайда'}, 400)
        guide_avatar_url = ''
        if body.get('avatar_file'):
            try:
                guide_avatar_url = upload_cover(
                    body['avatar_file'],
                    body.get('avatar_content_type', 'image/jpeg')
                )
            except ValueError as e:
                conn.close()
                return resp({'error': str(e)}, 400)
        with conn.cursor() as cur:
            cur.execute(
                f"INSERT INTO {SCHEMA}.guides (title, content, author_id, guide_avatar_url) "
                f"VALUES (%s, %s, %s, %s) RETURNING id",
                (title, content, user['id'], guide_avatar_url)
            )
            guide_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return resp({'message': 'pending', 'guide_id': guide_id})

    # ── POST: редактировать гайд ─────────────────────────────────────
    if action == 'update_guide':
        guide_id = int(body.get('guide_id', 0))
        title = body.get('title', '').strip()
        content = body.get('content', '').strip()
        if not guide_id:
            conn.close()
            return resp({'error': 'Укажите guide_id'}, 400)
        if not title:
            conn.close()
            return resp({'error': 'Укажите заголовок'}, 400)
        if not content:
            conn.close()
            return resp({'error': 'Укажите содержимое'}, 400)
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT author_id FROM {SCHEMA}.guides WHERE id = %s",
                (guide_id,)
            )
            row = cur.fetchone()
            if not row:
                conn.close()
                return resp({'error': 'Гайд не найден'}, 404)
            if row[0] != user['id'] and not user['is_admin']:
                conn.close()
                return resp({'error': 'Нет доступа'}, 403)
            cur.execute(
                f"UPDATE {SCHEMA}.guides SET title = %s, content = %s, updated_at = now() "
                f"WHERE id = %s",
                (title, content, guide_id)
            )
            conn.commit()
        conn.close()
        return resp({'message': 'Гайд обновлён'})

    # ── POST: голосование ────────────────────────────────────────────
    if action == 'vote':
        guide_id = int(body.get('guide_id', 0))
        vote = body.get('vote')
        if not guide_id:
            conn.close()
            return resp({'error': 'Укажите guide_id'}, 400)
        if vote not in (1, -1):
            conn.close()
            return resp({'error': 'vote должен быть 1 или -1'}, 400)
        with conn.cursor() as cur:
            # Проверяем существование гайда и получаем автора
            cur.execute(
                f"SELECT id, author_id FROM {SCHEMA}.guides WHERE id = %s",
                (guide_id,)
            )
            guide_row = cur.fetchone()
            if not guide_row:
                conn.close()
                return resp({'error': 'Гайд не найден'}, 404)
            guide_author_id = guide_row[1]
            # Проверяем текущий голос
            cur.execute(
                f"SELECT vote FROM {SCHEMA}.guide_votes WHERE guide_id = %s AND user_id = %s",
                (guide_id, user['id'])
            )
            existing = cur.fetchone()
            if existing is None:
                # Нет голоса — добавляем
                cur.execute(
                    f"INSERT INTO {SCHEMA}.guide_votes (guide_id, user_id, vote) VALUES (%s, %s, %s)",
                    (guide_id, user['id'], vote)
                )
                result = 'voted'
                # Лайк даёт 5 баллов автору гайда
                if vote == 1 and guide_author_id != user['id']:
                    award_and_refresh(conn, guide_author_id, 'received_like_guide', 5, guide_id)
            elif existing[0] == vote:
                # Тот же голос — отменяем (обнуляем через UPDATE до 0 невозможно без изменения схемы,
                # поэтому помечаем vote=0 как признак отмены, либо просто удаляем логически через vote=0)
                # Поскольку DELETE запрещён — используем UPDATE с vote=0 как сигнал отмены
                cur.execute(
                    f"UPDATE {SCHEMA}.guide_votes SET vote = 0 WHERE guide_id = %s AND user_id = %s",
                    (guide_id, user['id'])
                )
                result = 'cancelled'
            else:
                # Другой голос — меняем
                cur.execute(
                    f"UPDATE {SCHEMA}.guide_votes SET vote = %s WHERE guide_id = %s AND user_id = %s",
                    (vote, guide_id, user['id'])
                )
                result = 'changed'
            conn.commit()
        conn.close()
        return resp({'message': result})

    # ── POST: загрузить файл (изображение или видео) ─────────────────
    if action == 'upload_file':
        file_data = body.get('file_data', '')
        content_type = body.get('content_type', '')
        filename_orig = body.get('filename', '')
        if not file_data:
            conn.close()
            return resp({'error': 'Нет данных файла'}, 400)
        if not content_type:
            conn.close()
            return resp({'error': 'Укажите content_type'}, 400)

        if ',' in file_data:
            file_data = file_data.split(',', 1)[1]
        try:
            file_bytes = base64.b64decode(file_data)
        except Exception:
            conn.close()
            return resp({'error': 'Ошибка декодирования файла'}, 400)

        if content_type.startswith('image/'):
            max_size = 5 * 1024 * 1024
            folder = 'guide-images'
            if content_type in COVER_TYPES:
                ext = COVER_TYPES[content_type]
            else:
                ext = content_type.split('/')[-1]
        elif content_type.startswith('video/'):
            max_size = 30 * 1024 * 1024
            folder = 'guide-videos'
            ext = content_type.split('/')[-1]
            # Нормализуем расширение
            if ext == 'quicktime':
                ext = 'mov'
        else:
            conn.close()
            return resp({'error': 'Поддерживаются только изображения и видео'}, 400)

        if len(file_bytes) > max_size:
            limit_mb = max_size // (1024 * 1024)
            conn.close()
            return resp({'error': f'Файл слишком большой (максимум {limit_mb} МБ)'}, 400)

        unique_name = f"{folder}/{uuid.uuid4().hex}.{ext}"
        try:
            s3 = s3_client()
            s3.put_object(Bucket='files', Key=unique_name, Body=file_bytes, ContentType=content_type)
        except Exception as e:
            conn.close()
            return resp({'error': f'Ошибка загрузки: {str(e)}'}, 500)

        conn.close()
        return resp({'url': cdn_url(unique_name)})

    # ── GET: гайды на проверке (админ) ───────────────────────────────
    if method == 'GET' and action == 'pending_guides':
        if not user or not user['is_admin']:
            conn.close()
            return resp({'error': 'Нет прав'}, 403)
        with conn.cursor() as cur:
            cur.execute(
                f"""SELECT g.id, g.title, g.author_id, u.username, u.avatar_url,
                           g.guide_avatar_url, g.views, g.created_at, g.updated_at,
                           0 as likes, 0 as dislikes, NULL as user_vote
                    FROM {SCHEMA}.guides g
                    JOIN {SCHEMA}.users u ON u.id = g.author_id
                    WHERE g.is_published = false
                    ORDER BY g.created_at ASC"""
            )
            rows = cur.fetchall()
        conn.close()
        return resp({'guides': [fmt_guide(r) for r in rows]})

    # ── POST: опубликовать / отклонить гайд (админ) ───────────────────
    if action == 'publish_guide':
        if not user['is_admin']:
            conn.close()
            return resp({'error': 'Нет прав'}, 403)
        guide_id = int(body.get('guide_id', 0))
        approve = bool(body.get('approve', True))
        with conn.cursor() as cur:
            if approve:
                cur.execute(f"UPDATE {SCHEMA}.guides SET is_published = true WHERE id = %s RETURNING author_id", (guide_id,))
                row = cur.fetchone()
                if row:
                    award_and_refresh(conn, row[0], 'create_guide', 15, guide_id)
            else:
                cur.execute(f"SELECT author_id, title FROM {SCHEMA}.guides WHERE id = %s", (guide_id,))
                row = cur.fetchone()
                if row:
                    with conn.cursor() as nc:
                        nc.execute(
                            f"INSERT INTO {SCHEMA}.notifications (user_id, message) VALUES (%s, %s)",
                            (row[0], f'Ваш гайд «{row[1][:60]}» был отклонён модератором')
                        )
                cur.execute(f"DELETE FROM {SCHEMA}.guide_votes WHERE guide_id = %s", (guide_id,))
                cur.execute(f"DELETE FROM {SCHEMA}.guides WHERE id = %s", (guide_id,))
            conn.commit()
        conn.close()
        return resp({'message': 'ok'})

    conn.close()
    return resp({'error': 'Неизвестное действие'}, 400)