"""
CRUD для отрядов: получение списка, создание, обновление, удаление.
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


def parse_jsonb(val):
    if val is None:
        return []
    if isinstance(val, (list, dict)):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return []
    return []


def row_to_unit(row):
    # id, name, class, role, rarity, description, lore, abilities, avatar_url, stats,
    # created_at, is_active, traits, stars, guide_upgrade, guide_gameplay, formations, subtype
    return {
        'id': row[0],
        'name': row[1],
        'class': row[2],
        'role': parse_jsonb(row[3]),
        'rarity': row[4],
        'description': row[5] or '',
        'lore': row[6] or '',
        'abilities': parse_jsonb(row[7]),
        'avatar_url': row[8] or '',
        'stats': row[9] if row[9] else {},
        'created_at': str(row[10]) if row[10] else '',
        'is_active': row[11],
        'traits': parse_jsonb(row[12]) if len(row) > 12 else [],
        'stars': float(row[13]) if len(row) > 13 and row[13] is not None else 0,
        'guide_upgrade': parse_jsonb(row[14]) if len(row) > 14 else [],
        'guide_gameplay': parse_jsonb(row[15]) if len(row) > 15 else [],
        'formations': parse_jsonb(row[16]) if len(row) > 16 else [],
        'subtype': row[17] or '' if len(row) > 17 else '',
    }


SELECT_COLS = "id, name, class, role, rarity, description, lore, abilities, avatar_url, stats, created_at, is_active, traits, stars, guide_upgrade, guide_gameplay, formations, subtype"


def normalize_role(role_raw):
    """Приводим role к списку строк."""
    if isinstance(role_raw, list):
        return role_raw
    if isinstance(role_raw, str):
        return [role_raw]
    return ['Урон']


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

    # GET — список всех активных отрядов
    if method == 'GET' or action == 'list':
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT {SELECT_COLS} FROM {SCHEMA}.units WHERE is_active = true ORDER BY name"
            )
            rows = cur.fetchall()
        conn.close()
        return json_response({'units': [row_to_unit(r) for r in rows]})

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

        unit_id = slugify(name)
        unit_class = body.get('class', 'Пехота')
        role = normalize_role(body.get('role', ['Урон']))
        rarity = body.get('rarity', 'common')
        description = body.get('description', '')
        lore = body.get('lore', '')
        abilities = body.get('abilities', [])
        traits = body.get('traits', [])
        avatar_url = body.get('avatar_url', '')
        stats = body.get('stats', {})
        stars = max(0, min(5, float(body.get('stars', 0))))
        guide_upgrade = body.get('guide_upgrade', [])
        guide_gameplay = body.get('guide_gameplay', [])
        formations = body.get('formations', [])
        subtype = body.get('subtype', '')

        with conn.cursor() as cur:
            cur.execute(f"SELECT id FROM {SCHEMA}.units WHERE id = %s", (unit_id,))
            if cur.fetchone():
                unit_id = unit_id + '-' + os.urandom(3).hex()

            cur.execute(
                f"INSERT INTO {SCHEMA}.units (id, name, class, role_old, role, rarity, description, lore, abilities, traits, avatar_url, stats, stars, guide_upgrade, guide_gameplay, formations, subtype, created_by) "
                f"VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
                f"RETURNING {SELECT_COLS}",
                (unit_id, name, unit_class, '', json.dumps(role, ensure_ascii=False), rarity, description, lore,
                 json.dumps(abilities, ensure_ascii=False), json.dumps(traits, ensure_ascii=False),
                 avatar_url, json.dumps(stats), stars,
                 json.dumps(guide_upgrade, ensure_ascii=False), json.dumps(guide_gameplay, ensure_ascii=False),
                 json.dumps(formations, ensure_ascii=False),
                 subtype, user['id'])
            )
            row = cur.fetchone()
            conn.commit()

        conn.close()
        return json_response({'message': 'Отряд успешно добавлен', 'unit': row_to_unit(row)})

    # action=update
    if action == 'update':
        unit_id = body.get('id', '').strip()
        name = body.get('name', '').strip()
        if not unit_id:
            conn.close()
            return json_response({'error': 'ID отряда обязателен'}, 400)
        if not name:
            conn.close()
            return json_response({'error': 'Поле "название" обязательно'}, 400)

        unit_class = body.get('class', 'Пехота')
        role = normalize_role(body.get('role', ['Урон']))
        rarity = body.get('rarity', 'common')
        description = body.get('description', '')
        lore = body.get('lore', '')
        abilities = body.get('abilities', [])
        traits = body.get('traits', [])
        avatar_url = body.get('avatar_url', '')
        stats = body.get('stats', {})
        stars = max(0, min(5, float(body.get('stars', 0))))
        guide_upgrade = body.get('guide_upgrade', [])
        guide_gameplay = body.get('guide_gameplay', [])
        formations = body.get('formations', [])
        subtype = body.get('subtype', '')

        with conn.cursor() as cur:
            cur.execute(f"SELECT id FROM {SCHEMA}.units WHERE id = %s", (unit_id,))
            if not cur.fetchone():
                conn.close()
                return json_response({'error': 'Отряд не найден'}, 404)

            cur.execute(
                f"UPDATE {SCHEMA}.units SET name=%s, class=%s, role=%s, rarity=%s, description=%s, lore=%s, "
                f"abilities=%s, traits=%s, avatar_url=%s, stats=%s, stars=%s, "
                f"guide_upgrade=%s, guide_gameplay=%s, formations=%s, subtype=%s, updated_at=now() WHERE id=%s "
                f"RETURNING {SELECT_COLS}",
                (name, unit_class, json.dumps(role, ensure_ascii=False), rarity, description, lore,
                 json.dumps(abilities, ensure_ascii=False), json.dumps(traits, ensure_ascii=False),
                 avatar_url, json.dumps(stats), stars,
                 json.dumps(guide_upgrade, ensure_ascii=False), json.dumps(guide_gameplay, ensure_ascii=False),
                 json.dumps(formations, ensure_ascii=False),
                 subtype, unit_id)
            )
            row = cur.fetchone()
            conn.commit()

        conn.close()
        return json_response({'message': 'Отряд успешно обновлён', 'unit': row_to_unit(row)})

    # action=delete
    if action == 'delete':
        unit_id = body.get('id', '').strip()
        if not unit_id:
            conn.close()
            return json_response({'error': 'ID отряда обязателен'}, 400)

        with conn.cursor() as cur:
            cur.execute(f"SELECT id FROM {SCHEMA}.units WHERE id = %s", (unit_id,))
            if not cur.fetchone():
                conn.close()
                return json_response({'error': 'Отряд не найден'}, 404)
            cur.execute(f"UPDATE {SCHEMA}.units SET is_active = false WHERE id = %s", (unit_id,))
            conn.commit()

        conn.close()
        return json_response({'message': 'Отряд успешно удалён'})

    conn.close()
    return json_response({'error': 'Неизвестное действие'}, 400)