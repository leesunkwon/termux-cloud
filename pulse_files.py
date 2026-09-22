"""Confined file APIs. Hidden files and symlinks are never exposed."""
import base64
import hashlib
import io
import json
import mimetypes
import os
import secrets
import shutil
import subprocess
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
    meta_file = Path(__file__).resolve().parent / '.pulse' / 'metadata.json'
    shares_file = Path(__file__).resolve().parent / '.pulse' / 'shares.json'
    mutation = threading.Lock()
    app.extensions['pulse_file_lock'] = mutation
    thumb_lock = threading.Lock()
    text_limit = 2 * 1024 * 1024

    def load_metadata():
        try:
            return json.loads(meta_file.read_text(encoding='utf-8'))
        except (FileNotFoundError, ValueError, OSError):
            return {}

    def save_metadata(d):
        meta_file.parent.mkdir(mode=0o700, exist_ok=True)
        meta_file.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding='utf-8')

    def get_file_meta(rel):
        return load_metadata().get(rel, {})

    def load_shares():
        try:
            return json.loads(shares_file.read_text(encoding='utf-8'))
        except (FileNotFoundError, ValueError, OSError):
            return {}

    def save_shares(d):
        shares_file.parent.mkdir(mode=0o700, exist_ok=True)
        shares_file.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding='utf-8')

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
        meta = get_file_meta(rel)
        return dict(name=p.name, path=rel, size=0 if folder else st.st_size,
                    sizeFormatted='폴더' if folder else format_size(st.st_size),
                    modified=int(st.st_mtime * 1000),
                    dateFormatted=datetime.fromtimestamp(st.st_mtime).strftime('%Y-%m-%d %H:%M'),
                    type='folder' if folder else get_type(p.name), isText=not folder and is_text(p.name),
                    extension=p.suffix.lstrip('.').lower(),
                    favorite=bool(meta.get('favorite', False)),
                    tags=meta.get('tags', []),
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
        counts = dict(all=0, folder=0, image=0, video=0, document=0, audio=0, other=0, favorite=0)
        for p in folder.iterdir():
            if p.name.startswith('.') or p.is_symlink():
                continue
            try:
                if not p.is_file() and not p.is_dir():
                    continue
                item = entry(p)
                counts['all'] += 1
                counts[item['type'] if item['type'] in counts else 'other'] += 1
                if item.get('favorite'):
                    counts['favorite'] += 1
                if kind == 'all':
                    match = True
                elif kind == 'favorite':
                    match = bool(item.get('favorite'))
                elif kind.startswith('tag:'):
                    target_tag = kind.split(':', 1)[1]
                    match = target_tag in item.get('tags', [])
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

    # ── Pulse Photos API ──────────────────────────────────────────────────────
    IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.heic', '.heif', '.avif'}

    @app.get('/api/photos')
    def photos():
        """보관함 전체를 재귀 탐색하여 이미지 파일을 날짜(월)별로 그룹화해 반환."""
        items = []
        for p in sorted(root.rglob('*'), key=lambda f: -f.stat().st_mtime if f.is_file() else 0):
            if not p.is_file() or p.is_symlink():
                continue
            if any(part.startswith('.') for part in p.parts):
                continue
            if p.suffix.lower() not in IMAGE_EXTS:
                continue
            try:
                st = p.stat()
                rel = p.relative_to(root).as_posix()
                url = quote(rel, safe='/')
                dt = datetime.fromtimestamp(st.st_mtime)
                items.append({
                    'name': p.name,
                    'path': rel,
                    'modified': int(st.st_mtime * 1000),
                    'dateLabel': dt.strftime('%Y년 %m월'),
                    'dateSortKey': dt.strftime('%Y-%m'),
                    'dateFormatted': dt.strftime('%Y-%m-%d'),
                    'sizeFormatted': format_size(st.st_size),
                    'previewUrl': '/api/preview/' + url,
                    'downloadUrl': '/api/download/' + url,
                    'thumbnailUrl': ('/api/thumbnail/' + url
                                     if Image and p.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp')
                                     else '/api/preview/' + url),
                })
            except OSError:
                continue
        # 날짜(월) 기준 내림차순 그루핑
        groups = {}
        for item in sorted(items, key=lambda x: x['modified'], reverse=True):
            key = item['dateSortKey']
            if key not in groups:
                groups[key] = {'label': item['dateLabel'], 'key': key, 'photos': []}
            groups[key]['photos'].append(item)
        result = list(groups.values())
        total = sum(len(g['photos']) for g in result)
        return jsonify(success=True, groups=result, total=total)

    # ── ZIP Download API ──────────────────────────────────────────────────────
    import zipfile

    @app.post('/api/zip-download')
    def zip_download():
        """선택한 파일/폴더 경로 배열을 즉시 ZIP으로 묶어 스트리밍 반환."""
        paths = data().get('paths', [])
        if not isinstance(paths, list) or not paths or len(paths) > 200:
            abort(400, description='다운로드할 파일을 선택하세요.')
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED, allowZip64=True) as zf:
            for rel in paths:
                try:
                    p = path_for(rel)
                except Exception:
                    continue
                if p.is_file():
                    zf.write(p, p.name)
                elif p.is_dir():
                    for child in p.rglob('*'):
                        if child.is_file() and not child.is_symlink() and not any(
                                part.startswith('.') for part in child.relative_to(root).parts):
                            arc_name = child.relative_to(p.parent).as_posix()
                            zf.write(child, arc_name)
        buf.seek(0)
        download_name = 'Pulse-선택파일.zip' if len(paths) > 1 else (Path(paths[0]).stem + '.zip')
        return send_file(buf, mimetype='application/zip',
                         as_attachment=True, download_name=download_name)

    # ── ZIP Unzip API ─────────────────────────────────────────────────────────

    @app.post('/api/unzip')
    def unzip():
        """지정한 .zip 파일을 같은 폴더에 압축 해제."""
        body = data()
        zip_rel = body.get('path', '')
        p = path_for(zip_rel)
        if not p.is_file() or p.suffix.lower() != '.zip':
            abort(400, description='.zip 파일만 압축 해제할 수 있습니다.')
        dest_dir = p.parent
        extracted = []
        with mutation:
            try:
                with zipfile.ZipFile(p, 'r') as zf:
                    # 경로 순회 공격 방지: '..' 포함 항목 차단
                    safe_members = []
                    for member in zf.infolist():
                        member_path = Path(member.filename)
                        if '..' in member_path.parts or member_path.is_absolute():
                            continue
                        safe_members.append(member)
                    for member in safe_members:
                        target = dest_dir / member.filename
                        # 저장소 밖 탈출 방지
                        try:
                            target.resolve().relative_to(root.resolve())
                        except ValueError:
                            continue
                        zf.extract(member, dest_dir)
                        extracted.append(member.filename)
            except zipfile.BadZipFile:
                abort(400, description='손상된 ZIP 파일입니다.')
        return jsonify(success=True, extracted=len(extracted),
                       folder=dest_dir.relative_to(root).as_posix())

    # ── Favorites & Tags API ──────────────────────────────────────────────────

    @app.post('/api/files/favorite')
    def toggle_favorite():
        """파일/폴더 즐겨찾기 토글 또는 명시적 설정."""
        body = data()
        rel = body.get('path', '')
        p = path_for(rel)
        all_meta = load_metadata()
        file_meta = all_meta.get(rel, {})
        new_fav = body.get('favorite')
        if new_fav is None:
            new_fav = not file_meta.get('favorite', False)
        file_meta['favorite'] = bool(new_fav)
        all_meta[rel] = file_meta
        with mutation:
            save_metadata(all_meta)
        return jsonify(success=True, path=rel, favorite=file_meta['favorite'])

    @app.post('/api/files/tags')
    def manage_tags():
        """파일/폴더의 태그 추가, 제거 또는 전체 교체."""
        body = data()
        rel = body.get('path', '')
        p = path_for(rel)
        action = body.get('action', 'toggle')
        tag = (body.get('tag') or '').strip().lower()
        all_meta = load_metadata()
        file_meta = all_meta.get(rel, {})
        current_tags = list(file_meta.get('tags', []))

        if action == 'set':
            new_tags = [t.strip().lower() for t in body.get('tags', []) if isinstance(t, str) and t.strip()]
            current_tags = list(dict.fromkeys(new_tags))[:10]
        elif action == 'add':
            if tag and tag not in current_tags and len(current_tags) < 10:
                current_tags.append(tag)
        elif action == 'remove':
            if tag in current_tags:
                current_tags.remove(tag)
        elif action == 'toggle':
            if tag in current_tags:
                current_tags.remove(tag)
            elif tag and len(current_tags) < 10:
                current_tags.append(tag)

        file_meta['tags'] = current_tags
        all_meta[rel] = file_meta
        with mutation:
            save_metadata(all_meta)
        return jsonify(success=True, path=rel, tags=current_tags)

    @app.get('/api/tags/all')
    def get_all_tags():
        """전체 보관함에서 사용 중인 태그 목록 및 파일 수."""
        all_meta = load_metadata()
        tag_counts = {}
        for rel, meta in all_meta.items():
            for t in meta.get('tags', []):
                tag_counts[t] = tag_counts.get(t, 0) + 1
        return jsonify(success=True, tags=tag_counts)

    # ── Share Links API ───────────────────────────────────────────────────────

    @app.post('/api/shares')
    def create_share():
        """공유 링크 생성 (만료시간, 다운로드 횟수 제한 지원)."""
        body = data()
        rel = body.get('path', '')
        p = path_for(rel)
        if not p.is_file():
            abort(404, description='공유할 파일을 찾을 수 없습니다.')
        expire_hours = int(body.get('expireHours', 24))
        max_downloads = int(body.get('maxDownloads', 0))

        share_id = secrets.token_hex(4)
        created_at = int(time.time())
        expires_at = (created_at + expire_hours * 3600) if expire_hours > 0 else None

        shares = load_shares()
        shares[share_id] = {
            'id': share_id,
            'path': rel,
            'filename': p.name,
            'created': created_at,
            'expires': expires_at,
            'maxDownloads': max_downloads if max_downloads > 0 else None,
            'downloads': 0
        }
        with mutation:
            save_shares(shares)

        expires_str = datetime.fromtimestamp(expires_at).strftime('%Y-%m-%d %H:%M') if expires_at else '무제한'
        return jsonify(success=True, shareId=share_id, url=f'/s/{share_id}',
                       filename=p.name, expires=expires_str, maxDownloads=max_downloads)

    @app.get('/api/shares')
    def list_shares():
        """현재 활성화된 공유 링크 목록 조회."""
        shares = load_shares()
        now = time.time()
        result = []
        for sid, s in list(shares.items()):
            is_expired = s.get('expires') and now > s['expires']
            is_limit_reached = s.get('maxDownloads') and s.get('downloads', 0) >= s['maxDownloads']
            result.append({
                'id': sid,
                'path': s['path'],
                'filename': s.get('filename', Path(s['path']).name),
                'created': s.get('created', 0),
                'createdFormatted': datetime.fromtimestamp(s.get('created', now)).strftime('%Y-%m-%d %H:%M'),
                'expires': s.get('expires'),
                'expiresFormatted': datetime.fromtimestamp(s['expires']).strftime('%Y-%m-%d %H:%M') if s.get('expires') else '무제한',
                'maxDownloads': s.get('maxDownloads'),
                'downloads': s.get('downloads', 0),
                'active': not (is_expired or is_limit_reached),
                'url': f'/s/{sid}'
            })
        result.sort(key=lambda x: x['created'], reverse=True)
        return jsonify(success=True, shares=result)

    @app.delete('/api/shares/<share_id>')
    def revoke_share(share_id):
        """공유 링크 즉각 삭제/만료."""
        shares = load_shares()
        if share_id in shares:
            del shares[share_id]
            with mutation:
                save_shares(shares)
        return jsonify(success=True)

    # ── Public Share Page & Direct Download ───────────────────────────────────
    from html import escape as html_escape

    @app.get('/s/<share_id>')
    def public_share_page(share_id):
        """인증 없이 누구나 열어볼 수 있는 Apple HIG 스타일 공개 파일 다운로드 웹페이지."""
        shares = load_shares()
        s = shares.get(share_id)
        now = time.time()

        is_invalid = False
        error_msg = ''
        if not s:
            is_invalid = True
            error_msg = '유효하지 않거나 삭제된 공유 링크입니다.'
        elif s.get('expires') and now > s['expires']:
            is_invalid = True
            error_msg = '이 공유 링크는 만료되었습니다.'
        elif s.get('maxDownloads') and s.get('downloads', 0) >= s['maxDownloads']:
            is_invalid = True
            error_msg = '다운로드 가능 횟수를 초과하여 마감된 링크입니다.'
        else:
            try:
                p = path_for(s['path'])
                if not p.is_file():
                    is_invalid = True
                    error_msg = '원본 파일이 이동되었거나 삭제되었습니다.'
            except Exception:
                is_invalid = True
                error_msg = '파일을 찾을 수 없습니다.'

        if is_invalid:
            return f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pulse — 공유 링크 만료</title>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Pretendard", sans-serif; }}
    body {{ background: #0c0d11; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }}
    .card {{ background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; padding: 40px 32px; max-width: 440px; width: 100%; text-align: center; backdrop-filter: blur(20px); }}
    .icon {{ font-size: 56px; margin-bottom: 16px; }}
    h1 {{ font-size: 20px; font-weight: 700; margin-bottom: 10px; color: #ff5252; }}
    p {{ font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.6; margin-bottom: 24px; }}
    .brand {{ font-size: 12px; color: rgba(255,255,255,0.3); letter-spacing: 0.05em; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔒</div>
    <h1>접근할 수 없는 링크</h1>
    <p>{html_escape(error_msg)}</p>
    <div class="brand">⚡ Pulse Cloud Protected Link</div>
  </div>
</body>
</html>""", 410

        p = path_for(s['path'])
        st = p.stat()
        size_str = format_size(st.st_size)
        filename = html_escape(s.get('filename', p.name))
        dl_count = s.get('downloads', 0)
        max_dl = s.get('maxDownloads')
        dl_info = f"다운로드: {dl_count}회" + (f" / 최대 {max_dl}회" if max_dl else "")
        expires_str = datetime.fromtimestamp(s['expires']).strftime('%Y-%m-%d %H:%M까지 유효') if s.get('expires') else '기한 제한 없음'

        ext = p.suffix.lstrip('.').upper() or 'FILE'
        return f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{filename} — Pulse 공유</title>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Pretendard", sans-serif; }}
    body {{
      background: radial-gradient(circle at top, #1e2538 0%, #0d0f17 100%);
      color: #fff; min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center; padding: 24px;
    }}
    .share-card {{
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 24px;
      padding: 44px 36px;
      max-width: 480px; width: 100%;
      text-align: center;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
    }}
    .file-badge {{
      display: inline-block;
      width: 76px; height: 92px;
      background: linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06));
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 14px;
      margin-bottom: 20px;
      position: relative;
      box-shadow: 0 12px 30px rgba(0,0,0,0.3);
    }}
    .file-badge-ext {{
      position: absolute; bottom: 12px; left: 0; right: 0;
      font-size: 11px; font-weight: 800; letter-spacing: 0.08em;
      color: #79bbff; text-transform: uppercase;
    }}
    .file-badge-icon {{
      font-size: 30px; margin-top: 14px; display: block;
    }}
    .file-title {{
      font-size: 20px; font-weight: 700; word-break: break-all;
      margin-bottom: 8px; line-height: 1.35;
    }}
    .file-meta {{
      font-size: 13.5px; color: rgba(255,255,255,0.65);
      margin-bottom: 24px; display: flex; align-items: center; justify-content: center; gap: 8px;
    }}
    .meta-chip {{
      background: rgba(255,255,255,0.08); padding: 4px 10px; border-radius: 12px;
    }}
    .dl-btn {{
      display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; padding: 15px 20px;
      background: #0071e3; color: #fff;
      border: none; border-radius: 14px;
      font-size: 15px; font-weight: 600; text-decoration: none;
      box-shadow: 0 8px 24px rgba(0, 113, 227, 0.45);
      transition: all 0.2s ease;
      cursor: pointer;
    }}
    .dl-btn:hover {{ background: #0077ed; transform: translateY(-1px); box-shadow: 0 12px 30px rgba(0, 113, 227, 0.55); }}
    .dl-btn:active {{ transform: scale(0.98); }}
    .footer-notes {{
      margin-top: 22px; font-size: 12px; color: rgba(255,255,255,0.4);
      display: flex; justify-content: space-between;
    }}
    .brand-tag {{
      margin-top: 24px; font-size: 12px; color: rgba(255,255,255,0.3);
      display: flex; align-items: center; justify-content: center; gap: 6px;
    }}
  </style>
</head>
<body>
  <div class="share-card">
    <div class="file-badge">
      <span class="file-badge-icon">📄</span>
      <span class="file-badge-ext">{html_escape(ext)}</span>
    </div>
    <div class="file-title">{filename}</div>
    <div class="file-meta">
      <span class="meta-chip">{html_escape(size_str)}</span>
      <span class="meta-chip">{html_escape(dl_info)}</span>
    </div>
    <a class="dl-btn" href="/s/{share_id}/download">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
      <span>파일 다운로드</span>
    </a>
    <div class="footer-notes">
      <span>{html_escape(expires_str)}</span>
      <span>보안 암호화 전송</span>
    </div>
  </div>
  <div class="brand-tag">
    <span>⚡ Pulse Cloud</span> · <span>개인 안전 파일 공유</span>
  </div>
</body>
</html>"""

    @app.get('/s/<share_id>/download')
    def public_share_download(share_id):
        """공유 파일 실제 다운로드 스트림 및 카운트 누적."""
        shares = load_shares()
        s = shares.get(share_id)
        now = time.time()
        if not s:
            abort(404, description='유효하지 않은 공유 링크입니다.')
        if s.get('expires') and now > s['expires']:
            abort(410, description='만료된 공유 링크입니다.')
        if s.get('maxDownloads') and s.get('downloads', 0) >= s['maxDownloads']:
            abort(410, description='다운로드 가능 횟수가 만료되었습니다.')
        p = path_for(s['path'])
        if not p.is_file():
            abort(404, description='파일이 없습니다.')

        with mutation:
            s['downloads'] = s.get('downloads', 0) + 1
            shares[share_id] = s
            save_shares(shares)

        return send_file(p, as_attachment=True, download_name=s.get('filename', p.name))

    # ── 📷 Pulse Cam API (v2.4.0) ─────────────────────────────────────────────

    camera_state = {
        'frame': None,
        'time': 0,
        'camera': 0,
        'source': 'none'
    }

    @app.get('/api/camera/status')
    def camera_status():
        """카메라 상태 및 Termux:API 지원 여부 확인."""
        has_termux = shutil.which('termux-camera-photo') is not None
        now = time.time()
        has_feed = bool(camera_state['frame'] and (now - camera_state['time'] < 8.0))
        return jsonify(
            success=True,
            termuxCamera=has_termux,
            hasFeed=has_feed,
            age=round(now - camera_state['time'], 1) if camera_state['time'] else None,
            camera=camera_state['camera'],
            source=camera_state['source']
        )

    @app.post('/api/camera/feed')
    def camera_feed():
        """스마트폰 브로드캐스터로부터 비디오 프레임 수신 (릴레이)."""
        body = data()
        frame_raw = body.get('frame') or body.get('image') or ''
        if not frame_raw:
            abort(400, description='프레임 데이터가 없습니다.')

        if frame_raw.startswith('data:image/'):
            try:
                frame_data = base64.b64decode(frame_raw.split(',', 1)[1])
            except Exception:
                abort(400, description='이미지 디코딩 실패')
        else:
            try:
                frame_data = base64.b64decode(frame_raw)
            except Exception:
                abort(400, description='이미지 디코딩 실패')

        camera_state['frame'] = frame_data
        camera_state['time'] = time.time()
        camera_state['camera'] = int(body.get('camera', 0))
        camera_state['source'] = 'broadcast'
        return jsonify(success=True)

    @app.get('/api/camera/frame')
    def camera_frame():
        """최신 카메라 프레임 반환 (실시간 뷰어용)."""
        now = time.time()
        # 1. 활성 송출기 피드가 있으면 반환
        if camera_state['frame'] and (now - camera_state['time'] < 10.0):
            return send_file(io.BytesIO(camera_state['frame']), mimetype='image/jpeg')

        # 2. 송출기가 없지만 Termux:API 카메라가 있으면 직접 캡처
        if shutil.which('termux-camera-photo'):
            tmp_img = Path('/tmp') / 'pulse_cam_live.jpg'
            try:
                cid = str(camera_state.get('camera', 0))
                subprocess.run(['termux-camera-photo', '-c', cid, str(tmp_img)],
                               capture_output=True, timeout=5)
                if tmp_img.is_file():
                    data_bytes = tmp_img.read_bytes()
                    camera_state['frame'] = data_bytes
                    camera_state['time'] = time.time()
                    camera_state['source'] = 'termux-api'
                    return send_file(io.BytesIO(data_bytes), mimetype='image/jpeg')
            except Exception as ex:
                app.logger.warning('Termux 카메라 캡처 실패: %s', ex)

        abort(404, description='활성 카메라 피드가 없습니다.')

    @app.post('/api/camera/snapshot')
    def camera_snapshot():
        """스냅샷 촬영 후 uploads/Camera/Cam_YYYYMMDD_HHMMSS.jpg에 영구 보관."""
        cam_dir = root / 'Camera'
        cam_dir.mkdir(parents=True, exist_ok=True)

        now_dt = datetime.now()
        filename = f"Cam_{now_dt.strftime('%Y%m%d_%H%M%S')}.jpg"
        target_path = cam_dir / filename

        body = request.get_json(silent=True) or {}
        img_payload = body.get('image') or body.get('frame') or ''
        saved_bytes = None

        # 1. 요청 바디에 직접 프레임이 전달된 경우
        if img_payload and img_payload.startswith('data:image/'):
            try:
                saved_bytes = base64.b64decode(img_payload.split(',', 1)[1])
            except Exception:
                saved_bytes = None

        # 2. 서버 메모리에 최신 송출 프레임이 있는 경우
        if not saved_bytes and camera_state['frame']:
            saved_bytes = camera_state['frame']

        # 3. 위 둘 다 없고 Termux:API가 있는 경우 직접 촬영
        if not saved_bytes and shutil.which('termux-camera-photo'):
            cid = str(body.get('camera', camera_state.get('camera', 0)))
            try:
                subprocess.run(['termux-camera-photo', '-c', cid, str(target_path)],
                               capture_output=True, timeout=8)
                if target_path.is_file():
                    with mutation:
                        file_entry = entry(target_path)
                    return jsonify(
                        success=True,
                        path=file_entry['path'],
                        filename=filename,
                        file=file_entry,
                        message='Termux 카메라로 스냅샷을 촬영하여 Camera 폴더에 저장했습니다.'
                    )
            except Exception as ex:
                abort(500, description=f'Termux 카메라 촬영 실패: {ex}')

        if not saved_bytes:
            abort(400, description='저장할 카메라 화면 데이터가 없습니다.')

        with mutation:
            target_path.write_bytes(saved_bytes)
            file_entry = entry(target_path)

        return jsonify(
            success=True,
            path=file_entry['path'],
            filename=filename,
            file=file_entry,
            message='스냅샷을 성공적으로 Camera 폴더에 저장했습니다.'
        )

