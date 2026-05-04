"""
Profile API: просмотр и редактирование профиля пользователя (аватар, обложка, о себе).
GET  /?user_id=N   — публичный профиль
POST action=update_profile — обновить аватар/обложку/bio текущего пользователя
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
ALLOWED_TYPES = {'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif'}
MAX_SIZE = 5 * 1024 * 1024


def ok(data, status=200):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, ensure_ascii=False, default=str)}

def err(msg, status=400):
    return ok({'error': msg}, status)

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_session_user(session_id, conn):
    if not session_id:
        return None
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT u.id, u.username, u.email, u.is_admin, u.avatar_url, u.bio, u.cover_url, u.house_id, u.house_name "
            f"FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
            f"WHERE s.id = %s AND s.expires_at > now()",
            (session_id,)
        )
        row = cur.fetchone()
        if row:
            return {'id': row[0], 'username': row[1], 'email': row[2], 'is_admin': row[3], 'avatar_url': row[4], 'bio': row[5], 'cover_url': row[6], 'house_id': row[7], 'house_name': row[8] or ''}
    return None

def upload_image(file_data, content_type, folder):
    if content_type not in ALLOWED_TYPES:
        raise ValueError('Неподдерживаемый тип файла')
    if ',' in file_data:
        file_data = file_data.split(',', 1)[1]
    file_bytes = base64.b64decode(file_data)
    if len(file_bytes) > MAX_SIZE:
        raise ValueError('Файл слишком большой (максимум 5 МБ)')
    ext = ALLOWED_TYPES[content_type]
    filename = f"{folder}/{uuid.uuid4().hex}.{ext}"
    s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
                      aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                      aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
    s3.put_object(Bucket='files', Key=filename, Body=file_bytes, ContentType=content_type)
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{filename}"


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    session_id = (event.get('headers') or {}).get('X-Session-Id', '').strip()
    params = event.get('queryStringParameters') or {}

    conn = get_conn()

    # GET — публичный профиль
    if method == 'GET':
        user_id = params.get('user_id')
        if not user_id:
            user = get_session_user(session_id, conn)
            conn.close()
            if not user:
                return err('Не авторизован', 401)
            return ok({'user': user})

        with conn.cursor() as cur:
            cur.execute(
                f"SELECT id, username, is_admin, avatar_url, bio, created_at, cover_url, house_id, house_name "
                f"FROM {SCHEMA}.users WHERE id = %s",
                (int(user_id),)
            )
            row = cur.fetchone()
        conn.close()
        if not row:
            return err('Пользователь не найден', 404)
        return ok({'user': {
            'id': row[0], 'username': row[1], 'is_admin': row[2],
            'avatar_url': row[3], 'bio': row[4], 'created_at': row[5], 'cover_url': row[6],
            'house_id': row[7], 'house_name': row[8] or '',
        }})

    # POST
    body = json.loads(event.get('body') or '{}')
    action = body.get('action')

    user = get_session_user(session_id, conn)
    if not user:
        conn.close()
        return err('Не авторизован', 401)

    if action == 'update_profile':
        bio = body.get('bio', user['bio'])[:500]
        avatar_url = user['avatar_url']
        cover_url = user['cover_url']

        if body.get('avatar_file'):
            try:
                avatar_url = upload_image(body['avatar_file'], body.get('avatar_content_type', 'image/jpeg'), 'user-avatars')
            except ValueError as e:
                conn.close()
                return err(str(e))

        if body.get('cover_file'):
            try:
                cover_url = upload_image(body['cover_file'], body.get('cover_content_type', 'image/jpeg'), 'user-covers')
            except ValueError as e:
                conn.close()
                return err(str(e))

        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {SCHEMA}.users SET avatar_url = %s, bio = %s, cover_url = %s WHERE id = %s",
                (avatar_url, bio, cover_url, user['id'])
            )
        conn.commit()
        conn.close()
        return ok({'ok': True, 'avatar_url': avatar_url, 'bio': bio, 'cover_url': cover_url})

    conn.close()
    return err('Неизвестное действие')