"""
API для сборок трактатов на отряды.
GET /?id=UUID — публичная сборка по ID
GET /?action=my — список сборок текущего пользователя
POST / action=create — создать сборку (требует сессии)
POST / action=delete — удалить свою сборку
"""
import json
import os
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')
TREATY_LIMIT = 5

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
    'Access-Control-Max-Age': '86400',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def json_response(data, status=200):
    return {
        'statusCode': status,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, ensure_ascii=False, default=str),
    }


def get_session_user(session_id, conn):
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


def row_to_build(row):
    return {
        'id': str(row[0]),
        'unitId': row[1],
        'treatyIds': list(row[2]) if row[2] else [],
        'title': row[3] or '',
        'description': row[4] or '',
        'authorId': row[5],
        'authorUsername': row[6] or '',
        'isPublic': row[7],
        'views': row[8],
        'createdAt': str(row[9]) if row[9] else '',
    }


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    session_id = (event.get('headers') or {}).get('X-Session-Id', '').strip()

    body = {}
    if event.get('body'):
        body = json.loads(event['body'])

    conn = get_conn()

    # GET /?id=UUID — публичная сборка
    if method == 'GET' and params.get('id'):
        build_id = params['id'].strip()
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {SCHEMA}.unit_builds SET views = views + 1 WHERE id = %s AND is_public = true",
                (build_id,)
            )
            cur.execute(
                f"SELECT b.id, b.unit_id, b.treaty_ids, b.title, b.description, b.author_id, "
                f"u.username, b.is_public, b.views, b.created_at "
                f"FROM {SCHEMA}.unit_builds b LEFT JOIN {SCHEMA}.users u ON u.id = b.author_id "
                f"WHERE b.id = %s AND b.is_public = true",
                (build_id,)
            )
            row = cur.fetchone()
            conn.commit()
        conn.close()
        if not row:
            return json_response({'error': 'Сборка не найдена'}, 404)
        return json_response({'build': row_to_build(row)})

    # GET /?action=my — свои сборки
    if method == 'GET' and params.get('action') == 'my':
        user = get_session_user(session_id, conn)
        if not user:
            conn.close()
            return json_response({'error': 'Требуется авторизация'}, 401)
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT b.id, b.unit_id, b.treaty_ids, b.title, b.description, b.author_id, "
                f"u.username, b.is_public, b.views, b.created_at "
                f"FROM {SCHEMA}.unit_builds b LEFT JOIN {SCHEMA}.users u ON u.id = b.author_id "
                f"WHERE b.author_id = %s ORDER BY b.created_at DESC",
                (user['id'],)
            )
            rows = cur.fetchall()
        conn.close()
        return json_response({'builds': [row_to_build(r) for r in rows]})

    # POST action=create
    if method == 'POST' and body.get('action') == 'create':
        user = get_session_user(session_id, conn)
        if not user:
            conn.close()
            return json_response({'error': 'Требуется авторизация'}, 401)

        unit_id = (body.get('unitId') or '').strip()
        treaty_ids = body.get('treatyIds') or []
        title = (body.get('title') or '').strip()
        description = (body.get('description') or '').strip()

        if not unit_id:
            conn.close()
            return json_response({'error': 'unitId обязателен'}, 400)
        if not title:
            conn.close()
            return json_response({'error': 'Название сборки обязательно'}, 400)
        if len(treaty_ids) > TREATY_LIMIT:
            conn.close()
            return json_response({'error': f'Максимум {TREATY_LIMIT} трактатов'}, 400)

        with conn.cursor() as cur:
            cur.execute(
                f"INSERT INTO {SCHEMA}.unit_builds (unit_id, treaty_ids, title, description, author_id) "
                f"VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (unit_id, treaty_ids, title, description, user['id'])
            )
            build_id = str(cur.fetchone()[0])
            conn.commit()

        conn.close()
        return json_response({'message': 'Сборка сохранена', 'id': build_id})

    # POST action=delete
    if method == 'POST' and body.get('action') == 'delete':
        user = get_session_user(session_id, conn)
        if not user:
            conn.close()
            return json_response({'error': 'Требуется авторизация'}, 401)

        build_id = (body.get('id') or '').strip()
        if not build_id:
            conn.close()
            return json_response({'error': 'ID обязателен'}, 400)

        with conn.cursor() as cur:
            cur.execute(
                f"DELETE FROM {SCHEMA}.unit_builds WHERE id = %s AND author_id = %s",
                (build_id, user['id'])
            )
            deleted = cur.rowcount
            conn.commit()

        conn.close()
        if not deleted:
            return json_response({'error': 'Сборка не найдена или нет доступа'}, 404)
        return json_response({'message': 'Сборка удалена'})

    conn.close()
    return json_response({'error': 'Неизвестный запрос'}, 400)
