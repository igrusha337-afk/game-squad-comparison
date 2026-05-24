"""
Единый CRUD для справочников: roles, traits, abilities, formations.
GET  /?type=roles|traits|abilities|formations  — список (публично)
POST / action=create|update|delete             — изменения (только админ)
"""
import json
import os
import psycopg2
import psycopg2.errors

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id, X-User-Id, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}
VALID_COLORS = ('green', 'gray', 'red')


def resp(data, status=200):
    return {
        'statusCode': status,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, ensure_ascii=False, default=str),
    }


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_admin_user(event):
    headers = event.get('headers') or {}
    session_id = (
        headers.get('x-session-id') or
        headers.get('X-Session-Id') or
        headers.get('X-Session-ID', '')
    )
    if not session_id:
        return None
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT u.id, u.is_admin FROM {SCHEMA}.sessions s "
                f"JOIN {SCHEMA}.users u ON u.id = s.user_id "
                f"WHERE s.id = %s AND s.expires_at > now()",
                (session_id,)
            )
            row = cur.fetchone()
    finally:
        conn.close()
    if not row or not row[1]:
        return None
    return {'id': row[0], 'is_admin': row[1]}


def row_to_role(r):
    return {'id': r[0], 'name': r[1], 'description': r[2]}


def row_to_trait(r):
    return {'id': r[0], 'name': r[1], 'description': r[2], 'color': r[3], 'adminComment': r[4] or ''}


def row_to_ability(r):
    return {
        'id': r[0], 'name': r[1], 'description': r[4] or '',
        'statModifiers': r[2] if r[2] else {},
        'statModifiersEx': r[3] if r[3] else {},
        'adminComment': r[5] or '',
    }


def row_to_formation(r):
    return {'id': r[0], 'name': r[1], 'description': r[2], 'avatar_url': r[3]}


def handle_roles(method, body, is_admin):
    if method == 'GET':
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(f"SELECT id, name, description FROM {SCHEMA}.unit_roles ORDER BY id")
                rows = cur.fetchall()
        finally:
            conn.close()
        return resp([row_to_role(r) for r in rows])

    action = body.get('action', '')
    name = (body.get('name') or '').strip()
    description = (body.get('description') or '').strip()

    if action == 'create':
        if not name:
            return resp({'error': 'Укажите название роли'}, 400)
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.unit_roles (name, description) VALUES (%s, %s) RETURNING id, name, description",
                    (name, description)
                )
                row = cur.fetchone()
            conn.commit()
        finally:
            conn.close()
        return resp(row_to_role(row), 201)

    if action == 'update':
        rid = body.get('id')
        if not rid or not name:
            return resp({'error': 'Укажите id и название'}, 400)
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE {SCHEMA}.unit_roles SET name=%s, description=%s WHERE id=%s RETURNING id, name, description",
                    (name, description, rid)
                )
                row = cur.fetchone()
            conn.commit()
        finally:
            conn.close()
        if not row:
            return resp({'error': 'Роль не найдена'}, 404)
        return resp(row_to_role(row))

    if action == 'delete':
        rid = body.get('id')
        if not rid:
            return resp({'error': 'Укажите id'}, 400)
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(f"DELETE FROM {SCHEMA}.unit_roles WHERE id=%s RETURNING id", (rid,))
                row = cur.fetchone()
            conn.commit()
        finally:
            conn.close()
        if not row:
            return resp({'error': 'Роль не найдена'}, 404)
        return resp({'ok': True})

    return resp({'error': 'Неизвестный action'}, 400)


def handle_traits(method, body, is_admin):
    if method == 'GET':
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(f"SELECT id, name, description, color, admin_comment FROM {SCHEMA}.traits ORDER BY name")
                rows = cur.fetchall()
        finally:
            conn.close()
        return resp([row_to_trait(r) for r in rows])

    action = body.get('action', '')
    name = (body.get('name') or '').strip()
    description = (body.get('description') or '').strip()
    admin_comment = (body.get('adminComment') or '').strip()
    color = body.get('color', 'gray')
    if color not in VALID_COLORS:
        color = 'gray'

    if action == 'create':
        if not name:
            return resp({'error': 'Укажите название особенности'}, 400)
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.traits (name, description, color, admin_comment) "
                    f"VALUES (%s, %s, %s, %s) RETURNING id, name, description, color, admin_comment",
                    (name, description, color, admin_comment)
                )
                row = cur.fetchone()
            conn.commit()
        finally:
            conn.close()
        return resp(row_to_trait(row), 201)

    if action == 'update':
        tid = body.get('id')
        if not tid or not name:
            return resp({'error': 'Укажите id и название'}, 400)
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE {SCHEMA}.traits SET name=%s, description=%s, color=%s, admin_comment=%s "
                    f"WHERE id=%s RETURNING id, name, description, color, admin_comment",
                    (name, description, color, admin_comment, tid)
                )
                row = cur.fetchone()
            conn.commit()
        finally:
            conn.close()
        if not row:
            return resp({'error': 'Особенность не найдена'}, 404)
        return resp(row_to_trait(row))

    if action == 'delete':
        tid = body.get('id')
        if not tid:
            return resp({'error': 'Укажите id'}, 400)
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(f"DELETE FROM {SCHEMA}.traits WHERE id=%s RETURNING id", (tid,))
                row = cur.fetchone()
            conn.commit()
        finally:
            conn.close()
        if not row:
            return resp({'error': 'Особенность не найдена'}, 404)
        return resp({'ok': True})

    return resp({'error': 'Неизвестный action'}, 400)


def handle_abilities(method, body, is_admin):
    if method == 'GET':
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT id, name, stat_modifiers, stat_modifiers_ex, description, admin_comment "
                    f"FROM {SCHEMA}.abilities ORDER BY name"
                )
                rows = cur.fetchall()
        finally:
            conn.close()
        abilities = [row_to_ability(r) for r in rows]
        if not is_admin:
            for a in abilities:
                a.pop('adminComment', None)
        return resp(abilities)

    action = body.get('action', '')
    name = (body.get('name') or '').strip()
    description = (body.get('description') or '').strip()
    admin_comment = (body.get('adminComment') or '').strip()
    stat_modifiers = body.get('statModifiers') or {}
    stat_modifiers_ex = body.get('statModifiersEx') or {}

    if action == 'create':
        if not name:
            return resp({'error': 'Укажите название умения'}, 400)
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.abilities (name, description, stat_modifiers, stat_modifiers_ex, admin_comment) "
                    f"VALUES (%s, %s, %s, %s, %s) RETURNING id, name, stat_modifiers, stat_modifiers_ex, description, admin_comment",
                    (name, description, json.dumps(stat_modifiers), json.dumps(stat_modifiers_ex), admin_comment)
                )
                row = cur.fetchone()
            conn.commit()
        finally:
            conn.close()
        return resp(row_to_ability(row), 201)

    if action == 'update':
        aid = body.get('id')
        if not aid or not name:
            return resp({'error': 'Укажите id и название'}, 400)
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE {SCHEMA}.abilities SET name=%s, description=%s, stat_modifiers=%s, stat_modifiers_ex=%s, admin_comment=%s "
                    f"WHERE id=%s RETURNING id, name, stat_modifiers, stat_modifiers_ex, description, admin_comment",
                    (name, description, json.dumps(stat_modifiers), json.dumps(stat_modifiers_ex), admin_comment, aid)
                )
                row = cur.fetchone()
            conn.commit()
        finally:
            conn.close()
        if not row:
            return resp({'error': 'Умение не найдено'}, 404)
        return resp(row_to_ability(row))

    if action == 'delete':
        aid = body.get('id')
        if not aid:
            return resp({'error': 'Укажите id'}, 400)
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(f"DELETE FROM {SCHEMA}.abilities WHERE id=%s RETURNING id", (aid,))
                row = cur.fetchone()
            conn.commit()
        finally:
            conn.close()
        if not row:
            return resp({'error': 'Умение не найдено'}, 404)
        return resp({'ok': True})

    return resp({'error': 'Неизвестный action'}, 400)


def handle_formations(method, body, is_admin):
    if method == 'GET':
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(f"SELECT id, name, description, avatar_url FROM {SCHEMA}.formations ORDER BY id")
                rows = cur.fetchall()
        finally:
            conn.close()
        return resp([row_to_formation(r) for r in rows])

    action = body.get('action', '')
    name = (body.get('name') or '').strip()
    description = (body.get('description') or '').strip()
    avatar_url = (body.get('avatar_url') or '').strip()

    if action == 'create':
        if not name:
            return resp({'error': 'Укажите название построения'}, 400)
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.formations (name, description, avatar_url) "
                    f"VALUES (%s, %s, %s) RETURNING id, name, description, avatar_url",
                    (name, description, avatar_url)
                )
                row = cur.fetchone()
            conn.commit()
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
            return resp({'error': 'Построение с таким названием уже существует'}, 409)
        finally:
            conn.close()
        return resp(row_to_formation(row), 201)

    if action == 'update':
        fid = body.get('id')
        if not fid or not name:
            return resp({'error': 'Укажите id и название'}, 400)
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE {SCHEMA}.formations SET name=%s, description=%s, avatar_url=%s "
                    f"WHERE id=%s RETURNING id, name, description, avatar_url",
                    (name, description, avatar_url, fid)
                )
                row = cur.fetchone()
            conn.commit()
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
            return resp({'error': 'Построение с таким названием уже существует'}, 409)
        finally:
            conn.close()
        if not row:
            return resp({'error': 'Построение не найдено'}, 404)
        return resp(row_to_formation(row))

    if action == 'delete':
        fid = body.get('id')
        if not fid:
            return resp({'error': 'Укажите id'}, 400)
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(f"DELETE FROM {SCHEMA}.formations WHERE id=%s RETURNING id", (fid,))
                row = cur.fetchone()
            conn.commit()
        finally:
            conn.close()
        if not row:
            return resp({'error': 'Построение не найдено'}, 404)
        return resp({'ok': True})

    return resp({'error': 'Неизвестный action'}, 400)


HANDLERS = {
    'roles': handle_roles,
    'traits': handle_traits,
    'abilities': handle_abilities,
    'formations': handle_formations,
}


def handler(event: dict, context) -> dict:
    """Единый справочник: roles, traits, abilities, formations. Передай type= в query или body."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}') if method == 'POST' else {}

    ref_type = params.get('type') or body.get('type', '')
    if ref_type not in HANDLERS:
        return resp({'error': 'Укажите type: roles, traits, abilities или formations'}, 400)

    admin = get_admin_user(event)
    if method == 'POST' and not admin:
        return resp({'error': 'Нет доступа'}, 403)

    return HANDLERS[ref_type](method, body, is_admin=bool(admin))
