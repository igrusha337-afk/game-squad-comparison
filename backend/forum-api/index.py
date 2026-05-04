"""
Форум: темы и посты.
GET  / — список тем
GET  /?action=topic&id=N — тема + посты
POST / action=create_topic — создать тему (авторизован), поддерживает cover_file
POST / action=create_post  — ответить в теме (авторизован)
POST / action=edit_topic   — редактировать тему (свою или админ)
POST / action=edit_post    — редактировать пост (свой или админ)
POST / action=pin_topic    — закрепить тему (только админ)
POST / action=lock_topic   — закрыть тему (только админ)
"""
import json
import os
import base64
import uuid
import psycopg2
import boto3
from datetime import timezone

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
    'Access-Control-Max-Age': '86400',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def award_and_refresh(conn, user_id, action_type, points, ref_id=None):
    """Начислить баллы пользователю и пересчитать рейтинг домов."""
    with conn.cursor() as cur:
        cur.execute(
            f"INSERT INTO {SCHEMA}.activity_points (user_id, action_type, points, ref_id) VALUES (%s, %s, %s, %s)",
            (user_id, action_type, points, ref_id)
        )
        # Пересчёт рейтинга для дома этого пользователя
        cur.execute(
            f"""UPDATE {SCHEMA}.houses SET rating_points = (
                SELECT COALESCE(SUM(ap.points), 0) FROM {SCHEMA}.activity_points ap
                JOIN {SCHEMA}.users u ON u.id = ap.user_id WHERE u.house_id = houses.id
            )"""
        )


def resp(data, status=200):
    return {
        'statusCode': status,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, ensure_ascii=False, default=str),
    }


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


ALLOWED_TYPES = {'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif'}


def upload_cover(file_data, content_type):
    if content_type not in ALLOWED_TYPES:
        raise ValueError('Неподдерживаемый тип файла')
    if ',' in file_data:
        file_data = file_data.split(',', 1)[1]
    file_bytes = base64.b64decode(file_data)
    if len(file_bytes) > 5 * 1024 * 1024:
        raise ValueError('Файл слишком большой (максимум 5 МБ)')
    ext = ALLOWED_TYPES[content_type]
    filename = f"forum-covers/{uuid.uuid4().hex}.{ext}"
    s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
                      aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                      aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
    s3.put_object(Bucket='files', Key=filename, Body=file_bytes, ContentType=content_type)
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{filename}"


def fmt_topic(row):
    return {
        'id': row[0], 'title': row[1], 'content': row[2],
        'author_id': row[3], 'author': row[4],
        'views': row[5], 'is_pinned': row[6], 'is_locked': row[7],
        'created_at': str(row[8]), 'updated_at': str(row[9]),
        'post_count': row[10], 'author_avatar': row[11] if len(row) > 11 else '',
        'likes': int(row[12]) if len(row) > 12 and row[12] is not None else 0,
        'dislikes': int(row[13]) if len(row) > 13 and row[13] is not None else 0,
        'user_vote': row[14] if len(row) > 14 else None,
        'author_house_name': row[15] if len(row) > 15 else '',
    }


def fmt_post(row):
    return {
        'id': row[0], 'topic_id': row[1], 'content': row[2],
        'author_id': row[3], 'author': row[4],
        'is_hidden': row[5], 'created_at': str(row[6]), 'updated_at': str(row[7]),
        'author_avatar': row[8] if len(row) > 8 else '',
        'author_house_name': row[9] if len(row) > 9 else '',
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
        body = json.loads(event['body'])

    action = qs.get('action') or body.get('action', '')

    conn = get_conn()
    user = get_user(session_id, conn)

    # ── GET: список тем ──────────────────────────────────────────────
    if method == 'GET' and not action:
        user_id = user['id'] if user else None
        with conn.cursor() as cur:
            if user_id:
                cur.execute(
                    f"""SELECT t.id, t.title, t.content, t.author_id, u.username,
                           t.views, t.is_pinned, t.is_locked, t.created_at, t.updated_at,
                           COUNT(DISTINCT p.id) as post_count, u.avatar_url,
                           COALESCE(SUM(CASE WHEN v.vote=1 THEN 1 ELSE 0 END),0) as likes,
                           COALESCE(SUM(CASE WHEN v.vote=-1 THEN 1 ELSE 0 END),0) as dislikes,
                           MAX(CASE WHEN v.user_id=%s THEN v.vote ELSE NULL END) as user_vote,
                           u.house_name
                        FROM {SCHEMA}.forum_topics t
                        JOIN {SCHEMA}.users u ON u.id = t.author_id
                        LEFT JOIN {SCHEMA}.forum_posts p ON p.topic_id = t.id AND p.is_hidden = false
                        LEFT JOIN {SCHEMA}.forum_topic_votes v ON v.topic_id = t.id
                        GROUP BY t.id, u.username, u.avatar_url, u.house_name
                        ORDER BY t.is_pinned DESC, t.updated_at DESC""",
                    (user_id,)
                )
            else:
                cur.execute(
                    f"""SELECT t.id, t.title, t.content, t.author_id, u.username,
                           t.views, t.is_pinned, t.is_locked, t.created_at, t.updated_at,
                           COUNT(DISTINCT p.id) as post_count, u.avatar_url,
                           COALESCE(SUM(CASE WHEN v.vote=1 THEN 1 ELSE 0 END),0) as likes,
                           COALESCE(SUM(CASE WHEN v.vote=-1 THEN 1 ELSE 0 END),0) as dislikes,
                           NULL as user_vote, u.house_name
                        FROM {SCHEMA}.forum_topics t
                        JOIN {SCHEMA}.users u ON u.id = t.author_id
                        LEFT JOIN {SCHEMA}.forum_posts p ON p.topic_id = t.id AND p.is_hidden = false
                        LEFT JOIN {SCHEMA}.forum_topic_votes v ON v.topic_id = t.id
                        GROUP BY t.id, u.username, u.avatar_url, u.house_name
                        ORDER BY t.is_pinned DESC, t.updated_at DESC"""
                )
            rows = cur.fetchall()
        conn.close()
        return resp({'topics': [fmt_topic(r) for r in rows]})

    # ── GET: одна тема + посты ───────────────────────────────────────
    if method == 'GET' and action == 'topic':
        topic_id = int(qs.get('id', 0))
        with conn.cursor() as cur:
            # +1 к просмотрам
            cur.execute(f"UPDATE {SCHEMA}.forum_topics SET views = views + 1 WHERE id = %s", (topic_id,))
            cur.execute(
                f"""SELECT t.id, t.title, t.content, t.author_id, u.username,
                       t.views, t.is_pinned, t.is_locked, t.created_at, t.updated_at,
                       0 as post_count, u.avatar_url,
                       0 as likes, 0 as dislikes, NULL as user_vote, u.house_name
                    FROM {SCHEMA}.forum_topics t
                    JOIN {SCHEMA}.users u ON u.id = t.author_id
                    WHERE t.id = %s""", (topic_id,)
            )
            topic_row = cur.fetchone()
            if not topic_row:
                conn.close()
                return resp({'error': 'Тема не найдена'}, 404)
            cur.execute(
                f"""SELECT p.id, p.topic_id, p.content, p.author_id, u.username,
                       p.is_hidden, p.created_at, p.updated_at, u.avatar_url, u.house_name
                    FROM {SCHEMA}.forum_posts p
                    JOIN {SCHEMA}.users u ON u.id = p.author_id
                    WHERE p.topic_id = %s AND p.is_hidden = false
                    ORDER BY p.created_at ASC""", (topic_id,)
            )
            posts = cur.fetchall()
            conn.commit()
        conn.close()
        return resp({'topic': fmt_topic(topic_row), 'posts': [fmt_post(p) for p in posts]})

    # Для записи нужна авторизация
    if not user:
        conn.close()
        return resp({'error': 'Необходима авторизация'}, 401)

    # ── POST: создать тему ───────────────────────────────────────────
    if action == 'create_topic':
        title = body.get('title', '').strip()
        content = body.get('content', '').strip()
        if not title:
            conn.close()
            return resp({'error': 'Укажите заголовок темы'}, 400)
        if not content:
            conn.close()
            return resp({'error': 'Напишите содержимое темы'}, 400)
        cover_url = ''
        if body.get('cover_file'):
            try:
                cover_url = upload_cover(body['cover_file'], body.get('cover_content_type', 'image/jpeg'))
            except ValueError as e:
                conn.close()
                return resp({'error': str(e)}, 400)
        with conn.cursor() as cur:
            cur.execute(
                f"INSERT INTO {SCHEMA}.forum_topics (title, content, author_id, cover_url) VALUES (%s, %s, %s, %s) RETURNING id",
                (title, content, user['id'], cover_url)
            )
            topic_id = cur.fetchone()[0]
        award_and_refresh(conn, user['id'], 'create_topic', 10, topic_id)
        conn.commit()
        conn.close()
        return resp({'message': 'Тема создана', 'topic_id': topic_id})

    # ── GET: уведомления текущего пользователя ──────────────────────
    if method == 'GET' and action == 'notifications':
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT id, message, link_topic_id, is_read, created_at "
                f"FROM {SCHEMA}.notifications WHERE user_id = %s ORDER BY created_at DESC LIMIT 30",
                (user['id'],)
            )
            rows = cur.fetchall()
        conn.close()
        return resp({'notifications': [
            {'id': r[0], 'message': r[1], 'link_topic_id': r[2], 'is_read': r[3], 'created_at': str(r[4])}
            for r in rows
        ]})

    # ── POST: прочитать уведомления ──────────────────────────────────
    if action == 'read_notifications':
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {SCHEMA}.notifications SET is_read = true WHERE user_id = %s",
                (user['id'],)
            )
            conn.commit()
        conn.close()
        return resp({'message': 'ok'})

    # ── POST: ответить в теме ────────────────────────────────────────
    if action == 'create_post':
        topic_id = int(body.get('topic_id', 0))
        content = body.get('content', '').strip()
        if not content:
            conn.close()
            return resp({'error': 'Напишите текст ответа'}, 400)
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT t.is_locked, t.title, t.author_id FROM {SCHEMA}.forum_topics t WHERE t.id = %s",
                (topic_id,)
            )
            row = cur.fetchone()
            if not row:
                conn.close()
                return resp({'error': 'Тема не найдена'}, 404)
            is_locked, topic_title, topic_author_id = row
            if is_locked and not user['is_admin']:
                conn.close()
                return resp({'error': 'Тема закрыта для ответов'}, 403)
            cur.execute(
                f"INSERT INTO {SCHEMA}.forum_posts (topic_id, content, author_id) VALUES (%s, %s, %s) RETURNING id",
                (topic_id, content, user['id'])
            )
            post_id = cur.fetchone()[0]
            cur.execute(f"UPDATE {SCHEMA}.forum_topics SET updated_at = now() WHERE id = %s", (topic_id,))
            # Уведомление автору темы (если ответил не он сам)
            if topic_author_id != user['id']:
                msg = f"{user['username']} ответил в теме «{topic_title[:60]}»"
                cur.execute(
                    f"INSERT INTO {SCHEMA}.notifications (user_id, message, link_topic_id) VALUES (%s, %s, %s)",
                    (topic_author_id, msg, topic_id)
                )
            conn.commit()
        award_and_refresh(conn, user['id'], 'create_post', 5, post_id)
        conn.commit()
        conn.close()
        return resp({'message': 'Ответ добавлен', 'post_id': post_id})

    # ── POST: редактировать тему ─────────────────────────────────────
    if action == 'edit_topic':
        topic_id = int(body.get('topic_id', 0))
        title = body.get('title', '').strip()
        content = body.get('content', '').strip()
        with conn.cursor() as cur:
            cur.execute(f"SELECT author_id FROM {SCHEMA}.forum_topics WHERE id = %s", (topic_id,))
            row = cur.fetchone()
            if not row:
                conn.close()
                return resp({'error': 'Тема не найдена'}, 404)
            if row[0] != user['id'] and not user['is_admin']:
                conn.close()
                return resp({'error': 'Нет прав'}, 403)
            cur.execute(
                f"UPDATE {SCHEMA}.forum_topics SET title=%s, content=%s, updated_at=now() WHERE id=%s",
                (title, content, topic_id)
            )
            conn.commit()
        conn.close()
        return resp({'message': 'Тема обновлена'})

    # ── POST: редактировать пост ─────────────────────────────────────
    if action == 'edit_post':
        post_id = int(body.get('post_id', 0))
        content = body.get('content', '').strip()
        with conn.cursor() as cur:
            cur.execute(f"SELECT author_id FROM {SCHEMA}.forum_posts WHERE id = %s", (post_id,))
            row = cur.fetchone()
            if not row:
                conn.close()
                return resp({'error': 'Пост не найден'}, 404)
            if row[0] != user['id'] and not user['is_admin']:
                conn.close()
                return resp({'error': 'Нет прав'}, 403)
            cur.execute(
                f"UPDATE {SCHEMA}.forum_posts SET content=%s, updated_at=now() WHERE id=%s",
                (content, post_id)
            )
            conn.commit()
        conn.close()
        return resp({'message': 'Пост обновлён'})

    # ── POST: закрепить/открепить (админ) ────────────────────────────
    if action == 'pin_topic':
        if not user['is_admin']:
            conn.close()
            return resp({'error': 'Нет прав'}, 403)
        topic_id = int(body.get('topic_id', 0))
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {SCHEMA}.forum_topics SET is_pinned = NOT is_pinned WHERE id = %s RETURNING is_pinned",
                (topic_id,)
            )
            row = cur.fetchone()
            conn.commit()
        conn.close()
        return resp({'message': 'Готово', 'is_pinned': row[0] if row else False})

    # ── POST: закрыть/открыть (админ) ────────────────────────────────
    if action == 'lock_topic':
        if not user['is_admin']:
            conn.close()
            return resp({'error': 'Нет прав'}, 403)
        topic_id = int(body.get('topic_id', 0))
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {SCHEMA}.forum_topics SET is_locked = NOT is_locked WHERE id = %s RETURNING is_locked",
                (topic_id,)
            )
            row = cur.fetchone()
            conn.commit()
        conn.close()
        return resp({'message': 'Готово', 'is_locked': row[0] if row else False})

    # ── POST: скрыть пост (админ) ─────────────────────────────────────
    if action == 'hide_post':
        if not user['is_admin']:
            conn.close()
            return resp({'error': 'Нет прав'}, 403)
        post_id = int(body.get('post_id', 0))
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {SCHEMA}.forum_posts SET is_hidden = NOT is_hidden WHERE id = %s RETURNING is_hidden",
                (post_id,)
            )
            row = cur.fetchone()
            conn.commit()
        conn.close()
        return resp({'message': 'Готово', 'is_hidden': row[0] if row else False})

    # ── POST: голосовать за тему ─────────────────────────────────────
    if action == 'vote_topic':
        topic_id = int(body.get('topic_id', 0))
        vote = body.get('vote')
        if vote not in (1, -1):
            conn.close()
            return resp({'error': 'vote должен быть 1 или -1'}, 400)
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT vote FROM {SCHEMA}.forum_topic_votes WHERE topic_id=%s AND user_id=%s",
                (topic_id, user['id'])
            )
            existing = cur.fetchone()
            # Получаем автора темы для начисления баллов
            cur.execute(f"SELECT author_id FROM {SCHEMA}.forum_topics WHERE id=%s", (topic_id,))
            topic_row = cur.fetchone()
            topic_author_id = topic_row[0] if topic_row else None

            if existing is None:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.forum_topic_votes (topic_id, user_id, vote) VALUES (%s, %s, %s)",
                    (topic_id, user['id'], vote)
                )
                # Лайк даёт 3 балла автору темы
                if vote == 1 and topic_author_id and topic_author_id != user['id']:
                    award_and_refresh(conn, topic_author_id, 'received_like_topic', 3, topic_id)
            elif existing[0] == vote:
                cur.execute(
                    f"UPDATE {SCHEMA}.forum_topic_votes SET vote=0 WHERE topic_id=%s AND user_id=%s",
                    (topic_id, user['id'])
                )
            else:
                cur.execute(
                    f"UPDATE {SCHEMA}.forum_topic_votes SET vote=%s WHERE topic_id=%s AND user_id=%s",
                    (vote, topic_id, user['id'])
                )
            conn.commit()
        conn.close()
        return resp({'message': 'ok'})

    # ── POST: удалить тему (админ) ────────────────────────────────────
    if action == 'delete_topic':
        if not user['is_admin']:
            conn.close()
            return resp({'error': 'Нет прав'}, 403)
        topic_id = int(body.get('topic_id', 0))
        with conn.cursor() as cur:
            cur.execute(f"DELETE FROM {SCHEMA}.forum_posts WHERE topic_id = %s", (topic_id,))
            cur.execute(f"DELETE FROM {SCHEMA}.forum_topics WHERE id = %s", (topic_id,))
            conn.commit()
        conn.close()
        return resp({'message': 'Тема удалена'})

    conn.close()
    return resp({'error': 'Неизвестное действие'}, 400)