"""
Статистика посещений сайта.
GET  /           — получить статистику (только админ)
POST /track      — записать посещение (публично, по IP+session дедупликация за сутки)
"""
import json
import os
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id, X-User-Id, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}


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


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')

    # POST action=track — записать посещение
    body_raw = event.get('body') or '{}'
    body_pre = json.loads(body_raw)
    action = body_pre.get('action', '')

    if method == 'POST' and action == 'track':
        page_path = body_pre.get('path', '/')
        headers = event.get('headers') or {}
        session_id = (
            headers.get('x-session-id') or
            headers.get('X-Session-Id') or
            headers.get('X-Session-ID') or ''
        )
        ip_address = (
            (event.get('requestContext') or {}).get('identity', {}).get('sourceIp') or
            headers.get('x-forwarded-for') or
            headers.get('X-Forwarded-For') or ''
        ).split(',')[0].strip()

        conn = get_conn()
        try:
            with conn.cursor() as cur:
                # Дедупликация: не пишем одно и то же посещение дважды за сутки
                if session_id:
                    cur.execute(
                        f"SELECT id FROM {SCHEMA}.page_views "
                        f"WHERE session_id = %s AND path = %s AND visited_at > now() - interval '1 day'",
                        (session_id, page_path)
                    )
                else:
                    cur.execute(
                        f"SELECT id FROM {SCHEMA}.page_views "
                        f"WHERE ip_address = %s AND path = %s AND visited_at > now() - interval '1 day'",
                        (ip_address, page_path)
                    )
                existing = cur.fetchone()
                if not existing:
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.page_views (path, session_id, ip_address) "
                        f"VALUES (%s, %s, %s)",
                        (page_path, session_id or None, ip_address or None)
                    )
            conn.commit()
        finally:
            conn.close()
        return resp({'ok': True})

    # GET / — статистика (только админ)
    if method == 'GET':
        user = get_admin_user(event)
        if not user:
            return resp({'error': 'Нет доступа'}, 403)

        conn = get_conn()
        try:
            with conn.cursor() as cur:
                # Всего уникальных посетителей (по session_id или ip)
                cur.execute(
                    f"SELECT COUNT(DISTINCT COALESCE(session_id, ip_address)) FROM {SCHEMA}.page_views"
                )
                total_unique = cur.fetchone()[0]

                # Всего просмотров
                cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.page_views")
                total_views = cur.fetchone()[0]

                # За сегодня
                cur.execute(
                    f"SELECT COUNT(DISTINCT COALESCE(session_id, ip_address)) FROM {SCHEMA}.page_views "
                    f"WHERE visited_at >= current_date"
                )
                today_unique = cur.fetchone()[0]

                # За 7 дней
                cur.execute(
                    f"SELECT COUNT(DISTINCT COALESCE(session_id, ip_address)) FROM {SCHEMA}.page_views "
                    f"WHERE visited_at >= now() - interval '7 days'"
                )
                week_unique = cur.fetchone()[0]

                # За 30 дней
                cur.execute(
                    f"SELECT COUNT(DISTINCT COALESCE(session_id, ip_address)) FROM {SCHEMA}.page_views "
                    f"WHERE visited_at >= now() - interval '30 days'"
                )
                month_unique = cur.fetchone()[0]

                # Посещений по дням за 30 дней
                cur.execute(
                    f"SELECT date_trunc('day', visited_at)::date AS day, "
                    f"COUNT(DISTINCT COALESCE(session_id, ip_address)) AS visitors "
                    f"FROM {SCHEMA}.page_views "
                    f"WHERE visited_at >= now() - interval '30 days' "
                    f"GROUP BY day ORDER BY day"
                )
                daily = [{'date': str(r[0]), 'visitors': r[1]} for r in cur.fetchall()]

                # Всего зарегистрированных пользователей
                cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users")
                total_users = cur.fetchone()[0]

                # Топ-10 популярных страниц
                cur.execute(
                    f"SELECT path, COUNT(*) AS views, "
                    f"COUNT(DISTINCT COALESCE(session_id, ip_address)) AS uniq "
                    f"FROM {SCHEMA}.page_views "
                    f"GROUP BY path ORDER BY views DESC LIMIT 10"
                )
                top_pages = [{'path': r[0], 'views': r[1], 'unique': r[2]} for r in cur.fetchall()]

                # Новые регистрации по дням за 30 дней
                cur.execute(
                    f"SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS cnt "
                    f"FROM {SCHEMA}.users "
                    f"WHERE created_at >= now() - interval '30 days' "
                    f"GROUP BY day ORDER BY day"
                )
                new_users_daily = [{'date': str(r[0]), 'count': r[1]} for r in cur.fetchall()]

                # Активность по часам суток за 30 дней
                cur.execute(
                    f"SELECT EXTRACT(HOUR FROM visited_at)::int AS hour, COUNT(*) AS cnt "
                    f"FROM {SCHEMA}.page_views "
                    f"WHERE visited_at >= now() - interval '30 days' "
                    f"GROUP BY hour ORDER BY hour"
                )
                hourly_map = {r[0]: r[1] for r in cur.fetchall()}
                hourly = [{'hour': h, 'views': hourly_map.get(h, 0)} for h in range(24)]

        finally:
            conn.close()

        avg_views_per_visitor = round(total_views / total_unique, 2) if total_unique else 0

        return resp({
            'total_unique': total_unique,
            'total_views': total_views,
            'today_unique': today_unique,
            'week_unique': week_unique,
            'month_unique': month_unique,
            'total_users': total_users,
            'avg_views_per_visitor': avg_views_per_visitor,
            'daily': daily,
            'top_pages': top_pages,
            'new_users_daily': new_users_daily,
            'hourly': hourly,
        })

    return resp({'error': 'Метод не поддерживается'}, 405)