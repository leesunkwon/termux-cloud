/**
 * iCloud Personal Cloud Web Client
 * Pure JavaScript - Apple Style UI & File Manager
 */

(function () {
  'use strict';

  // State Management
  const state = {
    files: [],
    filteredFiles: [],
    currentFilter: 'all',
    searchQuery: '',
    sortBy: 'modified-desc',
    viewMode: localStorage.getItem('icloud_view_mode') || 'grid',
    activePreviewIndex: -1,
    previewableList: [],
    pendingDeleteFile: null,
    hasUpdate: false,
    updateInfo: null,
    isUpdating: false,
    bannerDismissed: false,
  };

  // DOM Elements
  const el = {
    fileGrid: document.getElementById('file-grid'),
    fileListWrap: document.getElementById('file-list-wrap'),
    fileListBody: document.getElementById('file-list-body'),
    loadingState: document.getElementById('loading-state'),
    emptyState: document.getElementById('empty-state'),
    emptyTitle: document.getElementById('empty-title'),
    emptyDesc: document.getElementById('empty-desc'),
    emptyUploadBtn: document.getElementById('empty-upload-btn'),

    // Topbar
    currentViewTitle: document.getElementById('current-view-title'),
    fileSummary: document.getElementById('file-summary'),
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    sortSelect: document.getElementById('sort-select'),
    btnGridView: document.getElementById('btn-grid-view'),
    btnListView: document.getElementById('btn-list-view'),
    refreshBtn: document.getElementById('refresh-btn'),
    serverUpdateBtn: document.getElementById('server-update-btn'),
    updateBadgeDot: document.getElementById('update-badge-dot'),
    uploadBtn: document.getElementById('upload-btn'),
    fileInput: document.getElementById('file-input'),

    // Update Notification Banner
    updateBanner: document.getElementById('update-banner'),
    updateBehindTag: document.getElementById('update-behind-tag'),
    updateCommitMsg: document.getElementById('update-commit-msg'),
    btnApplyUpdate: document.getElementById('btn-apply-update'),
    updateBtnSpinner: document.getElementById('update-btn-spinner'),
    updateBtnLabel: document.getElementById('update-btn-label'),
    btnBannerClose: document.getElementById('btn-banner-close'),

    // Sidebar & Navigation
    sidebar: document.getElementById('sidebar'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    navItems: document.querySelectorAll('.nav-item'),
    countAll: document.getElementById('count-all'),
    countImage: document.getElementById('count-image'),
    countVideo: document.getElementById('count-video'),
    countDoc: document.getElementById('count-document'),
    countAudio: document.getElementById('count-audio'),
    countOther: document.getElementById('count-other'),
    sidebarVersionBadge: document.getElementById('sidebar-version-badge'),
    btnManualCheck: document.getElementById('btn-manual-check'),
    manualCheckText: document.getElementById('manual-check-text'),

    // Storage
    storageText: document.getElementById('storage-text'),
    segPhotos: document.getElementById('seg-photos'),
    segVideos: document.getElementById('seg-videos'),
    segDocs: document.getElementById('seg-docs'),
    segOthers: document.getElementById('seg-others'),

    // Drag Overlay
    dropOverlay: document.getElementById('drop-overlay'),

    // Preview Modal
    previewModal: document.getElementById('preview-modal'),
    previewBackdrop: document.getElementById('preview-backdrop'),
    previewBody: document.getElementById('preview-body'),
    previewFilename: document.getElementById('preview-filename'),
    previewFilesize: document.getElementById('preview-filesize'),
    previewDownloadBtn: document.getElementById('preview-download-btn'),
    previewDeleteBtn: document.getElementById('preview-delete-btn'),
    previewCloseBtn: document.getElementById('preview-close-btn'),
    previewPrevBtn: document.getElementById('preview-prev-btn'),
    previewNextBtn: document.getElementById('preview-next-btn'),

    // Delete Modal
    deleteModal: document.getElementById('delete-modal'),
    deleteBackdrop: document.getElementById('delete-backdrop'),
    deleteCancelBtn: document.getElementById('delete-cancel-btn'),
    deleteConfirmBtn: document.getElementById('delete-confirm-btn'),
    deleteModalMsg: document.getElementById('delete-modal-msg'),

    // Upload Floating Widget
    uploadWidget: document.getElementById('upload-widget'),
    uploadWidgetList: document.getElementById('upload-widget-list'),
    uploadWidgetClose: document.getElementById('upload-widget-close'),
    uploadWidgetTitleText: document.getElementById('upload-widget-title-text'),

    // Toast
    toastContainer: document.getElementById('toast-container'),
  };

  // ================= Init =================
  function init() {
    setupEventListeners();
    applyViewMode(state.viewMode);
    fetchFiles();
    fetchStorageStats();

    // 2초 후 초기 업데이트 확인, 이후 30초마다 백그라운드 감지
    setTimeout(() => checkServerUpdate(false), 2000);
    setInterval(() => checkServerUpdate(false), 30000);
    window.addEventListener('focus', () => checkServerUpdate(false));
  }

  // ================= Event Listeners =================
  function setupEventListeners() {
    // Navigation items
    el.navItems.forEach(btn => {
      btn.addEventListener('click', () => {
        el.navItems.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentFilter = btn.getAttribute('data-filter');
        updateTitle();
        render();

        // Close sidebar on mobile after clicking
        if (window.innerWidth <= 860) {
          el.sidebar.classList.remove('open');
        }
      });
    });

    // Mobile menu toggle
    el.mobileMenuBtn.addEventListener('click', () => {
      el.sidebar.classList.toggle('open');
    });

    // View toggles
    el.btnGridView.addEventListener('click', () => applyViewMode('grid'));
    el.btnListView.addEventListener('click', () => applyViewMode('list'));

    // Search
    el.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      el.clearSearchBtn.classList.toggle('hidden', !state.searchQuery);
      render();
    });

    el.clearSearchBtn.addEventListener('click', () => {
      el.searchInput.value = '';
      state.searchQuery = '';
      el.clearSearchBtn.classList.add('hidden');
      render();
    });

    // Sort
    el.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      render();
    });

    // Refresh
    el.refreshBtn.addEventListener('click', () => {
      showToast('새로고침 중...');
      fetchFiles();
      fetchStorageStats();
      checkServerUpdate(false);
    });

    // Topbar Server Update Icon Button
    if (el.serverUpdateBtn) {
      el.serverUpdateBtn.addEventListener('click', () => {
        if (state.hasUpdate) {
          el.updateBanner.classList.remove('hidden');
          state.bannerDismissed = false;
        } else {
          checkServerUpdate(true);
        }
      });
    }

    // Update Notification Banner Actions
    if (el.btnApplyUpdate) {
      el.btnApplyUpdate.addEventListener('click', applyServerUpdate);
    }

    if (el.btnBannerClose) {
      el.btnBannerClose.addEventListener('click', () => {
        el.updateBanner.classList.add('hidden');
        state.bannerDismissed = true;
      });
    }

    // Sidebar Manual Check
    if (el.btnManualCheck) {
      el.btnManualCheck.addEventListener('click', () => checkServerUpdate(true));
    }

    if (el.sidebarVersionBadge) {
      el.sidebarVersionBadge.addEventListener('click', () => {
        if (state.hasUpdate) {
          el.updateBanner.classList.remove('hidden');
          state.bannerDismissed = false;
        } else {
          checkServerUpdate(true);
        }
      });
    }

    // Upload triggers
    el.uploadBtn.addEventListener('click', () => el.fileInput.click());
    el.emptyUploadBtn.addEventListener('click', () => el.fileInput.click());
    el.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        uploadFiles(e.target.files);
        el.fileInput.value = '';
      }
    });

    // Drag and Drop (window level)
    let dragCounter = 0;
    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      el.dropOverlay.classList.remove('hidden');
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        el.dropOverlay.classList.add('hidden');
      }
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      el.dropOverlay.classList.add('hidden');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    });

    // Preview Modal Controls
    el.previewBackdrop.addEventListener('click', closePreview);
    el.previewCloseBtn.addEventListener('click', closePreview);
    el.previewPrevBtn.addEventListener('click', showPrevPreview);
    el.previewNextBtn.addEventListener('click', showNextPreview);

    el.previewDownloadBtn.addEventListener('click', () => {
      const current = state.previewableList[state.activePreviewIndex];
      if (current) downloadFile(current.name);
    });

    el.previewDeleteBtn.addEventListener('click', () => {
      const current = state.previewableList[state.activePreviewIndex];
      if (current) {
        closePreview();
        promptDeleteFile(current);
      }
    });

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (!el.previewModal.classList.contains('hidden')) {
        if (e.key === 'Escape') closePreview();
        if (e.key === 'ArrowLeft') showPrevPreview();
        if (e.key === 'ArrowRight') showNextPreview();
      }
      if (!el.deleteModal.classList.contains('hidden')) {
        if (e.key === 'Escape') closeDeleteModal();
      }
    });

    // Delete Modal
    el.deleteBackdrop.addEventListener('click', closeDeleteModal);
    el.deleteCancelBtn.addEventListener('click', closeDeleteModal);
    el.deleteConfirmBtn.addEventListener('click', executeDelete);

    // Upload widget close
    el.uploadWidgetClose.addEventListener('click', () => {
      el.uploadWidget.classList.add('hidden');
    });
  }

  // ================= API Calls =================
  async function fetchFiles() {
    el.loadingState.classList.remove('hidden');
    el.emptyState.classList.add('hidden');
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      if (data.success) {
        state.files = data.files;
        updateCounts();
        render();
      } else {
        showToast('파일 목록을 불러오지 못했습니다: ' + (data.error || ''));
      }
    } catch (err) {
      console.error(err);
      showToast('서버 연결 실패');
    } finally {
      el.loadingState.classList.add('hidden');
    }
  }

  async function fetchStorageStats() {
    try {
      const res = await fetch('/api/storage');
      const data = await res.json();
      if (data.success) {
        renderStorage(data);
      }
    } catch (err) {
      console.error('Storage info fetch failed:', err);
    }
  }

  // ================= View Mode =================
  function applyViewMode(mode) {
    state.viewMode = mode;
    localStorage.setItem('icloud_view_mode', mode);

    if (mode === 'grid') {
      el.btnGridView.classList.add('active');
      el.btnListView.classList.remove('active');
      el.fileGrid.classList.remove('hidden');
      el.fileListWrap.classList.add('hidden');
    } else {
      el.btnGridView.classList.remove('active');
      el.btnListView.classList.add('active');
      el.fileGrid.classList.add('hidden');
      el.fileListWrap.classList.remove('hidden');
    }
  }

  // ================= Filter & Sort =================
  function filterAndSortFiles() {
    let list = [...state.files];

    // Category filter
    if (state.currentFilter !== 'all') {
      if (state.currentFilter === 'archive') {
        list = list.filter(f => f.type === 'archive' || f.type === 'other');
      } else {
        list = list.filter(f => f.type === state.currentFilter);
      }
    }

    // Search query filter
    if (state.searchQuery) {
      list = list.filter(f => f.name.toLowerCase().includes(state.searchQuery));
    }

    // Sort
    list.sort((a, b) => {
      switch (state.sortBy) {
        case 'modified-desc':
          return b.modified - a.modified;
        case 'modified-asc':
          return a.modified - b.modified;
        case 'name-asc':
          return a.name.localeCompare(b.name, 'ko');
        case 'name-desc':
          return b.name.localeCompare(a.name, 'ko');
        case 'size-desc':
          return b.size - a.size;
        case 'size-asc':
          return a.size - b.size;
        default:
          return 0;
      }
    });

    state.filteredFiles = list;
    // Previewable list (images, videos, audio)
    state.previewableList = list.filter(f => ['image', 'video', 'audio', 'pdf'].includes(f.type));
  }

  // ================= Render =================
  function render() {
    filterAndSortFiles();

    // Summary update
    el.fileSummary.textContent = `${state.filteredFiles.length}개 항목`;

    if (state.filteredFiles.length === 0) {
      el.fileGrid.innerHTML = '';
      el.fileListBody.innerHTML = '';
      el.emptyState.classList.remove('hidden');
      if (state.searchQuery) {
        el.emptyTitle.textContent = '검색 결과가 없습니다';
        el.emptyDesc.textContent = `"${state.searchQuery}"에 일치하는 파일이 없습니다.`;
      } else {
        el.emptyTitle.textContent = '파일이 없습니다';
        el.emptyDesc.textContent = '상단의 업로드 버튼을 누르거나 파일을 끌어다 놓으세요.';
      }
      return;
    }

    el.emptyState.classList.add('hidden');

    if (state.viewMode === 'grid') {
      renderGrid();
    } else {
      renderList();
    }
  }

  function renderGrid() {
    el.fileGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    state.filteredFiles.forEach((file) => {
      const card = document.createElement('div');
      card.className = 'file-card';

      // Thumbnail content
      let thumbHtml = '';
      if (file.type === 'image') {
        thumbHtml = `<img class="file-thumbnail" src="${file.previewUrl}" alt="${escapeHtml(file.name)}" loading="lazy">`;
      } else if (file.type === 'video') {
        thumbHtml = `
          <video class="file-thumbnail" src="${file.previewUrl}#t=0.5" preload="metadata"></video>
          <div class="video-play-badge">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </div>
        `;
      } else {
        thumbHtml = `
          <div class="generic-icon-wrap">
            <div class="generic-icon icon-${file.type}">
              ${getFileTypeIconSvg(file.type)}
            </div>
            <span class="generic-ext">${file.extension || 'FILE'}</span>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="file-thumbnail-wrap">
          ${thumbHtml}
        </div>
        <div class="card-hover-actions">
          <button class="card-action-btn btn-download" title="다운로드" data-name="${escapeHtml(file.name)}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>
          <button class="card-action-btn btn-delete" title="삭제" data-name="${escapeHtml(file.name)}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
        <div class="file-meta">
          <div class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
          <div class="file-sub">
            <span>${file.sizeFormatted}</span>
            <span>${file.dateFormatted.slice(5, 10)}</span>
          </div>
        </div>
      `;

      // Click card to open preview or download
      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-action-btn')) return;
        handleFileClick(file);
      });

      // Actions
      const dlBtn = card.querySelector('.btn-download');
      dlBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadFile(file.name);
      });

      const delBtn = card.querySelector('.btn-delete');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        promptDeleteFile(file);
      });

      fragment.appendChild(card);
    });

    el.fileGrid.appendChild(fragment);
  }

  function renderList() {
    el.fileListBody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    state.filteredFiles.forEach(file => {
      const tr = document.createElement('tr');

      let thumbMini = '';
      if (file.type === 'image') {
        thumbMini = `<img class="table-thumb-mini" src="${file.previewUrl}" alt="">`;
      } else {
        thumbMini = `<div class="table-icon-mini icon-${file.type}">${file.extension.slice(0, 4)}</div>`;
      }

      tr.innerHTML = `
        <td>
          <div class="table-file-cell">
            ${thumbMini}
            <span class="file-name-text">${escapeHtml(file.name)}</span>
          </div>
        </td>
        <td class="col-type">${getTypeLabel(file.type)}</td>
        <td class="col-size">${file.sizeFormatted}</td>
        <td class="col-date">${file.dateFormatted}</td>
        <td class="col-actions">
          <div class="table-actions">
            <button class="table-btn btn-table-download" title="다운로드">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
            <button class="table-btn btn-delete btn-table-delete" title="삭제">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      `;

      tr.querySelector('.table-file-cell').addEventListener('click', () => handleFileClick(file));
      tr.querySelector('.btn-table-download').addEventListener('click', () => downloadFile(file.name));
      tr.querySelector('.btn-table-delete').addEventListener('click', () => promptDeleteFile(file));

      fragment.appendChild(tr);
    });

    el.fileListBody.appendChild(fragment);
  }

  function handleFileClick(file) {
    if (['image', 'video', 'audio', 'pdf'].includes(file.type)) {
      const idx = state.previewableList.findIndex(f => f.name === file.name);
      if (idx !== -1) {
        openPreview(idx);
        return;
      }
    }
    // Fallback: direct download
    downloadFile(file.name);
  }

  // ================= Lightbox Preview =================
  function openPreview(index) {
    state.activePreviewIndex = index;
    const file = state.previewableList[index];
    if (!file) return;

    el.previewFilename.textContent = file.name;
    el.previewFilesize.textContent = file.sizeFormatted;

    // Build media body
    el.previewBody.innerHTML = '';

    if (file.type === 'image') {
      const img = document.createElement('img');
      img.className = 'preview-media-img';
      img.src = file.previewUrl;
      img.alt = file.name;
      el.previewBody.appendChild(img);
    } else if (file.type === 'video') {
      const video = document.createElement('video');
      video.className = 'preview-media-video';
      video.src = file.previewUrl;
      video.controls = true;
      video.autoplay = true;
      el.previewBody.appendChild(video);
    } else if (file.type === 'audio') {
      const audioWrapper = document.createElement('div');
      audioWrapper.className = 'preview-fallback';
      audioWrapper.innerHTML = `
        <div style="font-size: 64px;">🎵</div>
        <h3>${escapeHtml(file.name)}</h3>
        <audio controls autoplay class="preview-media-audio" src="${file.previewUrl}"></audio>
      `;
      el.previewBody.appendChild(audioWrapper);
    } else if (file.type === 'pdf') {
      const iframe = document.createElement('iframe');
      iframe.src = file.previewUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      el.previewBody.appendChild(iframe);
    }

    // Toggle navigation arrows
    el.previewPrevBtn.style.display = index > 0 ? 'flex' : 'none';
    el.previewNextBtn.style.display = index < state.previewableList.length - 1 ? 'flex' : 'none';

    el.previewModal.classList.remove('hidden');
    el.previewModal.focus();
  }

  function closePreview() {
    el.previewModal.classList.add('hidden');
    el.previewBody.innerHTML = ''; // Stop video/audio playback
  }

  function showPrevPreview() {
    if (state.activePreviewIndex > 0) {
      openPreview(state.activePreviewIndex - 1);
    }
  }

  function showNextPreview() {
    if (state.activePreviewIndex < state.previewableList.length - 1) {
      openPreview(state.activePreviewIndex + 1);
    }
  }

  // ================= Upload with Progress =================
  function uploadFiles(fileList) {
    if (!fileList || fileList.length === 0) return;

    el.uploadWidget.classList.remove('hidden');
    el.uploadWidgetTitleText.textContent = `${fileList.length}개 파일 업로드 준비 중...`;

    Array.from(fileList).forEach(file => {
      uploadSingleFile(file);
    });
  }

  function uploadSingleFile(file) {
    const itemEl = document.createElement('div');
    itemEl.className = 'upload-item';
    itemEl.innerHTML = `
      <div class="upload-item-info">
        <span class="upload-item-name">${escapeHtml(file.name)}</span>
        <span class="upload-item-pct">0%</span>
      </div>
      <div class="upload-progress-bg">
        <div class="upload-progress-bar"></div>
      </div>
    `;
    el.uploadWidgetList.prepend(itemEl);

    const barEl = itemEl.querySelector('.upload-progress-bar');
    const pctEl = itemEl.querySelector('.upload-item-pct');

    const formData = new FormData();
    formData.append('files', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        barEl.style.width = percent + '%';
        pctEl.textContent = percent + '%';
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        barEl.style.width = '100%';
        barEl.style.backgroundColor = 'var(--apple-green)';
        pctEl.textContent = '완료 ✓';
        showToast(`"${file.name}" 업로드 완료`);
        fetchFiles();
        fetchStorageStats();
      } else {
        barEl.style.backgroundColor = 'var(--apple-red)';
        pctEl.textContent = '실패 ✕';
        showToast(`"${file.name}" 업로드 실패`);
      }
    };

    xhr.onerror = () => {
      barEl.style.backgroundColor = 'var(--apple-red)';
      pctEl.textContent = '오류 ✕';
      showToast(`네트워크 오류: ${file.name}`);
    };

    xhr.send(formData);
  }

  // ================= Download & Delete =================
  function downloadFile(filename) {
    const link = document.createElement('a');
    link.href = `/api/download/${encodeURIComponent(filename)}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`"${filename}" 다운로드를 시작합니다`);
  }

  function promptDeleteFile(file) {
    state.pendingDeleteFile = file;
    el.deleteModalMsg.textContent = `"${file.name}" 파일을 영구적으로 삭제하시겠습니까?`;
    el.deleteModal.classList.remove('hidden');
  }

  function closeDeleteModal() {
    state.pendingDeleteFile = null;
    el.deleteModal.classList.add('hidden');
  }

  async function executeDelete() {
    if (!state.pendingDeleteFile) return;
    const target = state.pendingDeleteFile;
    closeDeleteModal();

    try {
      const res = await fetch(`/api/files/${encodeURIComponent(target.name)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast(`"${target.name}" 삭제 완료`);
        fetchFiles();
        fetchStorageStats();
      } else {
        showToast(`삭제 실패: ${data.error || ''}`);
      }
    } catch (err) {
      console.error(err);
      showToast('삭제 중 오류가 발생했습니다');
    }
  }

  // ================= UI Helpers =================
  function updateTitle() {
    const titles = {
      all: '모든 파일',
      image: '사진',
      video: '비디오',
      document: '문서',
      audio: '오디오',
      archive: '압축파일 / 기타',
    };
    el.currentViewTitle.textContent = titles[state.currentFilter] || '파일';
  }

  function updateCounts() {
    const counts = { all: 0, image: 0, video: 0, document: 0, audio: 0, other: 0 };
    counts.all = state.files.length;

    state.files.forEach(f => {
      if (f.type in counts) counts[f.type]++;
      else counts.other++;
    });

    el.countAll.textContent = counts.all;
    el.countImage.textContent = counts.image;
    el.countVideo.textContent = counts.video;
    el.countDoc.textContent = counts.document;
    el.countAudio.textContent = counts.audio;
    el.countOther.textContent = counts.other + (counts.archive || 0);
  }

  function renderStorage(info) {
    if (!info) return;

    // Multi-color segment width calculation
    const total = info.diskTotalBytes || (1024 * 1024 * 1024 * 64);
    const pPct = ((info.typeSizes?.image?.bytes || 0) / total) * 100;
    const vPct = ((info.typeSizes?.video?.bytes || 0) / total) * 100;
    const dPct = ((info.typeSizes?.document?.bytes || 0) / total) * 100;
    const oPct = (((info.typeSizes?.audio?.bytes || 0) + (info.typeSizes?.other?.bytes || 0)) / total) * 100;

    el.segPhotos.style.width = Math.max(pPct, 1) + '%';
    el.segVideos.style.width = Math.max(vPct, 1) + '%';
    el.segDocs.style.width = Math.max(dPct, 1) + '%';
    el.segOthers.style.width = Math.max(oPct, 1) + '%';

    const usedFormatted = info.cloudUsedFormatted || '0 B';
    const totalFormatted = info.diskTotalFormatted || '알 수 없음';
    el.storageText.innerHTML = `<strong>${usedFormatted}</strong> 클라우드 사용 중 (전체: ${totalFormatted})`;
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <span>${escapeHtml(message)}</span>
    `;
    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  }

  function getTypeLabel(type) {
    const labels = {
      image: '사진',
      video: '비디오',
      document: '문서',
      audio: '음악',
      archive: '압축파일',
      other: '기타'
    };
    return labels[type] || '기타';
  }

  function getFileTypeIconSvg(type) {
    switch (type) {
      case 'document':
        return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
      case 'pdf':
        return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><circle cx="10" cy="13" r="2"></circle></svg>`;
      case 'audio':
        return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
      case 'archive':
        return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`;
      default:
        return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ================= Server Update Detection & Apply =================
  let isCheckingUpdate = false;

  async function checkServerUpdate(isManual = false) {
    if (isCheckingUpdate || state.isUpdating) return;
    isCheckingUpdate = true;

    if (isManual) {
      if (el.btnManualCheck) {
        const icon = el.btnManualCheck.querySelector('.check-icon');
        if (icon) icon.classList.add('spinning');
        if (el.manualCheckText) el.manualCheckText.textContent = '확인 중...';
      }
      if (el.sidebarVersionBadge) {
        el.sidebarVersionBadge.className = 'version-badge checking';
        el.sidebarVersionBadge.textContent = '확인 중...';
      }
    }

    try {
      const res = await fetch('/api/system/check-update');
      const data = await res.json();

      if (data.success && data.hasUpdate) {
        state.hasUpdate = true;
        state.updateInfo = data;

        // 탑바 버튼 뱃지 표시
        if (el.updateBadgeDot) el.updateBadgeDot.classList.remove('hidden');

        // 사이드바 상태 표시
        if (el.sidebarVersionBadge) {
          el.sidebarVersionBadge.className = 'version-badge has-update';
          el.sidebarVersionBadge.textContent = '새 업데이트 발견!';
          el.sidebarVersionBadge.title = '클릭하여 업데이트 배너 열기';
        }

        // 상단 배너 표시 (사용자가 수동으로 닫지 않았거나, 수동 점검인 경우)
        if (!state.bannerDismissed || isManual) {
          state.bannerDismissed = false;
          if (el.updateBehindTag) {
            el.updateBehindTag.textContent = `${data.behindCount || 1}개 커밋 차이`;
          }
          if (el.updateCommitMsg) {
            el.updateCommitMsg.textContent = data.latestMessage
              ? `최신 변경: "${data.latestMessage}"`
              : '새로운 기능 및 버그 수정 코드가 등록되었습니다.';
          }
          if (el.updateBanner) {
            el.updateBanner.classList.remove('hidden');
          }
        }

        if (isManual) {
          showToast(`✨ 새로운 서버 업데이트가 발견되었습니다! (${data.behindCount || 1}개 커밋)`);
        }
      } else {
        // 업데이트 없음 (최신 상태)
        state.hasUpdate = false;
        state.updateInfo = null;

        if (el.updateBadgeDot) el.updateBadgeDot.classList.add('hidden');
        if (el.updateBanner) el.updateBanner.classList.add('hidden');

        if (el.sidebarVersionBadge) {
          el.sidebarVersionBadge.className = 'version-badge latest';
          el.sidebarVersionBadge.textContent = '최신 상태 ✓';
          el.sidebarVersionBadge.title = '서버가 최신 버전입니다.';
        }

        if (isManual) {
          showToast('✓ 현재 최신 버전의 서버 코드를 실행 중입니다.');
        }
      }
    } catch (err) {
      console.warn('Update check failed:', err);
      if (isManual) {
        showToast('업데이트 확인 실패 (인터넷 연결을 확인하세요)');
      }
    } finally {
      isCheckingUpdate = false;
      if (el.btnManualCheck) {
        const icon = el.btnManualCheck.querySelector('.check-icon');
        if (icon) icon.classList.remove('spinning');
        if (el.manualCheckText) el.manualCheckText.textContent = '업데이트 확인';
      }
    }
  }

  async function applyServerUpdate() {
    if (state.isUpdating) return;
    state.isUpdating = true;

    if (el.btnApplyUpdate) el.btnApplyUpdate.disabled = true;
    if (el.updateBtnSpinner) el.updateBtnSpinner.classList.remove('hidden');
    if (el.updateBtnLabel) el.updateBtnLabel.textContent = '코드 동기화 중...';

    showToast('🚀 GitHub에서 최신 코드를 다운로드하여 적용하는 중...');

    try {
      const res = await fetch('/api/system/update', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        if (el.updateBtnLabel) el.updateBtnLabel.textContent = '적용 완료!';
        showToast('🎉 최신 코드가 적용되었습니다! 페이지를 새로고침합니다...');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        state.isUpdating = false;
        if (el.btnApplyUpdate) el.btnApplyUpdate.disabled = false;
        if (el.updateBtnSpinner) el.updateBtnSpinner.classList.add('hidden');
        if (el.updateBtnLabel) el.updateBtnLabel.textContent = '다시 시도';
        showToast('업데이트 실패: ' + (data.error || data.output || '알 수 없는 오류'));
      }
    } catch (err) {
      state.isUpdating = false;
      if (el.btnApplyUpdate) el.btnApplyUpdate.disabled = false;
      if (el.updateBtnSpinner) el.updateBtnSpinner.classList.add('hidden');
      if (el.updateBtnLabel) el.updateBtnLabel.textContent = '다시 시도';
      showToast('서버 업데이트 요청 중 통신 오류가 발생했습니다.');
    }
  }

  // Start app
  document.addEventListener('DOMContentLoaded', init);
})();
