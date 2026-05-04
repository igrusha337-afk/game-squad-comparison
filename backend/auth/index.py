"""
Auth endpoint: register, login, logout, me, forgot-password, reset-password, make-admin.
Action передаётся в поле body.action для POST, в query.action для GET.
"""
import json
import os
import hashlib
import hmac
import secrets
import re
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
    'Access-Control-Max-Age': '86400',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}:{h.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    parts = password_hash.split(':')
    if len(parts) != 2:
        return False
    salt, h = parts
    h2 = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return hmac.compare_digest(h, h2.hex())


def json_response(data, status=200):
    return {
        'statusCode': status,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, ensure_ascii=False),
    }


def get_session_user(session_id: str, conn):
    if not session_id:
        return None
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT u.id, u.username, u.email, u.is_admin, u.avatar_url, u.bio, u.cover_url FROM {SCHEMA}.sessions s "
            f"JOIN {SCHEMA}.users u ON u.id = s.user_id "
            f"WHERE s.id = %s AND s.expires_at > now()",
            (session_id,)
        )
        row = cur.fetchone()
        if row:
            return {'id': row[0], 'username': row[1], 'email': row[2], 'is_admin': row[3],
                    'avatar_url': row[4] or '', 'bio': row[5] or '', 'cover_url': row[6] or ''}
    return None


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    body = {}
    if event.get('body'):
        body = json.loads(event['body'])

    qs = event.get('queryStringParameters') or {}
    action = body.get('action') or qs.get('action', '')
    session_id = (event.get('headers') or {}).get('X-Session-Id', '').strip()

    conn = get_conn()

    # action=me — текущий пользователь
    if action == 'me' or not action:
        if not session_id:
            conn.close()
            return json_response({'error': 'Не авторизован'}, 401)
        user = get_session_user(session_id, conn)
        conn.close()
        if not user:
            return json_response({'error': 'Сессия истекла'}, 401)
        return json_response({'user': user})

    # action=register
    if action == 'register':
        username = body.get('username', '').strip()
        email = body.get('email', '').strip().lower()
        password = body.get('password', '')
        confirm = body.get('confirmPassword', '')

        if not username or not email or not password:
            conn.close()
            return json_response({'error': 'Все поля обязательны'}, 400)
        if len(username) < 3:
            conn.close()
            return json_response({'error': 'Имя пользователя должно содержать минимум 3 символа'}, 400)
        if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
            conn.close()
            return json_response({'error': 'Некорректный email'}, 400)
        if len(password) < 6:
            conn.close()
            return json_response({'error': 'Пароль должен содержать минимум 6 символов'}, 400)
        if password != confirm:
            conn.close()
            return json_response({'error': 'Пароли не совпадают'}, 400)

        with conn.cursor() as cur:
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = %s OR username = %s", (email, username))
            if cur.fetchone():
                conn.close()
                return json_response({'error': 'Email или имя пользователя уже занято'}, 409)

            pw_hash = hash_password(password)
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (username, email, password_hash) VALUES (%s, %s, %s) RETURNING id, username, email, is_admin",
                (username, email, pw_hash)
            )
            user_row = cur.fetchone()
            user_id = user_row[0]
            sess_id = secrets.token_urlsafe(64)
            cur.execute(f"INSERT INTO {SCHEMA}.sessions (id, user_id) VALUES (%s, %s)", (sess_id, user_id))
            conn.commit()

        conn.close()
        return json_response({
            'message': 'Регистрация прошла успешно',
            'user': {'id': user_row[0], 'username': user_row[1], 'email': user_row[2], 'is_admin': user_row[3]},
            'session_id': sess_id,
        })

    # action=login
    if action == 'login':
        email = body.get('email', '').strip().lower()
        password = body.get('password', '')

        if not email or not password:
            conn.close()
            return json_response({'error': 'Email и пароль обязательны'}, 400)

        with conn.cursor() as cur:
            cur.execute(
                f"SELECT id, username, email, password_hash, is_admin FROM {SCHEMA}.users WHERE email = %s",
                (email,)
            )
            row = cur.fetchone()
            if not row or not verify_password(password, row[3]):
                conn.close()
                return json_response({'error': 'Неверный email или пароль'}, 401)

            sess_id = secrets.token_urlsafe(64)
            cur.execute(f"INSERT INTO {SCHEMA}.sessions (id, user_id) VALUES (%s, %s)", (sess_id, row[0]))
            conn.commit()

        conn.close()
        return json_response({
            'message': 'Вход выполнен',
            'user': {'id': row[0], 'username': row[1], 'email': row[2], 'is_admin': row[4]},
            'session_id': sess_id,
        })

    # action=logout
    if action == 'logout':
        if session_id:
            with conn.cursor() as cur:
                cur.execute(f"DELETE FROM {SCHEMA}.sessions WHERE id = %s", (session_id,))
                conn.commit()
        conn.close()
        return json_response({'message': 'Выход выполнен'})

    # action=forgot-password
    if action == 'forgot-password':
        email = body.get('email', '').strip().lower()
        if not email:
            conn.close()
            return json_response({'error': 'Email обязателен'}, 400)
        conn.close()
        return json_response({'message': 'Если такой email зарегистрирован, инструкции отправлены'})

    # action=reset-password
    if action == 'reset-password':
        reset_token = body.get('token', '')
        new_password = body.get('password', '')
        confirm = body.get('confirmPassword', '')

        if not reset_token or not new_password:
            conn.close()
            return json_response({'error': 'Токен и новый пароль обязательны'}, 400)
        if len(new_password) < 6:
            conn.close()
            return json_response({'error': 'Пароль должен содержать минимум 6 символов'}, 400)
        if new_password != confirm:
            conn.close()
            return json_response({'error': 'Пароли не совпадают'}, 400)

        with conn.cursor() as cur:
            cur.execute(
                f"SELECT user_id FROM {SCHEMA}.sessions WHERE id = %s AND expires_at > now()",
                (reset_token,)
            )
            row = cur.fetchone()
            if not row:
                conn.close()
                return json_response({'error': 'Токен недействителен или истёк'}, 400)

            pw_hash = hash_password(new_password)
            cur.execute(f"UPDATE {SCHEMA}.users SET password_hash = %s WHERE id = %s", (pw_hash, row[0]))
            cur.execute(f"DELETE FROM {SCHEMA}.sessions WHERE id = %s", (reset_token,))
            conn.commit()

        conn.close()
        return json_response({'message': 'Пароль успешно изменён'})

    # action=make-admin
    if action == 'make-admin':
        secret = body.get('secret', '')
        admin_secret = os.environ.get('ADMIN_SECRET', '')
        if not admin_secret or secret != admin_secret:
            conn.close()
            return json_response({'error': 'Неверный секрет'}, 403)
        if not session_id:
            conn.close()
            return json_response({'error': 'Не авторизован'}, 401)
        user = get_session_user(session_id, conn)
        if not user:
            conn.close()
            return json_response({'error': 'Сессия истекла'}, 401)
        with conn.cursor() as cur:
            cur.execute(f"UPDATE {SCHEMA}.users SET is_admin = true WHERE id = %s", (user['id'],))
            conn.commit()
        conn.close()
        return json_response({'message': 'Права администратора выданы'})

    conn.close()
    return json_response({'error': 'Неизвестное действие'}, 400)