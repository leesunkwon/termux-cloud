"""Confined file APIs. Hidden files and symlinks are never exposed."""
import hashlib
import io
import json
import mimetypes
import os
import shutil
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

from flask import abort, jsonify, request, send_file
from werkzeug.exceptions import HTTPException

try:
    from PIL import Image, ImageOps
except ImportError:
    Image = None


def register_files(app, storage_dir, get_type, is_text, format_size):
    root = Path(storage_dir).resolve()
    trash = root / '.pulse-trash'
    cache = root / '.pulse-thumbnails'
    mutation = threading.Lock()
    app.extensions['pulse_file_lock'] = mutation
    thumb_lock = threading.Lock()
    text_limit = 2 * 1024 * 1024

    def path_for(relative='', allow_root=False):
        if not isinstance(relative, str) or '\x00' in relative or '\\' in relative:
            abort(400, description='올바르지 않은 파일 경로입니다.')
        p = Path(relative)
        if p.is_absolute() or any(x.startswith('.') for x in p.parts):
            abort(400, description='숨김 경로나 상위 경로는 사용할 수 없습니다.')
        target = root / p
        if target == root and not allow_root:
            abort(400, description='파일 또는 폴더를 선택하세요.')
        current = root
        for part in p.parts:
            current = current / part
            if current.is_symlink():
                abort(400, description='심볼릭 링크는 지원하지 않습니다.')
        if target.resolve() != root and root not in target.resolve().parents:
            abort(400, description='저장소 밖으로 접근할 수 없습니다.')
        return target

    def private_dir(path):
        if path.is_symlink():
            abort(400, description='내부 저장 폴더가 올바르지 않습니다.')
        path.mkdir(mode=0o700, exist_ok=True)
        return path

    def data():
        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            abort(400, description='JSON 요청이 필요합니다.')
        return body

    def entry(p):
        st = p.stat()
        rel = p.relative_to(root).as_posix()
        folder = p.is_dir()
        url = quote(rel, safe='/')
        return dict(name=p.name, path=rel, size=0 if folder else st.st_size,
                    sizeFormatted='폴더' if folder else format_size(st.st_size),
                    modified=int(st.st_mtime * 1000),
                    dateFormatted=datetime.fromtimestamp(st.st_mtime).strftime('%Y-%m-%d %H:%M'),
                    type='folder' if folder else get_type(p.name), isText=not folder and is_text(p.name),
                    extension=p.suffix.lstrip('.').lower(),
                    previewUrl='/api/preview/' + url, downloadUrl='/api/download/' + url,
                    thumbnailUrl='/api/thumbnail/' + url if Image and p.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp') else None)

    @app.errorhandler(HTTPException)
    def http_error(error):
        if request.path.startswith('/api/'):
            return jsonify(success=False, error=error.description), error.code
        return error

    @app.errorhandler(OSError)
    def file_error(error):
        app.logger.warning('파일 작업 실패: %s', error)
        return jsonify(success=False, error='파일 작업에 실패했습니다. 저장 공간과 접근 권한을 확인하세요.'), 409

    @app.get('/api/files')
    def files():
        folder = path_for(request.args.get('path', ''), True)
        if not folder.is_dir():
            abort(404, description='폴더를 찾을 수 없습니다.')
        try:
            page = max(1, int(request.args.get('page', 1)))
            limit = min(100, max(1, int(request.args.get('limit', 60))))
        except ValueError:
            abort(400, description='페이지 번호가 올바르지 않습니다.')
        query = request.args.get('q', '').casefold()
        kind = request.args.get('type', 'all')
        result = []
        counts = dict(all=0, folder=0, image=0, video=0, document=0, audio=0, other=0)
        for p in folder.iterdir():
            if p.name.startswith('.') or p.is_symlink():
                continue
            try:
                if not p.is_file() and not p.is_dir():
                    continue
                item = entry(p)
                counts['all'] += 1
                counts[item['type'] if item['type'] in counts else 'other'] += 1
                if kind == 'all':
                    match = True
                elif kind == 'other':
                    match = item['type'] not in ('image', 'video', 'document', 'audio', 'folder')
                else:
                    match = item['type'] == kind
                if match and query in p.name.casefold():
                    result.append(item)
            except OSError:
                continue
        order = request.args.get('sort', 'modified-desc')
        field = order.split('-')[0]
        field = field if field in ('modified', 'name', 'size') else 'modified'
        result.sort(key=lambda f: f[field].casefold() if field == 'name' else f[field], reverse=order.endswith('desc'))
        result.sort(key=lambda f: f['type'] != 'folder')
        total = len(result)
        page = min(page, max(1, (total + limit - 1) // limit))
        return jsonify(success=True, files=result[(page - 1) * limit:page * limit], total=total,
                       page=page, pages=max(1, (total + limit - 1) // limit), counts=counts)

    @app.post('/api/upload')
    def upload():
        folder = path_for(request.args.get('path', ''), True)
        if not folder.is_dir():
            abort(404, description='업로드 폴더가 없습니다.')
        uploads = request.files.getlist('files')
        if not uploads or len(uploads) > 100:
            abort(400, description='1~100개의 파일을 선택하세요.')
        saved = []
        with mutation:
            for obj in uploads:
                name = Path(obj.filename or '').name.strip()
                if not name or name.startswith('.'):
                    abort(400, description='숨김 파일 또는 빈 파일명은 업로드할 수 없습니다.')
                target = path_for((folder.relative_to(root) / name).as_posix())
                n = 1
                original = target
                while target.exists():
                    target = original.with_name(f'{original.stem} ({n}){original.suffix}')
                    n += 1
                temp = folder / ('.upload-' + uuid.uuid4().hex)
                try:
                    obj.save(temp)
                    os.replace(temp, target)
                finally:
                    temp.unlink(missing_ok=True)
                saved.append(entry(target))
        return jsonify(success=True, uploaded=saved)

    @app.get('/api/download/<path:filename>')
    def download(filename):
        p = path_for(filename)
        if not p.is_file():
            abort(404, description='파일이 없습니다.')
        return send_file(p, as_attachment=True, download_name=p.name)

    @app.get('/api/preview/<path:filename>')
    def preview(filename):
        p = path_for(filename)
        if not p.is_file():
            abort(404, description='파일이 없습니다.')
        if is_text(p.name):
            if p.stat().st_size > text_limit:
                abort(413, description='텍스트 미리보기와 편집은 2MB 이하만 지원합니다. 다운로드를 이용하세요.')
            return send_file(p, mimetype='text/plain; charset=utf-8')
        mime = mimetypes.guess_type(p.name)[0] or 'application/octet-stream'
        # Never render executable uploaded documents in the application's origin.
        return send_file(p, mimetype=mime, as_attachment=mime in ('image/svg+xml', 'text/html', 'application/xhtml+xml'))

    @app.get('/api/thumbnail/<path:filename>')
    def thumbnail(filename):
        p = path_for(filename)
        if not Image or not p.is_file() or p.suffix.lower() not in ('.jpg', '.jpeg', '.png', '.webp'):
            abort(404)
        st = p.stat()
        if st.st_size > 30 * 1024 * 1024:
            abort(413, description='큰 이미지는 미리보기를 이용하세요.')
        key = hashlib.sha256(f'{p}:{st.st_mtime_ns}:{st.st_size}'.encode()).hexdigest()
        with thumb_lock:
            private_dir(cache)
            target = cache / (key + '.jpg')
            if not target.exists():
                try:
                    with Image.open(p) as img:
                        if img.width * img.height > 25_000_000:
                            abort(413)
                        img.draft('RGB', (320, 320))
                        img.thumbnail((320, 320))
                        img = ImageOps.exif_transpose(img).convert('RGB')
                        buffer = io.BytesIO()
                        img.save(buffer, format='JPEG', quality=75)
                        target.write_bytes(buffer.getvalue())
                    old = sorted(cache.glob('*.jpg'), key=lambda f: f.stat().st_mtime)
                    for obsolete in old[:-200]:
                        obsolete.unlink(missing_ok=True)
                except (OSError, ValueError, Image.DecompressionBombError):
                    abort(415, description='썸네일을 만들 수 없는 이미지입니다.')
            response = send_file(target, mimetype='image/jpeg')
        response.headers['Cache-Control'] = 'private, max-age=300'
        return response

    @app.post('/api/files/create')
    @app.post('/api/files/save')
    def save():
        body = data()
        p = path_for(body.get('filename', ''))
        content = body.get('content', '')
        if not isinstance(content, str) or len(content.encode('utf-8')) > text_limit:
            abort(413, description='편집 가능한 텍스트 크기는 2MB입니다.')
        with mutation:
            if request.path.endswith('/create') and p.exists():
                abort(409, description='같은 이름의 파일이 있습니다.')
            if not p.parent.is_dir():
                abort(404, description='상위 폴더가 없습니다.')
            temp = p.parent / ('.save-' + uuid.uuid4().hex)
            try:
                temp.write_text(content, encoding='utf-8')
                os.replace(temp, p)
            finally:
                temp.unlink(missing_ok=True)
        return jsonify(success=True, filename=p.relative_to(root).as_posix())

    @app.post('/api/folders')
    def mkdir():
        p = path_for(data().get('path', ''))
        with mutation:
            if p.exists():
                abort(409, description='같은 이름이 있습니다.')
            p.mkdir()
        return jsonify(success=True)

    @app.post('/api/files/move')
    def move():
        body = data()
        src, dst = path_for(body.get('source', '')), path_for(body.get('destination', ''))
        with mutation:
            if not src.exists():
                abort(404, description='원본 항목이 없습니다.')
            if dst.exists() or not dst.parent.is_dir() or src in dst.parents:
                abort(409, description='대상 이름이 이미 있거나 이동할 수 없는 폴더입니다.')
            src.rename(dst)
        return jsonify(success=True)

    @app.delete('/api/files/<path:filename>')
    def remove(filename):
        src = path_for(filename)
        with mutation:
            if not src.exists():
                abort(404, description='항목이 없습니다.')
            private_dir(trash)
            item = trash / uuid.uuid4().hex
            item.mkdir(mode=0o700)
            try:
                (item / 'metadata.json').write_text(json.dumps({'path': filename, 'deleted': time.time()}))
                src.rename(item / 'content')
            except OSError:
                shutil.rmtree(item)
                raise
        return jsonify(success=True, deleted=filename, trashId=item.name)

    @app.get('/api/trash')
    def trash_list():
        result = []
        if trash.exists():
            private_dir(trash)
            for item in trash.iterdir():
                if item.is_symlink() or not item.is_dir():
                    continue
                try:
                    meta = json.loads((item / 'metadata.json').read_text())
                    result.append(dict(id=item.name, **meta))
                except (OSError, ValueError):
                    continue
        result.sort(key=lambda x: x['deleted'], reverse=True)
        return jsonify(success=True, items=result)

    @app.post('/api/trash/<item_id>/restore')
    def restore(item_id):
        if len(item_id) != 32 or any(c not in '0123456789abcdef' for c in item_id):
            abort(400)
        with mutation:
            private_dir(trash)
            item = trash / item_id
            if not item.is_dir() or item.is_symlink():
                abort(404)
            meta = json.loads((item / 'metadata.json').read_text())
            dst = path_for(meta['path'])
            if dst.exists() or not dst.parent.is_dir():
                abort(409, description='원래 폴더를 먼저 복원하거나 같은 이름의 항목을 이동하세요.')
            (item / 'content').rename(dst)
            shutil.rmtree(item)
        return jsonify(success=True)

    @app.delete('/api/trash/<item_id>')
    def purge(item_id):
        if len(item_id) != 32 or any(c not in '0123456789abcdef' for c in item_id):
            abort(400)
        with mutation:
            private_dir(trash)
            item = trash / item_id
            if not item.is_dir() or item.is_symlink():
                abort(404)
            shutil.rmtree(item)
        return jsonify(success=True)

    @app.delete('/api/trash')
    def empty_trash():
        with mutation:
            if trash.exists():
                private_dir(trash)
                for item in list(trash.iterdir()):
                    if item.is_dir() and not item.is_symlink():
                        shutil.rmtree(item)
        return jsonify(success=True)

    @app.post('/api/rename')
    def rename_item():
        body = data()
        src = path_for(body.get('oldPath') or '')
        new_name = body.get('newName', '')
        if not isinstance(new_name, str) or not new_name.strip():
            abort(400, description='새 이름을 입력하세요.')
        new_name = new_name.strip()
        if '/' in new_name or '\\' in new_name or new_name.startswith('.'):
            abort(400, description='올바르지 않은 이름입니다.')
        parent = '' if src.parent == root else src.parent.relative_to(root).as_posix()
        dest = f'{parent}/{new_name}' if parent else new_name
        dst = path_for(dest)
        with mutation:
            if not src.exists():
                abort(404, description='항목이 없습니다.')
            if dst.exists():
                abort(409, description='같은 이름이 있습니다.')
            src.rename(dst)
        return jsonify(success=True, path=dst.relative_to(root).as_posix())

    @app.post('/api/batch/delete')
    def batch_delete():
        paths = data().get('paths', [])
        if not isinstance(paths, list) or not paths or len(paths) > 100:
            abort(400, description='삭제할 항목을 선택하세요.')
        deleted = []
        with mutation:
            private_dir(trash)
            for rel in paths:
                src = path_for(rel)
                if not src.exists():
                    continue
                item = trash / uuid.uuid4().hex
                item.mkdir(mode=0o700)
                try:
                    (item / 'metadata.json').write_text(json.dumps({
                        'path': src.relative_to(root).as_posix(),
                        'deleted': time.time()
                    }))
                    src.rename(item / 'content')
                    deleted.append(rel)
                except OSError:
                    shutil.rmtree(item, ignore_errors=True)
                    raise
        return jsonify(success=True, deleted=deleted)

    @app.post('/api/move')
    def batch_move():
        body = data()
        paths = body.get('paths', [])
        dest_rel = body.get('destination', '') or ''
        if not isinstance(paths, list) or not paths:
            abort(400, description='이동할 항목을 선택하세요.')
        dest_dir = path_for(dest_rel, True)
        if not dest_dir.is_dir():
            abort(404, description='대상 폴더가 없습니다.')
        with mutation:
            for rel in paths:
                src = path_for(rel)
                if not src.exists():
                    abort(404, description='원본 항목이 없습니다.')
                dst = dest_dir / src.name
                if dst.exists() or src == dest_dir or (src.is_dir() and src in dest_dir.parents):
                    abort(409, description='대상 이름이 이미 있거나 이동할 수 없는 폴더입니다.')
                src.rename(dst)
        return jsonify(success=True)
