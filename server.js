const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const mime = require('mime-types');

const app = express();
const PORT = process.env.PORT || 3000;

// 저장 디렉토리 설정 (기본값: ./uploads, 환경변수로 지정 가능)
const DEFAULT_STORAGE = path.join(__dirname, 'uploads');
const STORAGE_DIR = process.env.STORAGE_PATH || DEFAULT_STORAGE;

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Multer 파일 저장 설정 (한글 파일명 및 중복 처리)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, STORAGE_DIR);
  },
  filename: (req, file, cb) => {
    // Multer의 latin1 인코딩 버그 복원 (UTF-8)
    let originalname = file.originalname;
    try {
      originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch (e) {
      originalname = file.originalname;
    }
    originalname = path.basename(originalname).trim();
    if (!originalname) {
      originalname = `upload_${Date.now()}`;
    }

    let targetPath = path.join(STORAGE_DIR, originalname);
    let finalName = originalname;

    if (fs.existsSync(targetPath)) {
      const ext = path.extname(originalname);
      const name = path.basename(originalname, ext);
      let counter = 1;
      while (fs.existsSync(path.join(STORAGE_DIR, `${name} (${counter})${ext}`))) {
        counter++;
      }
      finalName = `${name} (${counter})${ext}`;
    }

    cb(null, finalName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB
});

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  const mimeType = mime.lookup(filename);

  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
  }

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'bmp', 'tiff'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) return 'audio';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'md', 'hwp', 'csv', 'json'].includes(ext)) return 'document';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  return 'other';
}

// 정적 파일 서빙 (public 폴더)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 파일 목록 조회 API
app.get('/api/files', (req, res) => {
  try {
    const fileNames = fs.readdirSync(STORAGE_DIR);
    const files = [];

    for (const name of fileNames) {
      if (name.startsWith('.')) continue;
      const filePath = path.join(STORAGE_DIR, name);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          const dateObj = new Date(stat.mtimeMs);
          const dateFormatted = dateObj.toISOString().slice(0, 16).replace('T', ' ');
          files.push({
            name: name,
            size: stat.size,
            sizeFormatted: formatSize(stat.size),
            modified: stat.mtimeMs,
            dateFormatted: dateFormatted,
            type: getFileType(name),
            extension: path.extname(name).toLowerCase().replace('.', ''),
            previewUrl: `/api/preview/${encodeURIComponent(name)}`,
            downloadUrl: `/api/download/${encodeURIComponent(name)}`
          });
        }
      } catch (err) {
        // Skip inaccessible file
      }
    }

    files.sort((a, b) => b.modified - a.modified);
    res.json({ success: true, files: files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 파일 업로드 API
app.post('/api/upload', upload.array('files', 100), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const saved = req.files.map(f => ({
      name: f.filename,
      size: f.size,
      sizeFormatted: formatSize(f.size),
      type: getFileType(f.filename)
    }));

    res.json({ success: true, uploaded: saved });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 파일 다운로드 API
app.get('/api/download/:filename', (req, res) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(STORAGE_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.download(filePath, safeName);
});

// 파일 미리보기 / 스트리밍 API
app.get('/api/preview/:filename', (req, res) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(STORAGE_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const mimeType = mime.lookup(safeName) || 'application/octet-stream';
  res.setHeader('Content-Type', mimeType);
  res.sendFile(filePath);
});

// 파일 삭제 API
app.delete('/api/files/:filename', (req, res) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(STORAGE_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'File not found' });
  }

  try {
    fs.unlinkSync(filePath);
    res.json({ success: true, deleted: safeName });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 저장공간 및 통계 API
app.get('/api/storage', (req, res) => {
  try {
    const fileNames = fs.readdirSync(STORAGE_DIR);
    let usedCloud = 0;
    const fileCounts = { total: 0, image: 0, video: 0, document: 0, audio: 0, other: 0 };
    const typeSizes = { image: 0, video: 0, document: 0, audio: 0, other: 0 };

    for (const name of fileNames) {
      if (name.startsWith('.')) continue;
      const filePath = path.join(STORAGE_DIR, name);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          const sz = stat.size;
          usedCloud += sz;
          const ftype = getFileType(name);
          if (fileCounts[ftype] !== undefined) {
            fileCounts[ftype]++;
            typeSizes[ftype] += sz;
          } else {
            fileCounts.other++;
            typeSizes.other += sz;
          }
          fileCounts.total++;
        }
      } catch (err) {}
    }

    // Node.js fs.statfs (Node 18.15+)
    let diskTotal = 0;
    let diskFree = 0;
    let diskUsed = 0;

    if (fs.statfsSync) {
      try {
        const stats = fs.statfsSync(STORAGE_DIR);
        diskTotal = stats.blocks * stats.bsize;
        diskFree = stats.bfree * stats.bsize;
        diskUsed = diskTotal - diskFree;
      } catch (e) {}
    }

    res.json({
      success: true,
      cloudUsedBytes: usedCloud,
      cloudUsedFormatted: formatSize(usedCloud),
      diskTotalBytes: diskTotal,
      diskTotalFormatted: formatSize(diskTotal),
      diskFreeBytes: diskFree,
      diskFreeFormatted: formatSize(diskFree),
      diskUsedBytes: diskUsed,
      diskUsedFormatted: formatSize(diskUsed),
      fileCounts: fileCounts,
      storagePath: STORAGE_DIR
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log('==================================================');
  console.log(' ☁️   iCloud Personal Server Started! (Node.js)');
  console.log(` 📂  저장소 경로: ${STORAGE_DIR}`);
  console.log(` 📱  스마트폰 자체 접속 : http://localhost:${PORT}`);
  console.log(` 💻  동일 와이파이 접속 : http://${localIp}:${PORT}`);
  console.log('==================================================');
});
