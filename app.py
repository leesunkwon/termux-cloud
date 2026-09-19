import os
import mimetypes
import shutil
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, send_file, abort
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='public', static_url_path='')

# 저장 경로 설정 (환경변수로 변경 가능: 예: STORAGE_PATH=/sdcard/MyCloud)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_STORAGE_DIR = os.path.join(BASE_DIR, 'uploads')
STORAGE_DIR = os.environ.get('STORAGE_PATH', DEFAULT_STORAGE_DIR)

# 저장 폴더가 없으면 생성
os.makedirs(STORAGE_DIR, exist_ok=True)

# 2GB 최대 업로드 제한 (필요시 조절 가능)
app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024 * 1024

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

# 웹 UI에서 직접 최신 코드로 업데이트하는 API (Git 기반)
@app.route('/api/system/update', methods=['POST'])
def system_update():
    import subprocess
    try:
        # git pull 실행
        result = subprocess.run(
            ['git', 'pull'],
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
