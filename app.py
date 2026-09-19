import os
import mimetypes
import shutil
import platform
import sys
import subprocess
import json
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, send_file, abort
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='public', static_url_path='')

APP_VERSION = 'v1.3.0'
SERVER_START_TIME = datetime.now()

# 저장 경로 설정 (환경변수로 변경 가능: 예: STORAGE_PATH=/sdcard/MyCloud)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_STORAGE_DIR = os.path.join(BASE_DIR, 'uploads')
STORAGE_DIR = os.environ.get('STORAGE_PATH', DEFAULT_STORAGE_DIR)

# 저장 폴더가 없으면 생성
os.makedirs(STORAGE_DIR, exist_ok=True)

# 가상 터미널 기본 작업 디렉토리
SESSION_CWD = os.path.expanduser('~') if os.path.exists(os.path.expanduser('~')) else BASE_DIR

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

@app.route('/api/files', methods=['GET'])
def list_files():
    try:
        files = []
        for filename in os.listdir(STORAGE_DIR):
            if filename.startswith('.'):
                continue
            filepath = os.path.join(STORAGE_DIR, filename)
            if os.path.isfile(filepath):
                stat = os.stat(filepath)
                file_type = get_file_type(filename)
                files.append({
                    'name': filename,
                    'size': stat.st_size,
                    'sizeFormatted': format_size(stat.st_size),
                    'modified': int(stat.st_mtime * 1000),
                    'dateFormatted': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M'),
                    'type': file_type,
                    'isText': is_text_file(filename),
                    'extension': os.path.splitext(filename)[1].lower().lstrip('.'),
                    'previewUrl': f'/api/preview/{filename}',
                    'downloadUrl': f'/api/download/{filename}'
                })
        
        # 최신 수정일순 정렬
        files.sort(key=lambda x: x['modified'], reverse=True)
        return jsonify({'success': True, 'files': files})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_files():
    if 'files' not in request.files and 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file uploaded'}), 400

    uploaded_files = request.files.getlist('files')
    if not uploaded_files or uploaded_files[0].filename == '':
        single_file = request.files.get('file')
        if single_file and single_file.filename != '':
            uploaded_files = [single_file]
        else:
            return jsonify({'success': False, 'error': 'Empty filename'}), 400

    saved_list = []
    for file_obj in uploaded_files:
        if file_obj and file_obj.filename:
            orig_name = os.path.basename(file_obj.filename)
            safe_name = os.path.basename(orig_name).strip()
            if not safe_name:
                safe_name = f"upload_{int(datetime.now().timestamp())}"

            target_path = os.path.join(STORAGE_DIR, safe_name)
            
            # 동일한 파일명이 존재할 경우 이름 변경 (예: photo (1).jpg)
            if os.path.exists(target_path):
                name, ext = os.path.splitext(safe_name)
                counter = 1
                while os.path.exists(os.path.join(STORAGE_DIR, f"{name} ({counter}){ext}")):
                    counter += 1
                safe_name = f"{name} ({counter}){ext}"
                target_path = os.path.join(STORAGE_DIR, safe_name)

            file_obj.save(target_path)
            stat = os.stat(target_path)
            saved_list.append({
                'name': safe_name,
                'size': stat.st_size,
                'sizeFormatted': format_size(stat.st_size),
                'type': get_file_type(safe_name)
            })

    return jsonify({'success': True, 'uploaded': saved_list})

@app.route('/api/download/<path:filename>', methods=['GET'])
def download_file(filename):
    safe_name = os.path.basename(filename)
    filepath = os.path.join(STORAGE_DIR, safe_name)
    if not os.path.exists(filepath) or not os.path.isfile(filepath):
        abort(404, description="File not found")
    return send_file(filepath, as_attachment=True, download_name=safe_name)

@app.route('/api/preview/<path:filename>', methods=['GET'])
def preview_file(filename):
    safe_name = os.path.basename(filename)
    filepath = os.path.join(STORAGE_DIR, safe_name)
    if not os.path.exists(filepath) or not os.path.isfile(filepath):
        abort(404, description="File not found")
    if is_text_file(safe_name):
        return send_file(filepath, mimetype='text/plain; charset=utf-8', as_attachment=False)
    mime, _ = mimetypes.guess_type(filepath)
    return send_file(filepath, mimetype=mime or 'application/octet-stream', as_attachment=False)

@app.route('/api/files/<path:filename>', methods=['DELETE'])
def delete_file(filename):
    safe_name = os.path.basename(filename)
    filepath = os.path.join(STORAGE_DIR, safe_name)
    if not os.path.exists(filepath) or not os.path.isfile(filepath):
        return jsonify({'success': False, 'error': 'File not found'}), 404
    try:
        os.remove(filepath)
        return jsonify({'success': True, 'deleted': safe_name})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 파일 내용 저장 API (웹 코드/텍스트 에디터용)
@app.route('/api/files/save', methods=['POST'])
def save_file_content():
    try:
        data = request.get_json(force=True) or {}
        filename = data.get('filename', '').strip()
        content = data.get('content', '')
        if not filename:
            return jsonify({'success': False, 'error': '파일명이 지정되지 않았습니다.'}), 400

        safe_name = os.path.basename(filename)
        filepath = os.path.join(STORAGE_DIR, safe_name)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        stat = os.stat(filepath)
        return jsonify({
            'success': True,
            'filename': safe_name,
            'size': stat.st_size,
            'sizeFormatted': format_size(stat.st_size),
            'modified': int(stat.st_mtime * 1000)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 새 파일 생성 API (가상 데스크탑 및 클라우드용)
@app.route('/api/files/create', methods=['POST'])
def create_empty_file():
    try:
        data = request.get_json(force=True) or {}
        filename = data.get('filename', '').strip()
        content = data.get('content', '')
        if not filename:
            return jsonify({'success': False, 'error': '파일명이 지정되지 않았습니다.'}), 400

        safe_name = os.path.basename(filename)
        filepath = os.path.join(STORAGE_DIR, safe_name)
        if os.path.exists(filepath):
            return jsonify({'success': False, 'error': '이미 동일한 이름의 파일이 존재합니다.'}), 400

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        stat = os.stat(filepath)
        return jsonify({
            'success': True,
            'filename': safe_name,
            'size': stat.st_size,
            'sizeFormatted': format_size(stat.st_size),
            'modified': int(stat.st_mtime * 1000)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 가상 터미널 쉘 명령어 실행 API
@app.route('/api/terminal/exec', methods=['POST'])
def terminal_exec():
    global SESSION_CWD
    try:
        data = request.get_json(force=True) or {}
        raw_cmd = data.get('command', '').strip()
        client_cwd = data.get('cwd', '').strip()

        current_dir = client_cwd if (client_cwd and os.path.isdir(client_cwd)) else SESSION_CWD
        if not os.path.isdir(current_dir):
            current_dir = BASE_DIR

        if not raw_cmd:
            return jsonify({
                'success': True,
                'output': '',
                'cwd': current_dir,
                'exitCode': 0
            })

        # 'cd' 명령어 특별 처리 (디렉토리 이동)
        if raw_cmd == 'cd' or raw_cmd.startswith('cd '):
            parts = raw_cmd.split(maxsplit=1)
            target = parts[1].strip() if len(parts) > 1 else os.path.expanduser('~')
            target = os.path.expanduser(target.strip('"\''))
            new_path = os.path.normpath(os.path.join(current_dir, target))
            if os.path.isdir(new_path):
                SESSION_CWD = new_path
                return jsonify({
                    'success': True,
                    'output': '',
                    'cwd': new_path,
                    'exitCode': 0
                })
            else:
                return jsonify({
                    'success': False,
                    'output': f"cd: 디렉터리를 찾을 수 없습니다: {parts[1] if len(parts) > 1 else ''}\n",
                    'cwd': current_dir,
                    'exitCode': 1
                })

        # 일반 쉘 명령어 실행 (최대 15초 타임아웃)
        proc = subprocess.run(
            raw_cmd,
            shell=True,
            cwd=current_dir,
            capture_output=True,
            text=True,
            timeout=15
        )
        output = proc.stdout + proc.stderr
        return jsonify({
            'success': proc.returncode == 0,
            'output': output,
            'cwd': current_dir,
            'exitCode': proc.returncode
        })
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'output': '명령어 실행 시간이 초과되었습니다 (최대 15초 제한).\n',
            'cwd': current_dir,
            'exitCode': 124
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'output': f"명령 실행 오류: {str(e)}\n",
            'cwd': current_dir,
            'exitCode': 1
        })

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
        'port': port
    })

@app.route('/api/storage', methods=['GET'])
def storage_info():
    try:
        used_cloud = 0
        file_counts = {'total': 0, 'image': 0, 'video': 0, 'document': 0, 'audio': 0, 'other': 0}
        type_sizes = {'image': 0, 'video': 0, 'document': 0, 'audio': 0, 'other': 0}

        for fname in os.listdir(STORAGE_DIR):
            fpath = os.path.join(STORAGE_DIR, fname)
            if os.path.isfile(fpath):
                sz = os.path.getsize(fpath)
                used_cloud += sz
                ftype = get_file_type(fname)
                if ftype in file_counts:
                    file_counts[ftype] += 1
                    type_sizes[ftype] += sz
                else:
                    file_counts['other'] += 1
                    type_sizes['other'] += sz
                file_counts['total'] += 1

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
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# 원격 Git 업데이트 확인 API (백그라운드 감지용)
@app.route('/api/system/check-update', methods=['GET'])
def check_update():
    import subprocess
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

        has_update = (local_hash != remote_hash)
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

# 웹 UI에서 직접 최신 코드로 업데이트하는 API (Git 기반)
@app.route('/api/system/update', methods=['POST'])
def system_update():
    import subprocess
    try:
        # git pull 실행
        result = subprocess.run(
            ['git', 'pull', 'origin', 'main'],
            cwd=BASE_DIR,
            capture_output=True,
            text=True,
            timeout=30
        )
        output = result.stdout + result.stderr
        is_already_latest = "Already up to date." in output or "이미 최신 상태입니다" in output
        return jsonify({
            'success': result.returncode == 0,
            'output': output.strip(),
            'alreadyLatest': is_already_latest
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

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
                'percent': pct
            }
    except Exception:
        pass

    try:
        out = subprocess.check_output(['sysctl', '-n', 'hw.memsize'], text=True).strip()
        total_b = int(out)
        used_b = int(total_b * 0.45)
        return {
            'totalFormatted': format_size(total_b),
            'usedFormatted': format_size(used_b),
            'freeFormatted': format_size(total_b - used_b),
            'totalBytes': total_b,
            'usedBytes': used_b,
            'percent': 45.0
        }
    except Exception:
        return {
            'totalFormatted': '기기 기본값',
            'usedFormatted': '정상',
            'freeFormatted': '충분함',
            'totalBytes': 0,
            'usedBytes': 0,
            'percent': 35.0
        }

def get_cpu_info():
    cores = os.cpu_count() or 4
    load = [0.0, 0.0, 0.0]
    if hasattr(os, 'getloadavg'):
        try:
            load = list(os.getloadavg())
        except Exception:
            pass
    calc_pct = min(100.0, max(5.0, round((load[0] / cores) * 100, 1)))
    return {
        'cores': cores,
        'load1': round(load[0], 2),
        'load5': round(load[1], 2),
        'load15': round(load[2], 2),
        'percent': calc_pct
    }

def get_battery_info():
    try:
        res = subprocess.run(['termux-battery-status'], capture_output=True, text=True, timeout=2)
        if res.returncode == 0:
            bdata = json.loads(res.stdout)
            return {
                'supported': True,
                'percentage': bdata.get('percentage', 100),
                'plugged': bdata.get('plugged', 'UNPLUGGED'),
                'status': bdata.get('status', 'DISCHARGING'),
                'temperature': round(bdata.get('temperature', 25.0), 1),
                'health': bdata.get('health', 'GOOD')
            }
    except Exception:
        pass
    return {
        'supported': False,
        'percentage': None,
        'plugged': '전원 상시 연결',
        'status': '안정',
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
def get_dashboard_data():
    try:
        port = int(os.environ.get('PORT', 3000))
        total, used, free = shutil.disk_usage(STORAGE_DIR)
        disk_pct = round((used / total) * 100, 1) if total > 0 else 0

        # 파일 통계
        file_counts = {'total': 0, 'image': 0, 'video': 0, 'document': 0, 'audio': 0, 'other': 0}
        used_cloud = 0
        for fname in os.listdir(STORAGE_DIR):
            fpath = os.path.join(STORAGE_DIR, fname)
            if os.path.isfile(fpath):
                sz = os.path.getsize(fpath)
                used_cloud += sz
                ftype = get_file_type(fname)
                if ftype in file_counts:
                    file_counts[ftype] += 1
                else:
                    file_counts['other'] += 1
                file_counts['total'] += 1

        is_termux = os.path.exists('/data/data/com.termux') or 'com.termux' in os.environ.get('PREFIX', '')

        return jsonify({
            'success': True,
            'version': APP_VERSION,
            'runtime': f"Python {platform.python_version()} (Flask)",
            'osName': f"{'Android (Termux)' if is_termux else platform.system()} {platform.machine()}",
            'pid': os.getpid(),
            'uptime': get_uptime_info(),
            'cpu': get_cpu_info(),
            'memory': get_system_memory(),
            'battery': get_battery_info(),
            'disk': {
                'totalFormatted': format_size(total),
                'usedFormatted': format_size(used),
                'freeFormatted': format_size(free),
                'percent': disk_pct,
                'cloudUsedFormatted': format_size(used_cloud),
                'cloudFilesCount': file_counts['total']
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
    # DEBUG 모드 지원 (기본 True로 설정하여 파일 수정 시 서버가 자동으로 리로드되도록 함)
    is_debug = os.environ.get('DEBUG', 'true').lower() in ['true', '1', 'yes']
    local_ip = get_local_ip()
    print("==================================================")
    print(" ☁️   iCloud Personal Server Started!")
    print(f" 📂  저장소 경로: {STORAGE_DIR}")
    print(f" 📱  스마트폰 자체 접속 : http://localhost:{port}")
    print(f" 💻  동일 와이파이 접속 : http://{local_ip}:{port}")
    print(f" 🔄  코드 자동 반영   : {'활성화' if is_debug else '비활성화'}")
    print("==================================================")
    app.run(host='0.0.0.0', port=port, debug=is_debug, use_reloader=is_debug)
