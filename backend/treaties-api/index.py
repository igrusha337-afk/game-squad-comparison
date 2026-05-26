"""
CRUD для трактатов: получение списка, создание, обновление, удаление.
GET / — список. POST / с action=create/update/delete — изменения (только для админа).
"""
import json
import os
import re
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
    'Access-Control-Max-Age': '86400',
}

SELECT_COLS = "id, name, description, compatible_classes, rarity, stat_modifiers, created_at, is_active, avatar_url, stat_modifiers_ex, compatible_subtypes"


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


def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'\s+', '-', text)
    text = re.sub(r'[^\w\-]', '', text)
    return text[:100]


def row_to_treaty(row):
    return {
        'id': row[0], 'name': row[1], 'description': row[2] or '',
        'compatibleClasses': list(row[3]) if row[3] else [],
        'rarity': row[4],
        'statModifiers': row[5] if row[5] else {},
        'created_at': str(row[6]) if row[6] else '',
        'is_active': row[7],
        'avatar_url': row[8] or '' if len(row) > 8 else '',
        'statModifiersEx': row[9] if len(row) > 9 and row[9] else {},
        'compatibleSubtypes': list(row[10]) if len(row) > 10 and row[10] else [],
    }


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    body = {}
    if event.get('body'):
        body = json.loads(event['body'])

    session_id = (event.get('headers') or {}).get('X-Session-Id', '').strip()
    action = body.get('action', '')

    conn = get_conn()

    # GET — список всех активных трактатов
    if method == 'GET' or action == 'list':
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT {SELECT_COLS} FROM {SCHEMA}.treaties WHERE is_active = true ORDER BY name"
            )
            rows = cur.fetchall()
        conn.close()
        return json_response({'treaties': [row_to_treaty(r) for r in rows]})

    # Для изменений нужна авторизация + админ
    user = get_session_user(session_id, conn)
    if not user or not user['is_admin']:
        conn.close()
        return json_response({'error': 'Требуются права администратора'}, 403)

    # action=create
    if action == 'create':
        name = body.get('name', '').strip()
        if not name:
            conn.close()
            return json_response({'error': 'Поле "название" обязательно'}, 400)

        treaty_id = slugify(name)
        description = body.get('description', '')
        compatible_classes = body.get('compatibleClasses', [])
        compatible_subtypes = body.get('compatibleSubtypes', [])
        rarity = body.get('rarity', 'common')
        stat_modifiers = body.get('statModifiers', {})
        stat_modifiers_ex = body.get('statModifiersEx', {})
        avatar_url = body.get('avatar_url', '')

        with conn.cursor() as cur:
            cur.execute(f"SELECT id FROM {SCHEMA}.treaties WHERE id = %s", (treaty_id,))
            if cur.fetchone():
                treaty_id = treaty_id + '-' + os.urandom(3).hex()

            cur.execute(
                f"INSERT INTO {SCHEMA}.treaties (id, name, description, compatible_classes, compatible_subtypes, rarity, stat_modifiers, stat_modifiers_ex, avatar_url, created_by) "
                f"VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
                f"RETURNING {SELECT_COLS}",
                (treaty_id, name, description, compatible_classes, compatible_subtypes, rarity, json.dumps(stat_modifiers), json.dumps(stat_modifiers_ex), avatar_url, user['id'])
            )
            row = cur.fetchone()
            conn.commit()

        conn.close()
        return json_response({'message': 'Трактат успешно добавлен', 'treaty': row_to_treaty(row)})

    # action=update
    if action == 'update':
        treaty_id = body.get('id', '').strip()
        name = body.get('name', '').strip()
        if not treaty_id:
            conn.close()
            return json_response({'error': 'ID трактата обязателен'}, 400)
        if not name:
            conn.close()
            return json_response({'error': 'Поле "название" обязательно'}, 400)

        description = body.get('description', '')
        compatible_classes = body.get('compatibleClasses', [])
        compatible_subtypes = body.get('compatibleSubtypes', [])
        rarity = body.get('rarity', 'common')
        stat_modifiers = body.get('statModifiers', {})
        stat_modifiers_ex = body.get('statModifiersEx', {})
        avatar_url = body.get('avatar_url', '')

        with conn.cursor() as cur:
            cur.execute(f"SELECT id FROM {SCHEMA}.treaties WHERE id = %s", (treaty_id,))
            if not cur.fetchone():
                conn.close()
                return json_response({'error': 'Трактат не найден'}, 404)

            cur.execute(
                f"UPDATE {SCHEMA}.treaties SET name=%s, description=%s, compatible_classes=%s, compatible_subtypes=%s, rarity=%s, "
                f"stat_modifiers=%s, stat_modifiers_ex=%s, avatar_url=%s, updated_at=now() WHERE id=%s "
                f"RETURNING {SELECT_COLS}",
                (name, description, compatible_classes, compatible_subtypes, rarity, json.dumps(stat_modifiers), json.dumps(stat_modifiers_ex), avatar_url, treaty_id)
            )
            row = cur.fetchone()
            conn.commit()

        conn.close()
        return json_response({'message': 'Трактат успешно обновлён', 'treaty': row_to_treaty(row)})

    # action=delete
    if action == 'delete':
        treaty_id = body.get('id', '').strip()
        if not treaty_id:
            conn.close()
            return json_response({'error': 'ID трактата обязателен'}, 400)

        with conn.cursor() as cur:
            cur.execute(f"SELECT id FROM {SCHEMA}.treaties WHERE id = %s", (treaty_id,))
            if not cur.fetchone():
                conn.close()
                return json_response({'error': 'Трактат не найден'}, 404)
            cur.execute(f"UPDATE {SCHEMA}.treaties SET is_active = false WHERE id = %s", (treaty_id,))
            conn.commit()

        conn.close()
        return json_response({'message': 'Трактат успешно удалён'})

    conn.close()
    return json_response({'error': 'Неизвестное действие'}, 400)