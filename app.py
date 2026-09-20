import os
import mimetypes
import shutil
import platform
import sys
import subprocess
import json
import threading
import time
import signal
import uuid
import shlex
from pathlib import Path
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, send_file, abort, g
from pulse_metrics import Metrics

app = Flask(__name__, static_folder='public', static_url_path='')

APP_VERSION = 'v2.0.0'
INSTANCE_ID = uuid.uuid4().hex
SERVER_START_TIME = datetime.now()
METRICS = Metrics()

@app.before_request
def begin_measurement():
    g.pulse_started = time.monotonic()
    METRICS.begin_request()

@app.after_request
def finish_measurement(response):
    started = g.pop('pulse_started', None)
    if started is not None:
        METRICS.finish_request((time.monotonic() - started) * 1000, response.status_code)
    return response

@app.teardown_request
def finish_failed_measurement(error):
    started = g.pop('pulse_started', None)
    if started is not None:
        METRICS.finish_request((time.monotonic() - started) * 1000, 500)


# 저장 경로 설정 (환경변수로 변경 가능: 예: STORAGE_PATH=/sdcard/MyCloud)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_STORAGE_DIR = os.path.join(BASE_DIR, 'uploads')
STORAGE_DIR = os.path.abspath(os.path.expanduser(os.environ.get('STORAGE_PATH', DEFAULT_STORAGE_DIR)))

# 저장 폴더가 없으면 생성
os.makedirs(STORAGE_DIR, exist_ok=True)

# 2GB 최대 업로드 제한 (필요시 조절 가능)
app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024 * 1024

TEXT_EXTENSIONS = {
    'txt', 'md', 'json', 'csv', 'log', 'py', 'js', 'html', 'css',
    'sh', 'xml', 'yaml', 'yml', 'conf', 'env', 'ini', 'sql', 'ts',
    'java', 'c', 'cpp', 'h', 'scss', 'less', 'bat', 'cmd', 'jsx', 'tsx'
}

def is_text_file(filename):
    ext = os.path.splitext(filename)[1].lower().lstrip('.')
    return ext in TEXT_EXTENSIONS

def format_size(size_bytes):
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

def get_file_type(filename):
    ext = os.path.splitext(filename)[1].lower().lstrip('.')
    mime, _ = mimetypes.guess_type(filename)
    
    if mime:
        if mime.startswith('image/'):
            return 'image'
        elif mime.startswith('video/'):
            return 'video'
        elif mime.startswith('audio/'):
            return 'audio'
        elif mime == 'application/pdf':
            return 'pdf'
    
    if ext in ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'bmp', 'tiff']:
        return 'image'
    if ext in ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv']:
        return 'video'
    if ext in ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a']:
        return 'audio'
    if ext in ['pdf']:
        return 'pdf'
    if ext in ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'md', 'hwp', 'csv', 'json']:
        return 'document'
    if ext in ['zip', 'rar', '7z', 'tar', 'gz']:
        return 'archive'
    return 'other'

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

from pulse_auth import configure_auth
from pulse_files import register_files
configure_auth(app)
register_files(app, STORAGE_DIR, get_file_type, is_text_file, format_size)
TERMINAL_LOCK = threading.Lock()
UPDATE_LOCK = threading.Lock()
UPDATE_CACHE = {'time': 0, 'value': None}

# 가상 터미널 쉘 명령어 실행 API
@app.route('/api/terminal/exec', methods=['POST'])
def terminal_exec():
    current_dir = BASE_DIR
    if not TERMINAL_LOCK.acquire(blocking=False):
        return jsonify(success=False, output='다른 명령이 실행 중입니다.', exitCode=1), 409
    try:
        data = request.get_json(silent=True) or {}
        raw_cmd = data.get('command', '')
        client_cwd = data.get('cwd', '')
        if not isinstance(raw_cmd, str) or not isinstance(client_cwd, str) or len(raw_cmd) > 8192:
            return jsonify(success=False, output='명령이 올바르지 않습니다.', exitCode=1), 400
        raw_cmd = raw_cmd.strip()
        current_dir = client_cwd if os.path.isdir(client_cwd) else os.path.expanduser('~')
        if raw_cmd == 'cd' or raw_cmd.startswith('cd '):
            import shlex
            parts = shlex.split(raw_cmd)
            if len(parts) > 2:
                return jsonify(success=False, output='cd 명령은 단독으로 사용하세요.', cwd=current_dir, exitCode=1)
            target = os.path.expanduser(parts[1]) if len(parts) > 1 else os.path.expanduser('~')
            new_path = os.path.normpath(os.path.join(current_dir, target))
            if not os.path.isdir(new_path):
                return jsonify(success=False, output='디렉터리를 찾을 수 없습니다.', cwd=current_dir, exitCode=1)
            return jsonify(success=True, output='', cwd=new_path, exitCode=0)
        # Drain output continuously; retain at most 1MB in memory.
        proc = subprocess.Popen(raw_cmd, shell=True, cwd=current_dir, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, start_new_session=True)
        chunks = bytearray()
        def drain():
            while True:
                chunk = proc.stdout.read(8192)
                if not chunk:
                    break
                if len(chunks) < 1024 * 1024:
                    chunks.extend(chunk[:1024 * 1024 - len(chunks)])
        reader = threading.Thread(target=drain, daemon=True)
        reader.start()
        timed_out = False
        try:
            proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            timed_out = True
        finally:
            # Also terminate descendants that outlive the shell and hold stdout open.
            try:
                os.killpg(proc.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            proc.wait()
            reader.join(timeout=2)
            if not reader.is_alive():
                proc.stdout.close()
        output = chunks.decode('utf-8', errors='replace')
        if len(chunks) >= 1024 * 1024:
            output += '\n[출력을 1MB로 제한했습니다.]'
        if timed_out:
            output += '\n[15초 제한으로 명령을 종료했습니다.]'
        return jsonify(success=not timed_out and proc.returncode == 0, output=output,
                       cwd=current_dir, exitCode=124 if timed_out else proc.returncode)
    except Exception as error:
        return jsonify(success=False, output=str(error), cwd=current_dir, exitCode=1), 400
    finally:
        TERMINAL_LOCK.release()

# noVNC / VNC 서버 연결 상태 확인 API
@app.route('/api/system/vnc-status', methods=['GET'])
def check_vnc_status():
    import socket
    port = int(os.environ.get('VNC_PORT', 6080))
    is_open = False
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.5)
        res = s.connect_ex(('127.0.0.1', port))
        is_open = (res == 0)
        s.close()
    except Exception:
        is_open = False
    return jsonify({
        'success': True,
        'running': is_open,
        'port': port,
        'url': os.environ.get('VNC_PUBLIC_URL', '')
    })

def visible_files():
    for folder, dirs, files in os.walk(STORAGE_DIR, followlinks=False):
        dirs[:] = [name for name in dirs if not name.startswith('.') and not os.path.islink(os.path.join(folder, name))]
        for name in files:
            path = os.path.join(folder, name)
            if not name.startswith('.') and not os.path.islink(path):
                yield name, path

STATS_LOCK = threading.Lock()
STATS_CACHE = {'time': 0, 'value': None}

def file_statistics():
    with STATS_LOCK:
        if STATS_CACHE['value'] is not None and time.monotonic() - STATS_CACHE['time'] < 15:
            return STATS_CACHE['value']
        counts = dict(total=0, image=0, video=0, document=0, audio=0, other=0)
        sizes = dict(image=0, video=0, document=0, audio=0, other=0)
        used = 0
        for name, path in visible_files():
            try:
                size = os.path.getsize(path)
            except OSError:
                continue
            kind = get_file_type(name)
            kind = kind if kind in sizes else 'other'
            counts[kind] += 1
            counts['total'] += 1
            sizes[kind] += size
            used += size
        STATS_CACHE.update(time=time.monotonic(), value=(used, counts, sizes))
        return STATS_CACHE['value']

from functools import wraps

def cached_json(seconds):
    def decorate(fn):
        cache = {'time': 0, 'value': None}
        lock = threading.Lock()
        @wraps(fn)
        def wrapped():
            with lock:
                if cache['value'] is not None and time.monotonic() - cache['time'] < seconds:
                    return jsonify(cache['value'])
                response = fn()
                if hasattr(response, 'get_json') and response.status_code == 200:
                    cache.update(time=time.monotonic(), value=response.get_json())
                return response
        return wrapped
    return decorate

@app.route('/api/storage', methods=['GET'])
def storage_info():
    try:
        used_cloud, file_counts, type_sizes = file_statistics()

        total, used, free = shutil.disk_usage(STORAGE_DIR)

        return jsonify({
            'success': True,
            'cloudUsedBytes': used_cloud,
            'cloudUsedFormatted': format_size(used_cloud),
            'diskTotalBytes': total,
            'diskTotalFormatted': format_size(total),
            'diskFreeBytes': free,
            'diskFreeFormatted': format_size(free),
            'diskUsedBytes': used,
            'diskUsedFormatted': format_size(used),
            'fileCounts': file_counts,
            'typeSizes': {k: {'bytes': v, 'formatted': format_size(v)} for k, v in type_sizes.items()},
            'storagePath': STORAGE_DIR
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 브라우저 캐시 방지 (HTML/CSS/JS 수정 시 새로고침하면 즉시 반영되도록)
@app.after_request
def add_no_cache_header(response):
    if request.method in ('POST', 'DELETE') and request.path.startswith(('/api/files', '/api/folders', '/api/trash', '/api/upload')):
        STATS_CACHE['time'] = 0
    if not request.path.startswith('/api/thumbnail/'):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["X-Content-Type-Options"] = "nosniff"
    if request.path.startswith('/api/preview/'):
        response.headers["Content-Security-Policy"] = "sandbox"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# 원격 Git 업데이트 확인 API (백그라운드 감지용)
@app.route('/api/system/check-update', methods=['GET'])
def check_update():
    with UPDATE_LOCK:
        if request.args.get('force') != '1' and UPDATE_CACHE['value'] is not None and time.monotonic() - UPDATE_CACHE['time'] < 300:
            return jsonify(UPDATE_CACHE['value'])
        result = perform_update_check()
        data = result.get_json()
        if data.get('success') and not data.get('fetchFailed') and not data.get('timeout'):
            UPDATE_CACHE.update(time=time.monotonic(), value=data)
        else:
            UPDATE_CACHE.update(time=0, value=None)
        return result

def perform_update_check():
    try:
        git_dir = os.path.join(BASE_DIR, '.git')
        if not os.path.exists(git_dir):
            return jsonify({'success': False, 'hasUpdate': False, 'reason': 'no_git'})

        # 원격 저장소 최신 상태 조회 (git fetch)
        fetch_res = subprocess.run(
            ['git', 'fetch', 'origin', 'main'],
            cwd=BASE_DIR,
            capture_output=True,
            text=True,
            timeout=8
        )
        if fetch_res.returncode != 0:
            return jsonify({'success': True, 'hasUpdate': False, 'fetchFailed': True})

        # 로컬 및 원격 최신 커밋 해시 비교
        local_hash = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=BASE_DIR, text=True).strip()
        remote_hash = subprocess.check_output(['git', 'rev-parse', 'origin/main'], cwd=BASE_DIR, text=True).strip()

        has_update = int(subprocess.check_output(['git', 'rev-list', '--count', 'HEAD..origin/main'], cwd=BASE_DIR, text=True).strip()) > 0
        behind_count = 0
        latest_message = ""

        if has_update:
            try:
                count_res = subprocess.check_output(
                    ['git', 'rev-list', '--count', f'{local_hash}..{remote_hash}'],
                    cwd=BASE_DIR,
                    text=True
                ).strip()
                behind_count = int(count_res) if count_res.isdigit() else 1

                latest_message = subprocess.check_output(
                    ['git', 'log', '-1', '--pretty=%B', 'origin/main'],
                    cwd=BASE_DIR,
                    text=True
                ).strip().split('\n')[0]
            except Exception:
                behind_count = 1
                latest_message = "새로운 업데이트가 있습니다."

        return jsonify({
            'success': True,
            'hasUpdate': has_update,
            'behindCount': behind_count,
            'latestMessage': latest_message,
            'localHash': local_hash[:7] if local_hash else '',
            'remoteHash': remote_hash[:7] if remote_hash else ''
        })
    except subprocess.TimeoutExpired:
        return jsonify({'success': True, 'hasUpdate': False, 'timeout': True})
    except Exception as e:
        return jsonify({'success': False, 'hasUpdate': False, 'error': str(e)})

# Keep the mutation locks until exec so uploads/commands cannot start mid-restart.
RESTART_PENDING = threading.Event()
RESTART_ERROR = None


def acquire_restart_guards():
    held = []
    for lock in (TERMINAL_LOCK, app.extensions['pulse_file_lock']):
        if not lock.acquire(blocking=False):
            for acquired in held:
                acquired.release()
            return None
        held.append(lock)
    return held


def schedule_restart(guards=None):
    global RESTART_ERROR
    RESTART_ERROR = None
    RESTART_PENDING.set()

    def restart():
        global RESTART_ERROR
        try:
            # 브라우저에 응답(JSON)이 완전히 전달될 시간을 확보합니다.
            time.sleep(1.5)
            stop_script = os.path.join(BASE_DIR, 'stop.sh')
            start_script = os.path.join(BASE_DIR, 'start.sh')

            # 현재 프로세스와 완전히 분리된 세션에서 stop.sh 실행 후 start.sh --bg 실행
            restart_cmd = (
                f"sleep 0.5 && "
                f"bash {shlex.quote(stop_script)} && "
                f"bash {shlex.quote(start_script)} --bg"
            )
            subprocess.Popen(
                ['bash', '-c', restart_cmd],
                cwd=BASE_DIR,
                start_new_session=True,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                close_fds=True
            )
            time.sleep(0.5)
            # 이전 프로세스를 즉시 종료하여 3000번 포트 리스닝 소켓을 OS에 즉시 반환
            os._exit(0)
        except Exception:
            app.logger.exception('Pulse restart failed')
            RESTART_ERROR = '서버 재시작 실패. Termux에서 termux-cloud logs를 확인하고 termux-cloud restart를 실행하세요.'
            if guards:
                for lock in guards:
                    try:
                        lock.release()
                    except Exception:
                        pass
            RESTART_PENDING.clear()

    try:
        threading.Thread(target=restart, daemon=True).start()
    except Exception:
        RESTART_PENDING.clear()
        raise


def restart_unavailable():
    return jsonify(success=False, error='현재 서버가 관리 모드로 실행되지 않았습니다. 스마트폰 Termux에서 termux-cloud restart를 한 번 실행한 뒤 웹 업데이트를 다시 시도하세요.'), 409


# Download and schedule restart as one server operation.
@app.route('/api/system/update', methods=['POST'])
def system_update():
    if not UPDATE_LOCK.acquire(blocking=False):
        return jsonify(success=False, error='업데이트 확인 또는 적용이 진행 중입니다.'), 409
    guards = None
    try:
        if RESTART_PENDING.is_set():
            return jsonify(success=False, error='서버 재시작이 이미 진행 중입니다.'), 409
        guards = acquire_restart_guards()
        if guards is None:
            return jsonify(success=False, error='명령 실행 또는 파일 작업이 끝난 뒤 다시 시도하세요.'), 409
        # Termux/서버 환경의 파일 권한 차이로 인한 변경 오인 방지
        try:
            subprocess.run(['git', 'config', 'core.filemode', 'false'], cwd=BASE_DIR, capture_output=True, text=True, timeout=5)
        except Exception:
            pass

        # 원격 최신 커밋 가져오기
        fetch_res = subprocess.run(['git', 'fetch', 'origin', 'main'], cwd=BASE_DIR,
                                   capture_output=True, text=True, timeout=60)
        if fetch_res.returncode != 0:
            return jsonify(success=False, output=(fetch_res.stdout + fetch_res.stderr).strip(), stage='failed'), 500

        # 로컬 변경 사항(권한 차이, 로컬 수정 등)이 있더라도 무시하고 origin/main으로 강제 동기화
        result = subprocess.run(['git', 'reset', '--hard', 'origin/main'], cwd=BASE_DIR,
                                capture_output=True, text=True, timeout=60)
        UPDATE_CACHE['time'] = 0
        if result.returncode != 0:
            return jsonify(success=False, output=(result.stdout + result.stderr).strip(), stage='failed'), 500

        # 스크립트 실행 권한 복구
        try:
            for sh_file in Path(BASE_DIR).glob('*.sh'):
                sh_file.chmod(sh_file.stat().st_mode | 0o755)
        except Exception:
            pass

        # 레거시 기본 샘플 파일 정리
        for legacy_file in ['sample_photo.svg', '환영합니다.txt']:
            for s_dir in {STORAGE_DIR, DEFAULT_STORAGE_DIR}:
                legacy_path = os.path.join(s_dir, legacy_file)
                if os.path.exists(legacy_path):
                    try:
                        os.remove(legacy_path)
                    except Exception:
                        pass

        # 의존성 변경 사항 확인
        try:
            subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', '-r', 'requirements.txt'],
                           cwd=BASE_DIR, timeout=60)
        except Exception:
            pass

        schedule_restart(guards)
        guards = None  # Ownership transferred to the restart worker.
        return jsonify(success=True, output=(result.stdout + result.stderr).strip(),
                       stage='restarting', restartScheduled=True,
                       restartSupported=True, instanceId=INSTANCE_ID)
    except Exception as error:
        return jsonify(success=False, error=str(error)), 500
    finally:
        if guards is not None:
            for lock in guards:
                lock.release()
        UPDATE_LOCK.release()


@app.post('/api/system/restart')
def restart_server():
    if not UPDATE_LOCK.acquire(blocking=False):
        return jsonify(success=False, error='업데이트 확인 또는 적용이 진행 중입니다.'), 409
    guards = None
    try:
        # Older browser code may still send this after the update response.
        if RESTART_PENDING.is_set():
            return jsonify(success=True, stage='restarting', instanceId=INSTANCE_ID)
        guards = acquire_restart_guards()
        if guards is None:
            return jsonify(success=False, error='명령 실행 또는 파일 작업이 끝난 뒤 다시 시도하세요.'), 409
        schedule_restart(guards)
        guards = None
        return jsonify(success=True, stage='restarting', instanceId=INSTANCE_ID)
    finally:
        if guards is not None:
            for lock in guards:
                lock.release()
        UPDATE_LOCK.release()


@app.get('/api/system/health')
def health():
    return jsonify(success=True, version=APP_VERSION, instanceId=INSTANCE_ID,
                   restartPending=RESTART_PENDING.is_set(), restartError=RESTART_ERROR)

def get_local_ip():
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def get_system_memory():
    try:
        if os.path.exists('/proc/meminfo'):
            meminfo = {}
            with open('/proc/meminfo', 'r') as f:
                for line in f:
                    parts = line.split(':')
                    if len(parts) == 2:
                        meminfo[parts[0].strip()] = parts[1].strip()
            total_kb = int(meminfo.get('MemTotal', '0 kB').split()[0])
            if total_kb <= 0:
                raise ValueError('메모리 측정값 없음')
            avail_kb = int(meminfo.get('MemAvailable', meminfo.get('MemFree', '0 kB')).split()[0])
            used_kb = max(0, total_kb - avail_kb)
            total_b = total_kb * 1024
            used_b = used_kb * 1024
            free_b = avail_kb * 1024
            pct = round((used_kb / total_kb) * 100, 1) if total_kb > 0 else 0
            return {
                'totalFormatted': format_size(total_b),
                'usedFormatted': format_size(used_b),
                'freeFormatted': format_size(free_b),
                'totalBytes': total_b,
                'usedBytes': used_b,
                'percent': pct,
                'measurement': 'measured'
            }
    except Exception:
        pass

    return {'totalFormatted': '측정 불가', 'usedFormatted': '측정 불가',
            'freeFormatted': '측정 불가', 'totalBytes': None, 'usedBytes': None,
            'percent': None, 'measurement': 'unavailable'}

def get_battery_info():
    try:
        res = subprocess.run(['termux-battery-status'], capture_output=True, text=True, timeout=2)
        if res.returncode == 0:
            bdata = json.loads(res.stdout)
            percentage = bdata.get('percentage')
            if not isinstance(percentage, (int, float)) or not 0 <= percentage <= 100:
                raise ValueError('배터리 측정값 없음')
            return {
                'supported': True,
                'percentage': percentage,
                'plugged': bdata.get('plugged', '확인 불가'),
                'status': bdata.get('status', '확인 불가'),
                'temperature': round(bdata['temperature'], 1) if isinstance(bdata.get('temperature'), (int, float)) else None,
                'health': bdata.get('health', '확인 불가')
            }
    except Exception:
        pass
    return {
        'supported': False,
        'percentage': None,
        'plugged': '확인 불가',
        'status': '측정 불가',
        'temperature': None,
        'health': 'GOOD'
    }

def get_uptime_info():
    now = datetime.now()
    delta = now - SERVER_START_TIME
    total_seconds = int(delta.total_seconds())
    days = total_seconds // 86400
    hours = (total_seconds % 86400) // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60

    if days > 0:
        formatted = f"{days}일 {hours}시간 {minutes}분"
    elif hours > 0:
        formatted = f"{hours}시간 {minutes}분 {seconds}초"
    elif minutes > 0:
        formatted = f"{minutes}분 {seconds}초"
    else:
        formatted = f"{seconds}초"

    return {
        'startedAt': SERVER_START_TIME.strftime('%Y-%m-%d %H:%M:%S'),
        'totalSeconds': total_seconds,
        'formatted': formatted
    }

# 대시보드 종합 상태 조회 API
@app.route('/api/system/dashboard', methods=['GET'])
@cached_json(5)
def get_dashboard_data():
    try:
        port = int(os.environ.get('PORT', 3000))
        total, used, free = shutil.disk_usage(STORAGE_DIR)
        disk_pct = round((used / total) * 100, 1) if total > 0 else 0

        used_cloud, file_counts, type_sizes = file_statistics()

        diagnostics = METRICS.collect(STORAGE_DIR, BASE_DIR)
        is_termux = os.path.exists('/data/data/com.termux') or 'com.termux' in os.environ.get('PREFIX', '')

        return jsonify({
            'success': True,
            'version': APP_VERSION,
            'runtime': f"Python {platform.python_version()} (Flask)",
            'osName': f"{'Android (Termux)' if is_termux else platform.system()} {platform.machine()}",
            'pid': os.getpid(),
            'uptime': get_uptime_info(),
            'cpu': diagnostics['cpu'],
            'diagnostics': diagnostics,
            'services': {
                'terminalBusy': TERMINAL_LOCK.locked(),
                'fileOperationBusy': app.extensions['pulse_file_lock'].locked(),
                'updateBusy': UPDATE_LOCK.locked(),
                'managedRestart': os.environ.get('PULSE_MANAGED') == '1',
                'secureCookie': app.config['SESSION_COOKIE_SECURE'],
                'debug': app.debug,
                'vncPort': os.environ.get('VNC_PORT', '6080'),
                'updateCheckedSecondsAgo': round(time.monotonic() - UPDATE_CACHE['time']) if UPDATE_CACHE['value'] is not None else None,
                'authentication': True
            },
            'memory': get_system_memory(),
            'battery': get_battery_info(),
            'disk': {
                'totalFormatted': format_size(total),
                'usedFormatted': format_size(used),
                'freeFormatted': format_size(free),
                'percent': disk_pct,
                'cloudUsedFormatted': format_size(used_cloud),
                'cloudFilesCount': file_counts['total'],
                'fileCounts': file_counts,
                'typeSizes': type_sizes
            },
            'network': {
                'localIp': get_local_ip(),
                'port': port,
                'isTermux': is_termux
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 릴리즈 로그 및 커밋 변경 내역 API
@app.route('/api/system/changelog', methods=['GET'])
def get_changelog():
    try:
        changelog_content = ""
        changelog_path = os.path.join(BASE_DIR, 'CHANGELOG.md')
        if os.path.exists(changelog_path):
            with open(changelog_path, 'r', encoding='utf-8') as f:
                changelog_content = f.read()

        recent_commits = []
        try:
            log_out = subprocess.check_output(
                ['git', 'log', '-n', '8', '--pretty=format:%h|||%an|||%ad|||%s', '--date=short'],
                cwd=BASE_DIR,
                text=True
            ).strip()
            if log_out:
                for line in log_out.split('\n'):
                    parts = line.split('|||')
                    if len(parts) >= 4:
                        recent_commits.append({
                            'hash': parts[0],
                            'author': parts[1],
                            'date': parts[2],
                            'message': parts[3]
                        })
        except Exception:
            pass

        upcoming_commits = []
        try:
            up_out = subprocess.check_output(
                ['git', 'log', 'HEAD..origin/main', '--pretty=format:%h|||%an|||%ad|||%s', '--date=short'],
                cwd=BASE_DIR,
                text=True
            ).strip()
            if up_out:
                for line in up_out.split('\n'):
                    parts = line.split('|||')
                    if len(parts) >= 4:
                        upcoming_commits.append({
                            'hash': parts[0],
                            'author': parts[1],
                            'date': parts[2],
                            'message': parts[3]
                        })
        except Exception:
            pass

        return jsonify({
            'success': True,
            'currentVersion': APP_VERSION,
            'changelog': changelog_content,
            'recentCommits': recent_commits,
            'upcomingCommits': upcoming_commits
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    # 운영 기본값: 디버거 및 리로더 비활성화
    is_debug = os.environ.get('DEBUG', 'false').lower() in ['true', '1', 'yes']
    local_ip = get_local_ip()
    os.environ['PULSE_MANAGED'] = '1'

    # PID 파일 기록 (수동 구동 시에도 안정적인 관리 지원)
    pid_file = os.path.join(BASE_DIR, '.server.pid')
    try:
        with open(pid_file, 'w') as f:
            f.write(str(os.getpid()))
    except Exception:
        pass

    print("==================================================")
    print(" ⚡   Pulse (Pulse Cloud & Pulse OS) Server Started!")
    print(f" 📂  저장소 경로: {STORAGE_DIR}")
    print(f" 📱  스마트폰 자체 접속 : http://localhost:{port}")
    print(f" 💻  동일 와이파이 접속 : http://{local_ip}:{port}")
    print(f" 🔄  코드 자동 반영   : {'활성화' if is_debug else '비활성화'}")
    print("==================================================")
    app.run(host='0.0.0.0', port=port, debug=is_debug, use_reloader=is_debug)
