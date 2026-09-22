"""Local account provisioning and session/CSRF protection for the Pulse server."""
import getpass
import json
import os
import secrets
import threading
import time
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlsplit

from flask import jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

CONFIG_DIR = Path(__file__).resolve().parent / '.pulse'
CONFIG_FILE = CONFIG_DIR / 'accounts.json'


def read_accounts():
    try:
        return json.loads(CONFIG_FILE.read_text())
    except (FileNotFoundError, ValueError):
        return None


def configure_auth(app):
    config = read_accounts()
    app.secret_key = config['secret'] if config else secrets.token_hex(32)
    app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Lax',
                      SESSION_COOKIE_SECURE=os.environ.get('PULSE_HTTPS') == '1',
                      PERMANENT_SESSION_LIFETIME=timedelta(hours=12))
    attempts = {}
    lock = threading.Lock()
    public = {'/api/auth/status', '/api/auth/login', '/api/system/health'}

    @app.before_request
    def protect_api():
        if not request.path.startswith('/api/'):
            return None
        if request.path != '/api/upload' and (request.content_length or 0) > 3 * 1024 * 1024:
            return jsonify(success=False, error='요청 크기가 너무 큽니다.'), 413
        if request.path in public:
            return None
        if not config:
            return jsonify(success=False, error='Termux에서 python3 setup-auth.py를 먼저 실행하세요.'), 503
        user = config['users'].get(session.get('username'))
        if not user:
            return jsonify(success=False, error='로그인이 필요합니다.'), 401
        if request.method not in ('GET', 'HEAD', 'OPTIONS'):
            token = request.headers.get('X-CSRF-Token', '')
            if not token or not secrets.compare_digest(token, session.get('csrf', '')):
                return jsonify(success=False, error='세션이 만료되었습니다. 다시 로그인하세요.'), 403
            if request.path != '/api/auth/logout' and user['role'] != 'admin':
                return jsonify(success=False, error='관리자 권한이 필요합니다.'), 403
        if request.path in ('/api/system/check-update', '/api/system/changelog', '/api/system/vnc-status', '/api/trash') and user['role'] != 'admin':
            return jsonify(success=False, error='관리자 권한이 필요합니다.'), 403

    @app.get('/api/auth/status')
    def auth_status():
        user = (config or {}).get('users', {}).get(session.get('username'))
        return jsonify(success=True, configured=bool(config), authenticated=bool(user),
                       username=session.get('username') if user else None,
                       role=user['role'] if user else None, csrf=session.get('csrf') if user else None)

    @app.post('/api/auth/login')
    def login():
        if not config:
            return jsonify(success=False, error='서버에서 python3 setup-auth.py 실행 후 서버를 재시작하세요.'), 503
        origin = request.headers.get('Origin')
        if origin:
            forwarded_host = request.headers.get('X-Forwarded-Host', '').split(',')[0].strip()
            allowed_hosts = {request.host}
            if forwarded_host:
                allowed_hosts.add(forwarded_host)
                if ':' in forwarded_host:
                    allowed_hosts.add(forwarded_host.split(':')[0])
            if ':' in request.host:
                allowed_hosts.add(request.host.split(':')[0])
            if urlsplit(origin).netloc not in allowed_hosts:
                return jsonify(success=False, error='허용되지 않은 요청입니다.'), 403
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify(success=False, error='올바른 로그인 요청이 필요합니다.'), 400
        username, password = data.get('username'), data.get('password')
        if not isinstance(username, str) or not isinstance(password, str) or len(password) > 1024:
            return jsonify(success=False, error='계정과 비밀번호를 확인하세요.'), 400
        # Per-account rate limit also applies behind local tunnel proxies.
        key = username if username in config['users'] else '_unknown'
        with lock:
            failures = [t for t in attempts.get(key, []) if time.monotonic() - t < 300]
            if len(failures) >= 5:
                return jsonify(success=False, error='로그인 시도가 많습니다. 5분 뒤 다시 시도하세요.'), 429
            attempts[key] = failures + [time.monotonic()]
        user = config['users'].get(username)
        if not user or not check_password_hash(user['password'], password):
            return jsonify(success=False, error='계정 또는 비밀번호가 올바르지 않습니다.'), 401
        with lock:
            attempts.pop(key, None)
        session.clear()
        session.permanent = True
        session.update(username=username, csrf=secrets.token_hex(32))
        return jsonify(success=True, role=user['role'], username=username, csrf=session['csrf'])

    @app.post('/api/auth/logout')
    def logout():
        session.clear()
        return jsonify(success=True)


def provision():
    CONFIG_DIR.mkdir(mode=0o700, exist_ok=True)
    config = read_accounts() or {'secret': secrets.token_hex(32), 'users': {}}
    username = input('계정 이름: ').strip()
    if not username or len(username) > 64:
        raise SystemExit('계정 이름은 1~64자로 입력하세요.')
    role = input('권한 [admin/viewer] (기본 admin): ').strip() or 'admin'
    if role not in ('admin', 'viewer'):
        raise SystemExit('권한은 admin 또는 viewer입니다.')
    if role == 'viewer' and not any(u['role'] == 'admin' for n, u in config['users'].items() if n != username):
        raise SystemExit('관리자 계정을 먼저 등록해야 합니다.')
    password = getpass.getpass('비밀번호 (12자 이상): ')
    if len(password) < 12 or len(password) > 1024 or password != getpass.getpass('비밀번호 확인: '):
        raise SystemExit('비밀번호 길이 또는 확인 값이 올바르지 않습니다.')
    config['users'][username] = {'role': role, 'password': generate_password_hash(password, method='pbkdf2:sha256:600000')}
    # Rotate the signing key when credentials change, invalidating older sessions.
    config['secret'] = secrets.token_hex(32)
    temporary = CONFIG_FILE.with_suffix('.tmp')
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as out:
        json.dump(config, out)
    os.chmod(temporary, 0o600)
    os.replace(temporary, CONFIG_FILE)
    print('계정을 저장했습니다. 서버를 재시작하면 적용됩니다. 실제 계정 파일은 Git에 포함하지 마세요.')
