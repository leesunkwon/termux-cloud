/**
 * iCloud Personal Cloud & Smartphone Dashboard Web Client
 * Pure JavaScript - Apple Style UI, Multi-View Portal, Text Previewer & System Monitor
 */

(function () {
  'use strict';

  // State Management
  const state = {
    currentAppView: 'portal', // 'portal' | 'cloud' | 'dashboard'
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
    dashboardData: null,
    changelogData: null,
    activePreviewText: '',
  };

  // DOM Elements
  const el = {
    // Global Navigation & Views
    navBrandBtn: document.getElementById('nav-brand-btn'),
    tabPortal: document.getElementById('tab-portal'),
    tabCloud: document.getElementById('tab-cloud'),
    tabDashboard: document.getElementById('tab-dashboard'),
    viewPortal: document.getElementById('view-portal'),
    viewCloud: document.getElementById('view-cloud'),
    viewDashboard: document.getElementById('view-dashboard'),
    navStatusChip: document.getElementById('nav-status-chip'),
    serverUpdateBtn: document.getElementById('server-update-btn'),
    updateBadgeDot: document.getElementById('update-badge-dot'),
    refreshBtn: document.getElementById('refresh-btn'),

    // Update Notification Banner
    updateBanner: document.getElementById('update-banner'),
    updateBehindTag: document.getElementById('update-behind-tag'),
    updateCommitMsg: document.getElementById('update-commit-msg'),
    btnApplyUpdate: document.getElementById('btn-apply-update'),
    updateBtnSpinner: document.getElementById('update-btn-spinner'),
    updateBtnLabel: document.getElementById('update-btn-label'),
    btnBannerClose: document.getElementById('btn-banner-close'),
    btnViewUpdateDetails: document.getElementById('btn-view-update-details'),

    // Portal View Elements
    portalCardCloud: document.getElementById('portal-card-cloud'),
    portalCardDashboard: document.getElementById('portal-card-dashboard'),
    portalFilesSummary: document.getElementById('portal-files-summary'),
    portalUptimeSummary: document.getElementById('portal-uptime-summary'),
    portalIpVal: document.getElementById('portal-ip-val'),
    portalVerVal: document.getElementById('portal-ver-val'),
    portalUpdateStatus: document.getElementById('portal-update-status'),
    portalChangelogBtn: document.getElementById('portal-changelog-btn'),

    // Cloud View Elements
    fileGrid: document.getElementById('file-grid'),
    fileListWrap: document.getElementById('file-list-wrap'),
    fileListBody: document.getElementById('file-list-body'),
    loadingState: document.getElementById('loading-state'),
    emptyState: document.getElementById('empty-state'),
    emptyTitle: document.getElementById('empty-title'),
    emptyDesc: document.getElementById('empty-desc'),
    emptyUploadBtn: document.getElementById('empty-upload-btn'),

    // Topbar in Cloud
    currentViewTitle: document.getElementById('current-view-title'),
    fileSummary: document.getElementById('file-summary'),
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    sortSelect: document.getElementById('sort-select'),
    btnGridView: document.getElementById('btn-grid-view'),
    btnListView: document.getElementById('btn-list-view'),
    uploadBtn: document.getElementById('upload-btn'),
    fileInput: document.getElementById('file-input'),

    // Sidebar
    sidebar: document.getElementById('sidebar'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    navItems: document.querySelectorAll('.nav-item'),
    countAll: document.getElementById('count-all'),
    countImage: document.getElementById('count-image'),
    countVideo: document.getElementById('count-video'),
    countDoc: document.getElementById('count-document'),
    countAudio: document.getElementById('count-audio'),
    countOther: document.getElementById('count-other'),
    storageText: document.getElementById('storage-text'),
    segPhotos: document.getElementById('seg-photos'),
    segVideos: document.getElementById('seg-videos'),
    segDocs: document.getElementById('seg-docs'),
    segOthers: document.getElementById('seg-others'),
    sidebarVersionBadge: document.getElementById('sidebar-version-badge'),
    btnManualCheck: document.getElementById('btn-manual-check'),
    manualCheckText: document.getElementById('manual-check-text'),

    // Dashboard Elements
    btnDashRefresh: document.getElementById('btn-dash-refresh'),
    btnDashUpdate: document.getElementById('btn-dash-update'),
    dashOsBadge: document.getElementById('dash-os-badge'),
    dashVerBadge: document.getElementById('dash-ver-badge'),
    metricCpuVal: document.getElementById('metric-cpu-val'),
    metricCpuCores: document.getElementById('metric-cpu-cores'),
    metricCpuBar: document.getElementById('metric-cpu-bar'),
    metricCpuLoad: document.getElementById('metric-cpu-load'),
    metricMemVal: document.getElementById('metric-mem-val'),
    metricMemUsed: document.getElementById('metric-mem-used'),
    metricMemBar: document.getElementById('metric-mem-bar'),
    metricMemDetail: document.getElementById('metric-mem-detail'),
    metricBatteryVal: document.getElementById('metric-battery-val'),
    metricBatteryStatus: document.getElementById('metric-battery-status'),
    metricBatteryBar: document.getElementById('metric-battery-bar'),
    metricBatteryDetail: document.getElementById('metric-battery-detail'),
    metricDiskVal: document.getElementById('metric-disk-val'),
    metricDiskUsed: document.getElementById('metric-disk-used'),
    metricDiskBar: document.getElementById('metric-disk-bar'),
    metricDiskDetail: document.getElementById('metric-disk-detail'),
    dashIpLocal: document.getElementById('dash-ip-local'),
    dashIpWifi: document.getElementById('dash-ip-wifi'),
    btnCopyWifiIp: document.getElementById('btn-copy-wifi-ip'),
    dashUptimeText: document.getElementById('dash-uptime-text'),
    dashRuntimeText: document.getElementById('dash-runtime-text'),
    dashPidText: document.getElementById('dash-pid-text'),
    dashStoragePath: document.getElementById('dash-storage-path'),
    dashVersionPill: document.getElementById('dash-version-pill'),
    dashChangelogList: document.getElementById('dash-changelog-list'),
    btnOpenFullChangelog: document.getElementById('btn-open-full-changelog'),
    btnTriggerUpdate: document.getElementById('btn-trigger-update'),

    // Preview Modal
    previewModal: document.getElementById('preview-modal'),
    previewBackdrop: document.getElementById('preview-backdrop'),
    previewBody: document.getElementById('preview-body'),
    previewFilename: document.getElementById('preview-filename'),
    previewFilesize: document.getElementById('preview-filesize'),
    previewTypeTag: document.getElementById('preview-type-tag'),
    previewCopyTextBtn: document.getElementById('preview-copy-text-btn'),
    previewDownloadBtn: document.getElementById('preview-download-btn'),
    previewDeleteBtn: document.getElementById('preview-delete-btn'),
    previewCloseBtn: document.getElementById('preview-close-btn'),
    previewPrevBtn: document.getElementById('preview-prev-btn'),
    previewNextBtn: document.getElementById('preview-next-btn'),

    // Changelog Modal
    changelogModal: document.getElementById('changelog-modal'),
    changelogBackdrop: document.getElementById('changelog-backdrop'),
    changelogCloseBtn: document.getElementById('changelog-close-btn'),
    changelogConfirmBtn: document.getElementById('changelog-confirm-btn'),
    changelogMarkdownContent: document.getElementById('changelog-markdown-content'),

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

    // Drag Overlay & Toast
    dropOverlay: document.getElementById('drop-overlay'),
    toastContainer: document.getElementById('toast-container'),
  };

  // ================= Init =================
  function init() {
    setupEventListeners();
    setupDropZone();
    applyViewMode(state.viewMode);

    // Initial Hash Routing or Default to Portal
    const hash = window.location.hash.replace('#', '');
    if (['portal', 'cloud', 'dashboard'].includes(hash)) {
      switchAppView(hash);
    } else {
      switchAppView('portal');
    }

    // Initial Data Fetch
    fetchFiles();
    fetchStorageStats();
    fetchDashboardData();

    // Background Update Check
    setTimeout(() => checkServerUpdate(false), 2000);
    setInterval(() => checkServerUpdate(false), 30000);

    // Dashboard periodic refresh (every 8s when dashboard is open)
    setInterval(() => {
      if (state.currentAppView === 'dashboard') {
        fetchDashboardData(true);
      }
    }, 8000);

    window.addEventListener('focus', () => {
      checkServerUpdate(false);
      if (state.currentAppView === 'dashboard') fetchDashboardData(true);
    });

    window.addEventListener('hashchange', () => {
      const h = window.location.hash.replace('#', '');
      if (['portal', 'cloud', 'dashboard'].includes(h) && h !== state.currentAppView) {
        switchAppView(h);
      }
    });
  }

  // ================= View Switcher (Portal / Cloud / Dashboard) =================
  function switchAppView(viewName) {
    state.currentAppView = viewName;
    window.location.hash = viewName;

    // Update Nav Tab Buttons
    [el.tabPortal, el.tabCloud, el.tabDashboard].forEach(btn => {
      if (btn) btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
    });

    // Toggle View Sections
    if (el.viewPortal) el.viewPortal.classList.toggle('hidden', viewName !== 'portal');
    if (el.viewCloud) el.viewCloud.classList.toggle('hidden', viewName !== 'cloud');
    if (el.viewDashboard) el.viewDashboard.classList.toggle('hidden', viewName !== 'dashboard');

    if (viewName === 'cloud') {
      render();
    } else if (viewName === 'dashboard') {
      fetchDashboardData();
      fetchChangelog();
    } else if (viewName === 'portal') {
      updatePortalSummaries();
    }
  }

  function updatePortalSummaries() {
    if (el.portalFilesSummary) {
      const count = state.files ? state.files.length : 0;
      el.portalFilesSummary.textContent = `${count}개 항목 보관 중`;
    }
    if (state.dashboardData && el.portalUptimeSummary) {
      el.portalUptimeSummary.textContent = `가동: ${state.dashboardData.uptime.formatted}`;
    }
    if (state.dashboardData && el.portalIpVal) {
      el.portalIpVal.textContent = state.dashboardData.network.localIp + ':' + state.dashboardData.network.port;
    }
  }

  // ================= Event Listeners =================
  function setupEventListeners() {
    // Brand button -> Portal
    if (el.navBrandBtn) {
      el.navBrandBtn.addEventListener('click', () => switchAppView('portal'));
    }

    // Nav Tabs
    if (el.tabPortal) el.tabPortal.addEventListener('click', () => switchAppView('portal'));
    if (el.tabCloud) el.tabCloud.addEventListener('click', () => switchAppView('cloud'));
    if (el.tabDashboard) el.tabDashboard.addEventListener('click', () => switchAppView('dashboard'));

    // Portal Cards
    if (el.portalCardCloud) {
      el.portalCardCloud.addEventListener('click', () => switchAppView('cloud'));
    }
    if (el.portalCardDashboard) {
      el.portalCardDashboard.addEventListener('click', () => switchAppView('dashboard'));
    }
    if (el.portalChangelogBtn) {
      el.portalChangelogBtn.addEventListener('click', openChangelogModal);
    }

    // Dashboard Actions
    if (el.btnDashRefresh) {
      el.btnDashRefresh.addEventListener('click', () => {
        showToast('서버 상태 갱신 중...');
        fetchDashboardData();
      });
    }
    if (el.btnDashUpdate || el.btnTriggerUpdate) {
      const updateHandler = () => {
        if (state.hasUpdate) {
          applyServerUpdate();
        } else {
          checkServerUpdate(true);
        }
      };
      if (el.btnDashUpdate) el.btnDashUpdate.addEventListener('click', updateHandler);
      if (el.btnTriggerUpdate) el.btnTriggerUpdate.addEventListener('click', updateHandler);
    }
    if (el.btnOpenFullChangelog) {
      el.btnOpenFullChangelog.addEventListener('click', openChangelogModal);
    }
    if (el.btnViewUpdateDetails) {
      el.btnViewUpdateDetails.addEventListener('click', openChangelogModal);
    }

    // Copy Wi-Fi IP button
    if (el.btnCopyWifiIp) {
      el.btnCopyWifiIp.addEventListener('click', () => {
        const text = el.dashIpWifi.textContent;
        navigator.clipboard.writeText(text).then(() => {
          showToast('✓ 주소가 클립보드에 복사되었습니다: ' + text);
        }).catch(() => {
          showToast('복사 실패');
        });
      });
    }

    // Global Refresh
    if (el.refreshBtn) {
      el.refreshBtn.addEventListener('click', () => {
        showToast('새로고침 중...');
        fetchFiles();
        fetchStorageStats();
        fetchDashboardData();
        checkServerUpdate(false);
      });
    }

    // Global Update Icon Button
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

    // Update Notification Banner
    if (el.btnApplyUpdate) el.btnApplyUpdate.addEventListener('click', applyServerUpdate);
    if (el.btnBannerClose) {
      el.btnBannerClose.addEventListener('click', () => {
        el.updateBanner.classList.add('hidden');
        state.bannerDismissed = true;
      });
    }

    // Sidebar items
    el.navItems.forEach(btn => {
      btn.addEventListener('click', () => {
        el.navItems.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentFilter = btn.getAttribute('data-filter');
        updateTitle();
        render();

        if (window.innerWidth <= 860) {
          el.sidebar.classList.remove('open');
        }
      });
    });

    if (el.mobileMenuBtn) {
      el.mobileMenuBtn.addEventListener('click', () => {
        el.sidebar.classList.toggle('open');
      });
    }

    // View toggles (Grid / List)
    if (el.btnGridView) el.btnGridView.addEventListener('click', () => applyViewMode('grid'));
    if (el.btnListView) el.btnListView.addEventListener('click', () => applyViewMode('list'));

    // Search
    if (el.searchInput) {
      el.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        el.clearSearchBtn.classList.toggle('hidden', !state.searchQuery);
        render();
      });
    }
    if (el.clearSearchBtn) {
      el.clearSearchBtn.addEventListener('click', () => {
        el.searchInput.value = '';
        state.searchQuery = '';
        el.clearSearchBtn.classList.add('hidden');
        render();
      });
    }

    // Sort
    if (el.sortSelect) {
      el.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        render();
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

    // Upload
    if (el.uploadBtn) el.uploadBtn.addEventListener('click', () => el.fileInput.click());
    if (el.emptyUploadBtn) el.emptyUploadBtn.addEventListener('click', () => el.fileInput.click());
    if (el.fileInput) {
      el.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          uploadFiles(e.target.files);
          el.fileInput.value = '';
        }
      });
    }

    // Upload widget close
    if (el.uploadWidgetClose) {
      el.uploadWidgetClose.addEventListener('click', () => {
        el.uploadWidget.classList.add('hidden');
      });
    }

    // Preview Modal
    if (el.previewCloseBtn) el.previewCloseBtn.addEventListener('click', closePreview);
    if (el.previewBackdrop) el.previewBackdrop.addEventListener('click', closePreview);
    if (el.previewPrevBtn) el.previewPrevBtn.addEventListener('click', showPrevPreview);
    if (el.previewNextBtn) el.previewNextBtn.addEventListener('click', showNextPreview);

    if (el.previewCopyTextBtn) {
      el.previewCopyTextBtn.addEventListener('click', () => {
        if (!state.activePreviewText) return;
        navigator.clipboard.writeText(state.activePreviewText).then(() => {
          showToast('✓ 파일 전체 내용이 클립보드에 복사되었습니다.');
        }).catch(() => {
          showToast('복사 실패');
        });
      });
    }

    // Delete Modal
    if (el.deleteCancelBtn) el.deleteCancelBtn.addEventListener('click', closeDeleteModal);
    if (el.deleteBackdrop) el.deleteBackdrop.addEventListener('click', closeDeleteModal);
    if (el.deleteConfirmBtn) el.deleteConfirmBtn.addEventListener('click', confirmDeleteFile);

    // Changelog Modal
    if (el.changelogCloseBtn) el.changelogCloseBtn.addEventListener('click', closeChangelogModal);
    if (el.changelogConfirmBtn) el.changelogConfirmBtn.addEventListener('click', closeChangelogModal);
    if (el.changelogBackdrop) el.changelogBackdrop.addEventListener('click', closeChangelogModal);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!el.previewModal.classList.contains('hidden')) {
        if (e.key === 'Escape') closePreview();
        if (e.key === 'ArrowLeft') showPrevPreview();
        if (e.key === 'ArrowRight') showNextPreview();
      }
      if (!el.changelogModal.classList.contains('hidden')) {
        if (e.key === 'Escape') closeChangelogModal();
      }
      if (!el.deleteModal.classList.contains('hidden')) {
        if (e.key === 'Escape') closeDeleteModal();
      }
    });
  }

  // ================= Dashboard Data Fetching & Rendering =================
  async function fetchDashboardData(isSilent = false) {
    try {
      const res = await fetch('/api/system/dashboard');
      const data = await res.json();
      if (data.success) {
        state.dashboardData = data;
        renderDashboard(data);
        updatePortalSummaries();
      }
    } catch (err) {
      if (!isSilent) console.warn('Failed to fetch dashboard data:', err);
    }
  }

  function renderDashboard(data) {
    // Badges & Texts
    if (el.dashOsBadge) el.dashOsBadge.textContent = data.osName;
    if (el.dashVerBadge) el.dashVerBadge.textContent = data.version;
    if (el.dashVersionPill) el.dashVersionPill.textContent = data.version;
    if (el.portalVerVal) el.portalVerVal.textContent = data.version;

    // CPU
    if (el.metricCpuVal) el.metricCpuVal.textContent = `${data.cpu.percent}%`;
    if (el.metricCpuCores) el.metricCpuCores.textContent = `${data.cpu.cores}코어 (부하 ${data.cpu.load1})`;
    if (el.metricCpuBar) el.metricCpuBar.style.width = `${Math.min(100, data.cpu.percent)}%`;
    if (el.metricCpuLoad) el.metricCpuLoad.textContent = `1분 부하: ${data.cpu.load1} / 5분: ${data.cpu.load5 || data.cpu.load1}`;

    // Memory
    if (el.metricMemVal) el.metricMemVal.textContent = `${data.memory.percent}%`;
    if (el.metricMemUsed) el.metricMemUsed.textContent = `${data.memory.usedFormatted}`;
    if (el.metricMemBar) el.metricMemBar.style.width = `${Math.min(100, data.memory.percent)}%`;
    if (el.metricMemDetail) el.metricMemDetail.textContent = `전체 ${data.memory.totalFormatted} 중 ${data.memory.freeFormatted} 여유`;

    // Battery
    if (data.battery && data.battery.supported) {
      if (el.metricBatteryVal) el.metricBatteryVal.textContent = `${data.battery.percentage}%`;
      if (el.metricBatteryStatus) el.metricBatteryStatus.textContent = data.battery.status;
      if (el.metricBatteryBar) el.metricBatteryBar.style.width = `${data.battery.percentage}%`;
      if (el.metricBatteryDetail) el.metricBatteryDetail.textContent = `온도 ${data.battery.temperature}°C (${data.battery.plugged})`;
    } else {
      if (el.metricBatteryVal) el.metricBatteryVal.textContent = '정상';
      if (el.metricBatteryStatus) el.metricBatteryStatus.textContent = '전원 연결';
      if (el.metricBatteryBar) el.metricBatteryBar.style.width = '100%';
      if (el.metricBatteryDetail) el.metricBatteryDetail.textContent = '24시간 무중단 전원 모드';
    }

    // Disk
    if (el.metricDiskVal) el.metricDiskVal.textContent = `${data.disk.percent}%`;
    if (el.metricDiskUsed) el.metricDiskUsed.textContent = `${data.disk.usedFormatted}`;
    if (el.metricDiskBar) el.metricDiskBar.style.width = `${Math.min(100, data.disk.percent)}%`;
    if (el.metricDiskDetail) el.metricDiskDetail.textContent = `클라우드 ${data.disk.cloudFilesCount}개 (${data.disk.cloudUsedFormatted}) 사용 중`;

    // Network & Process
    if (el.dashIpLocal) el.dashIpLocal.textContent = `http://localhost:${data.network.port}`;
    if (el.dashIpWifi) el.dashIpWifi.textContent = `http://${data.network.localIp}:${data.network.port}`;
    if (el.portalIpVal) el.portalIpVal.textContent = `${data.network.localIp}:${data.network.port}`;
    if (el.dashUptimeText) el.dashUptimeText.textContent = data.uptime.formatted;
    if (el.dashRuntimeText) el.dashRuntimeText.textContent = data.runtime;
    if (el.dashPidText) el.dashPidText.textContent = `${data.pid}`;
    if (el.dashStoragePath) el.dashStoragePath.textContent = data.disk.cloudUsedFormatted ? `uploads (${data.disk.cloudFilesCount}개)` : 'uploads';
  }

  // ================= Changelog Fetching & Modal =================
  async function fetchChangelog() {
    try {
      const res = await fetch('/api/system/changelog');
      const data = await res.json();
      if (data.success) {
        state.changelogData = data;
        renderDashboardChangelog(data);
      }
    } catch (err) {
      console.warn('Failed to fetch changelog:', err);
    }
  }

  function renderDashboardChangelog(data) {
    if (!el.dashChangelogList) return;
    el.dashChangelogList.innerHTML = '';

    const commits = data.recentCommits || [];
    if (commits.length === 0) {
      el.dashChangelogList.innerHTML = '<div class="changelog-loading">최근 업데이트 기록이 없습니다.</div>';
      return;
    }

    commits.forEach(item => {
      const div = document.createElement('div');
      div.className = 'changelog-item';
      div.innerHTML = `
        <div class="changelog-item-header">
          <span class="commit-hash">${escapeHtml(item.hash)}</span>
          <span class="commit-date">${escapeHtml(item.date)}</span>
        </div>
        <div class="commit-msg">${escapeHtml(item.message)}</div>
      `;
      el.dashChangelogList.appendChild(div);
    });
  }

  function openChangelogModal() {
    if (el.changelogModal) {
      el.changelogModal.classList.remove('hidden');

      if (!state.changelogData) {
        fetchChangelog().then(() => renderChangelogModalContent());
      } else {
        renderChangelogModalContent();
      }
    }
  }

  function renderChangelogModalContent() {
    if (!el.changelogMarkdownContent || !state.changelogData) return;
    const raw = state.changelogData.changelog || '';

    // 간단하고 직관적인 Markdown to HTML 렌더링
    let html = raw
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // ul 감싸기
    html = html.replace(/(<li>[\s\S]*?<\/li>)/gim, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/gim, '');

    el.changelogMarkdownContent.innerHTML = html || '<p>릴리즈 노트 내용이 없습니다.</p>';
  }

  function closeChangelogModal() {
    if (el.changelogModal) el.changelogModal.classList.add('hidden');
  }

  // ================= Remote Update Checker & 1-Click Apply =================
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

        if (el.updateBadgeDot) el.updateBadgeDot.classList.remove('hidden');

        if (el.sidebarVersionBadge) {
          el.sidebarVersionBadge.className = 'version-badge has-update';
          el.sidebarVersionBadge.textContent = '새 업데이트!';
          el.sidebarVersionBadge.title = '클릭하여 업데이트 배너 열기';
        }

        if (el.portalUpdateStatus) {
          el.portalUpdateStatus.className = 'chip-val';
          el.portalUpdateStatus.style.color = 'var(--apple-red)';
          el.portalUpdateStatus.textContent = '새 업데이트 대기 중!';
        }

        if (!state.bannerDismissed || isManual) {
          state.bannerDismissed = false;
          if (el.updateBehindTag) {
            el.updateBehindTag.textContent = `${data.behindCount || 1}개 신규 커밋`;
          }
          if (el.updateCommitMsg) {
            el.updateCommitMsg.textContent = data.latestMessage
              ? `최신 변경: "${data.latestMessage}"`
              : '새로운 기능 및 안정성 개선 코드가 등록되었습니다.';
          }
          if (el.updateBanner) {
            el.updateBanner.classList.remove('hidden');
          }
        }

        if (isManual) {
          showToast(`✨ 새로운 서버 업데이트가 발견되었습니다! (${data.behindCount || 1}개 커밋)`);
        }
      } else {
        state.hasUpdate = false;
        state.updateInfo = null;

        if (el.updateBadgeDot) el.updateBadgeDot.classList.add('hidden');
        if (el.updateBanner) el.updateBanner.classList.add('hidden');

        if (el.sidebarVersionBadge) {
          el.sidebarVersionBadge.className = 'version-badge latest';
          el.sidebarVersionBadge.textContent = 'v1.2.0 최신 ✓';
          el.sidebarVersionBadge.title = '서버가 최신 버전입니다.';
        }

        if (el.portalUpdateStatus) {
          el.portalUpdateStatus.className = 'chip-val green';
          el.portalUpdateStatus.textContent = '최신 버전 ✓';
        }

        if (isManual) {
          showToast('✓ 현재 최신 버전의 서버 코드를 실행 중입니다.');
        }
      }
    } catch (err) {
      console.warn('Update check failed:', err);
      if (isManual) showToast('업데이트 확인 실패 (인터넷 연결 상태를 확인하세요)');
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
        showToast('🎉 최신 코드가 성공적으로 적용되었습니다! 페이지를 새로고침합니다...');
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

  // ================= File API & List Rendering =================
  async function fetchFiles() {
    el.loadingState.classList.remove('hidden');
    el.emptyState.classList.add('hidden');
    el.fileGrid.innerHTML = '';
    el.fileListBody.innerHTML = '';

    try {
      const res = await fetch('/api/files');
      const data = await res.json();

      if (data.success) {
        state.files = data.files || [];
        updateCounts();
        render();
        updatePortalSummaries();
      } else {
        showToast('파일 목록 불러오기 실패: ' + data.error);
      }
    } catch (err) {
      showToast('서버 연결 실패. 서버가 실행 중인지 확인하세요.');
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
      console.warn('Storage stats fetch error:', err);
    }
  }

  function renderStorage(data) {
    const totalBytes = data.diskTotalBytes || 1;
    const typeSizes = data.typeSizes || {};

    const photosPct = ((typeSizes.image?.bytes || 0) / totalBytes) * 100;
    const videosPct = ((typeSizes.video?.bytes || 0) / totalBytes) * 100;
    const docsPct = ((typeSizes.document?.bytes || 0) / totalBytes) * 100;
    const othersPct = ((typeSizes.other?.bytes || 0) / totalBytes) * 100;

    if (el.segPhotos) el.segPhotos.style.width = Math.max(photosPct, 0.5) + '%';
    if (el.segVideos) el.segVideos.style.width = Math.max(videosPct, 0.5) + '%';
    if (el.segDocs) el.segDocs.style.width = Math.max(docsPct, 0.5) + '%';
    if (el.segOthers) el.segOthers.style.width = Math.max(othersPct, 0.5) + '%';

    const usedFormatted = data.cloudUsedFormatted || '0 B';
    const totalFormatted = data.diskTotalFormatted || '0 GB';
    if (el.storageText) {
      el.storageText.innerHTML = `<strong>${usedFormatted}</strong> 클라우드 사용 중 (전체: ${totalFormatted})`;
    }
  }

  function updateCounts() {
    const counts = { all: 0, image: 0, video: 0, document: 0, audio: 0, other: 0 };
    state.files.forEach(f => {
      counts.all++;
      if (counts[f.type] !== undefined) {
        counts[f.type]++;
      } else {
        counts.other++;
      }
    });

    if (el.countAll) el.countAll.textContent = counts.all;
    if (el.countImage) el.countImage.textContent = counts.image;
    if (el.countVideo) el.countVideo.textContent = counts.video;
    if (el.countDoc) el.countDoc.textContent = counts.document;
    if (el.countAudio) el.countAudio.textContent = counts.audio;
    if (el.countOther) el.countOther.textContent = counts.other;
  }

  function updateTitle() {
    const titles = {
      all: '모든 파일',
      image: '사진',
      video: '비디오',
      document: '문서 / 텍스트',
      audio: '오디오',
      other: '압축파일 / 기타'
    };
    if (el.currentViewTitle) {
      el.currentViewTitle.textContent = titles[state.currentFilter] || '모든 파일';
    }
  }

  function render() {
    let list = state.files.slice();

    if (state.currentFilter !== 'all') {
      list = list.filter(f => f.type === state.currentFilter);
    }

    if (state.searchQuery) {
      list = list.filter(f => f.name.toLowerCase().includes(state.searchQuery));
    }

    list.sort((a, b) => {
      switch (state.sortBy) {
        case 'modified-desc': return b.modified - a.modified;
        case 'modified-asc': return a.modified - b.modified;
        case 'name-asc': return a.name.localeCompare(b.name, 'ko');
        case 'name-desc': return b.name.localeCompare(a.name, 'ko');
        case 'size-desc': return b.size - a.size;
        case 'size-asc': return a.size - b.size;
        default: return 0;
      }
    });

    state.filteredFiles = list;
    // 모든 파일을 순서대로 미리보기 리스트로 등록 (키보드 좌우 방향키로 연속 탐색 가능!)
    state.previewableList = list;

    if (el.fileSummary) {
      el.fileSummary.textContent = `${list.length}개 항목`;
    }

    if (list.length === 0) {
      el.fileGrid.innerHTML = '';
      el.fileListBody.innerHTML = '';
      el.emptyState.classList.remove('hidden');
      if (state.searchQuery) {
        el.emptyTitle.textContent = '검색 결과가 없습니다';
        el.emptyDesc.textContent = `"${state.searchQuery}"에 일치하는 파일이 없습니다.`;
      } else {
        el.emptyTitle.textContent = '파일이 없습니다';
        el.emptyDesc.textContent = '상단의 업로드 버튼을 누르거나 파일을 드롭하세요.';
      }
      return;
    }

    el.emptyState.classList.add('hidden');

    if (state.viewMode === 'grid') {
      renderGrid(list);
    } else {
      renderList(list);
    }
  }

  function renderGrid(files) {
    el.fileGrid.innerHTML = '';
    files.forEach((file, index) => {
      const card = document.createElement('div');
      card.className = 'file-card';
      card.setAttribute('data-index', index);

      let thumbContent = '';
      if (file.type === 'image') {
        thumbContent = `<img class="file-thumb-img" src="${file.previewUrl}" alt="${escapeHtml(file.name)}" loading="lazy">`;
      } else if (file.type === 'video') {
        thumbContent = `
          <div class="file-thumb-video-placeholder">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
            <span class="video-duration-tag">동영상</span>
          </div>
        `;
      } else if (file.isText || file.type === 'document') {
        thumbContent = `
          <div class="file-thumb-doc-placeholder">
            <span class="doc-badge-ext">${file.extension.toUpperCase() || 'TXT'}</span>
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          </div>
        `;
      } else {
        thumbContent = `
          <div class="file-thumb-icon-placeholder">
            ${getFileTypeIconSvg(file.type)}
            <span class="doc-badge-ext">${file.extension.toUpperCase()}</span>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="file-thumbnail-wrap">
          ${thumbContent}
        </div>
        <div class="file-card-info">
          <div class="file-card-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
          <div class="file-card-meta">
            <span>${file.sizeFormatted}</span>
            <span>${file.dateFormatted}</span>
          </div>
        </div>
        <div class="file-card-hover-actions">
          <button class="card-action-btn btn-dl" title="다운로드" data-action="download">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>
          <button class="card-action-btn btn-del" title="삭제" data-action="delete">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('.card-action-btn');
        if (actionBtn) {
          e.stopPropagation();
          const action = actionBtn.getAttribute('data-action');
          if (action === 'download') downloadFile(file.name);
          if (action === 'delete') promptDeleteFile(file);
          return;
        }
        openPreview(index);
      });

      el.fileGrid.appendChild(card);
    });
  }

  function renderList(files) {
    el.fileListBody.innerHTML = '';
    files.forEach((file, index) => {
      const tr = document.createElement('tr');
      tr.className = 'file-row';

      tr.innerHTML = `
        <td class="col-name">
          <div class="list-name-wrap">
            <span class="list-type-icon ${file.type}-color">
              ${getFileTypeIconSvg(file.type)}
            </span>
            <span class="list-filename" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
          </div>
        </td>
        <td class="col-type">${getTypeLabel(file.type)}</td>
        <td class="col-size">${file.sizeFormatted}</td>
        <td class="col-date">${file.dateFormatted}</td>
        <td class="col-actions">
          <button class="row-action-btn btn-view" title="미리보기">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path></svg>
          </button>
          <button class="row-action-btn btn-dl" title="다운로드">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>
          <button class="row-action-btn btn-del" title="삭제">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </td>
      `;

      tr.querySelector('.btn-view').addEventListener('click', (e) => {
        e.stopPropagation();
        openPreview(index);
      });
      tr.querySelector('.btn-dl').addEventListener('click', (e) => {
        e.stopPropagation();
        downloadFile(file.name);
      });
      tr.querySelector('.btn-del').addEventListener('click', (e) => {
        e.stopPropagation();
        promptDeleteFile(file);
      });

      tr.addEventListener('click', () => openPreview(index));
      el.fileListBody.appendChild(tr);
    });
  }

  function applyViewMode(mode) {
    state.viewMode = mode;
    localStorage.setItem('icloud_view_mode', mode);

    if (el.btnGridView) el.btnGridView.classList.toggle('active', mode === 'grid');
    if (el.btnListView) el.btnListView.classList.toggle('active', mode === 'list');

    if (el.fileGrid) el.fileGrid.classList.toggle('hidden', mode !== 'grid');
    if (el.fileListWrap) el.fileListWrap.classList.toggle('hidden', mode !== 'list');

    render();
  }

  // ================= Universal File Previewer (Text, Media, PDF) =================
  async function openPreview(index) {
    state.activePreviewIndex = index;
    const file = state.previewableList[index];
    if (!file) return;

    el.previewFilename.textContent = file.name;
    el.previewFilesize.textContent = file.sizeFormatted;
    if (el.previewTypeTag) el.previewTypeTag.textContent = getTypeLabel(file.type);
    if (el.previewCopyTextBtn) el.previewCopyTextBtn.classList.add('hidden');
    state.activePreviewText = '';

    el.previewBody.innerHTML = '';

    // 1) 이미지
    if (file.type === 'image') {
      const img = document.createElement('img');
      img.className = 'preview-media-img';
      img.src = file.previewUrl;
      img.alt = file.name;
      el.previewBody.appendChild(img);
    }
    // 2) 비디오
    else if (file.type === 'video') {
      const video = document.createElement('video');
      video.className = 'preview-media-video';
      video.src = file.previewUrl;
      video.controls = true;
      video.autoplay = true;
      el.previewBody.appendChild(video);
    }
    // 3) 오디오
    else if (file.type === 'audio') {
      const audioWrapper = document.createElement('div');
      audioWrapper.className = 'preview-fallback';
      audioWrapper.innerHTML = `
        <div style="font-size: 64px; margin-bottom: 12px;">🎵</div>
        <h3 style="margin-bottom: 16px;">${escapeHtml(file.name)}</h3>
        <audio controls autoplay class="preview-media-audio" src="${file.previewUrl}"></audio>
      `;
      el.previewBody.appendChild(audioWrapper);
    }
    // 4) PDF
    else if (file.type === 'pdf') {
      const iframe = document.createElement('iframe');
      iframe.src = file.previewUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      el.previewBody.appendChild(iframe);
    }
    // 5) 텍스트 및 코드 파일 (txt, md, json, py, js, log, csv 등)
    else if (file.isText || file.type === 'document') {
      const container = document.createElement('div');
      container.className = 'preview-text-container';
      container.innerHTML = `
        <div class="preview-text-toolbar">
          <span>인코딩: UTF-8 | 라인 수 계산 중...</span>
          <span>읽기 전용 뷰어</span>
        </div>
        <div class="preview-text-body">텍스트를 불러오는 중...</div>
      `;
      el.previewBody.appendChild(container);

      try {
        const res = await fetch(file.previewUrl);
        const text = await res.text();
        state.activePreviewText = text;

        const lines = text.split('\n');
        const lineCount = lines.length;
        const charCount = text.length;

        container.querySelector('.preview-text-toolbar').innerHTML = `
          <span>라인: ${lineCount.toLocaleString()}줄 | 글자: ${charCount.toLocaleString()}자 | UTF-8</span>
          <span>${file.extension.toUpperCase() || 'TXT'} 문서</span>
        `;
        container.querySelector('.preview-text-body').textContent = text;

        if (el.previewCopyTextBtn) {
          el.previewCopyTextBtn.classList.remove('hidden');
        }
      } catch (err) {
        container.querySelector('.preview-text-body').textContent = '텍스트를 불러오지 못했습니다: ' + err.message;
      }
    }
    // 6) 기타 파일 정보 카드
    else {
      const fallback = document.createElement('div');
      fallback.className = 'preview-fallback';
      fallback.innerHTML = `
        <div style="font-size: 64px; margin-bottom: 16px;">📦</div>
        <h3 style="margin-bottom: 8px;">${escapeHtml(file.name)}</h3>
        <p style="color: #8e8e93; font-size: 13.5px; margin-bottom: 20px;">이 파일 형식은 브라우저 직접 미리보기를 지원하지 않습니다.</p>
        <button class="btn btn-primary" onclick="window.location.href='${file.downloadUrl}'">
          다운로드하여 열기 (${file.sizeFormatted})
        </button>
      `;
      el.previewBody.appendChild(fallback);
    }

    // Modal action buttons
    el.previewDownloadBtn.onclick = () => downloadFile(file.name);
    el.previewDeleteBtn.onclick = () => {
      closePreview();
      promptDeleteFile(file);
    };

    // Navigation arrows
    el.previewPrevBtn.style.display = index > 0 ? 'flex' : 'none';
    el.previewNextBtn.style.display = index < state.previewableList.length - 1 ? 'flex' : 'none';

    el.previewModal.classList.remove('hidden');
    el.previewModal.focus();
  }

  function closePreview() {
    el.previewModal.classList.add('hidden');
    el.previewBody.innerHTML = '';
    state.activePreviewText = '';
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

  // ================= File Download & Delete =================
  function downloadFile(filename) {
    const a = document.createElement('a');
    a.href = `/api/download/${encodeURIComponent(filename)}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`'${filename}' 다운로드를 시작합니다.`);
  }

  function promptDeleteFile(file) {
    state.pendingDeleteFile = file;
    el.deleteModalMsg.textContent = `'${file.name}' (${file.sizeFormatted}) 파일을 영구히 삭제하시겠습니까?`;
    el.deleteModal.classList.remove('hidden');
  }

  function closeDeleteModal() {
    el.deleteModal.classList.add('hidden');
    state.pendingDeleteFile = null;
  }

  async function confirmDeleteFile() {
    if (!state.pendingDeleteFile) return;
    const file = state.pendingDeleteFile;
    closeDeleteModal();

    try {
      const res = await fetch(`/api/files/${encodeURIComponent(file.name)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(`'${file.name}' 파일이 삭제되었습니다.`);
        fetchFiles();
        fetchStorageStats();
        fetchDashboardData(true);
      } else {
        showToast('삭제 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (err) {
      showToast('파일 삭제 요청 실패');
    }
  }

  // ================= File Upload =================
  function uploadFiles(fileList) {
    if (!fileList || fileList.length === 0) return;

    el.uploadWidget.classList.remove('hidden');
    el.uploadWidgetTitleText.textContent = `${fileList.length}개 파일 업로드 중...`;

    Array.from(fileList).forEach(file => {
      const itemId = 'upload-' + Math.random().toString(36).substring(2, 9);
      const itemEl = document.createElement('div');
      itemEl.className = 'upload-item';
      itemEl.id = itemId;
      itemEl.innerHTML = `
        <div class="upload-item-info">
          <span class="upload-item-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
          <span class="upload-item-pct">0%</span>
        </div>
        <div class="upload-progress-bg">
          <div class="upload-progress-bar"></div>
        </div>
      `;
      el.uploadWidgetList.appendChild(itemEl);

      const formData = new FormData();
      formData.append('files', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload', true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          itemEl.querySelector('.upload-progress-bar').style.width = pct + '%';
          itemEl.querySelector('.upload-item-pct').textContent = pct + '%';
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          itemEl.querySelector('.upload-item-pct').textContent = '완료 ✓';
          itemEl.querySelector('.upload-progress-bar').style.backgroundColor = 'var(--apple-green)';
          setTimeout(() => {
            if (itemEl.parentNode) itemEl.parentNode.removeChild(itemEl);
            if (el.uploadWidgetList.children.length === 0) {
              el.uploadWidget.classList.add('hidden');
            }
          }, 3000);
          fetchFiles();
          fetchStorageStats();
          fetchDashboardData(true);
        } else {
          itemEl.querySelector('.upload-item-pct').textContent = '실패 ✕';
          itemEl.querySelector('.upload-progress-bar').style.backgroundColor = 'var(--apple-red)';
        }
      };

      xhr.onerror = () => {
        itemEl.querySelector('.upload-item-pct').textContent = '오류 ✕';
        itemEl.querySelector('.upload-progress-bar').style.backgroundColor = 'var(--apple-red)';
      };

      xhr.send(formData);
    });
  }

  // ================= Drag and Drop =================
  function setupDropZone() {
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
        switchAppView('cloud');
        uploadFiles(e.dataTransfer.files);
      }
    });
  }

  // ================= Utilities =================
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
      document: '문서/텍스트',
      audio: '오디오',
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

  // Start app
  document.addEventListener('DOMContentLoaded', init);
})();
