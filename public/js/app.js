/**
 * Pulse (Pulse Cloud & Pulse OS) Web Client
 * Pure JavaScript - Apple Style UI, Multi-View Portal, Text Previewer & System Monitor
 */

(function () {
  'use strict';

  // State Management
  const state = {
    dashboardPaused: false, dashboardInterval: 15000, dashboardFetchedAt: 0,
    folder: '', page: 1, pages: 1, total: 0, counts: {}, selected: new Set(),
    terminalBusy: false, editorDirty: false, editorBusy: false,
    currentAppView: 'portal', // 'portal' | 'cloud' | 'desktop' | 'dashboard'
    files: [],
    filteredFiles: [],
    currentFilter: 'all',
    searchQuery: '',
    sortBy: 'modified-desc',
    viewMode: localStorage.getItem('pulse_view_mode') || localStorage.getItem('icloud_view_mode') || 'grid',
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
    // Virtual Desktop State
    desktopTheme: localStorage.getItem('desktop_theme') || 'sonoma',
    terminalCwd: '~',
    terminalHistory: [],
    terminalHistoryIdx: -1,
    activeDesktopApp: 'terminal',
    openWindows: {},
    topZIndex: 100,
    editorCurrentFile: '',
    finderFilter: 'all',
  };

  // DOM Elements
  const el = {
    // Global Navigation & Views
    navBrandBtn: document.getElementById('nav-brand-btn'),
    tabPortal: document.getElementById('tab-portal'),
    tabCloud: document.getElementById('tab-cloud'),
    tabDesktop: document.getElementById('tab-desktop'),
    tabDashboard: document.getElementById('tab-dashboard'),
    viewPortal: document.getElementById('view-portal'),
    viewCloud: document.getElementById('view-cloud'),
    viewDesktop: document.getElementById('view-desktop'),
    viewDashboard: document.getElementById('view-dashboard'),
    navStatusChip: document.getElementById('nav-status-chip'),
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
    portalCardDesktop: document.getElementById('portal-card-desktop'),
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
  async function init() {
    await Pulse.ready;
    PulseDashboard.configure({
      refresh: () => fetchDashboardData(),
      pause: value => { state.dashboardPaused = value; },
      interval: value => { state.dashboardInterval = value; }
    });
    setupFileTools();
    Pulse.canLeave = canLeaveEditor;
    setupEventListeners();
    setupDropZone();
    applyViewMode(state.viewMode);
    setupDesktopEnvironment();

    // Initial Hash Routing or Default to Portal
    const hash = window.location.hash.replace('#', '');
    if (['portal', 'cloud', 'desktop', 'dashboard'].includes(hash)) {
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
    setInterval(() => { if (!document.hidden) checkServerUpdate(false); }, 300000);

    // One shared poller: no timer-driven requests in hidden tabs or paused views.
    setInterval(() => {
      if (document.hidden || state.dashboardPaused || Date.now() - state.dashboardFetchedAt < state.dashboardInterval) return;
      const monitoring = state.currentAppView === 'dashboard' ||
        (state.currentAppView === 'desktop' && state.openWindows.monitor &&
         !document.getElementById('win-monitor').classList.contains('window-minimized') &&
         (window.innerWidth > 768 || state.activeDesktopApp === 'monitor'));
      if (monitoring) fetchDashboardData(true);
    }, 1000);

    window.addEventListener('focus', () => {
      checkServerUpdate(false);
      if (!state.dashboardPaused && state.currentAppView === 'dashboard') fetchDashboardData(true);
      if (!state.dashboardPaused && state.currentAppView === 'desktop') {
        fetchDashboardData(true);
        updateMonitorWidget();
      }
    });

    window.addEventListener('hashchange', () => {
      const h = window.location.hash.replace('#', '');
      if (['portal', 'cloud', 'desktop', 'dashboard'].includes(h) && h !== state.currentAppView) {
        switchAppView(h);
      }
    });
  }

  // ================= View Switcher (Portal / Cloud / Desktop / Dashboard) =================
  function switchAppView(viewName) {
    state.currentAppView = viewName;
    window.location.hash = viewName;
    requestAnimationFrame(() => Pulse.viewport());

    // Update Nav Tab Buttons
    [el.tabPortal, el.tabCloud, el.tabDesktop, el.tabDashboard].forEach(btn => {
      if (btn) btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
    });

    // Toggle View Sections
    if (el.viewPortal) el.viewPortal.classList.toggle('hidden', viewName !== 'portal');
    if (el.viewCloud) el.viewCloud.classList.toggle('hidden', viewName !== 'cloud');
    if (el.viewDesktop) el.viewDesktop.classList.toggle('hidden', viewName !== 'desktop');
    if (el.viewDashboard) el.viewDashboard.classList.toggle('hidden', viewName !== 'dashboard');

    if (viewName === 'cloud') {
      render();
    } else if (viewName === 'desktop') {
      initDesktopView();
    } else if (viewName === 'dashboard') {
      fetchDashboardData();
      fetchChangelog();
    } else if (viewName === 'portal') {
      updatePortalSummaries();
    }
  }

  function updatePortalSummaries() {
    if (el.portalFilesSummary) {
      const count = state.dashboardData?.disk?.cloudFilesCount ?? state.counts.all ?? 0;
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
    if (el.tabDesktop) el.tabDesktop.addEventListener('click', () => switchAppView('desktop'));
    if (el.tabDashboard) el.tabDashboard.addEventListener('click', () => switchAppView('dashboard'));

    // Portal Cards
    if (el.portalCardCloud) {
      el.portalCardCloud.addEventListener('click', () => switchAppView('cloud'));
    }
    if (el.portalCardDesktop) {
      el.portalCardDesktop.addEventListener('click', () => switchAppView('desktop'));
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
    if (el.btnTriggerUpdate) {
      const updateHandler = () => {
        if (state.hasUpdate) {
          applyServerUpdate();
        } else {
          checkServerUpdate(true);
        }
      };
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
        state.page = 1;
        fetchFiles();

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
    let searchTimer;
    if (el.searchInput) {
      el.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        el.clearSearchBtn.classList.toggle('hidden', !state.searchQuery);
        state.page = 1;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(fetchFiles, 250);
      });
    }
    if (el.clearSearchBtn) {
      el.clearSearchBtn.addEventListener('click', () => {
        el.searchInput.value = '';
        state.searchQuery = '';
        el.clearSearchBtn.classList.add('hidden');
        state.page = 1;
        fetchFiles();
      });
    }

    // Sort
    if (el.sortSelect) {
      el.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        state.page = 1;
        fetchFiles();
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
  let dashboardRequest = null;
  function fetchDashboardData(isSilent = false) {
    if (dashboardRequest) return dashboardRequest;
    state.dashboardFetchedAt = Date.now();
    const started = performance.now();
    dashboardRequest = (async () => {
      try {
        const data = await Pulse.api('/api/system/dashboard', { signal: AbortSignal.timeout(10000) });
        state.dashboardData = data;
        updateMenubarIndicators();
        updateMonitorWidget();
        renderDashboard(data);
        updatePortalSummaries();
        PulseDashboard.render(data, performance.now() - started);
        const chip = document.getElementById('nav-status-chip');
        chip.querySelector('.nav-status-text').textContent = '연결됨';
        chip.title = '최근 서버 응답 정상';
        chip.dataset.connection = 'online';
      } catch (error) {
        PulseDashboard.failed(error.message);
        const chip = document.getElementById('nav-status-chip');
        chip.querySelector('.nav-status-text').textContent = '연결 확인 필요';
        chip.title = '최근 조회 실패. 표시된 수치는 이전 조회 결과입니다.';
        chip.dataset.connection = 'failed';
        if (!isSilent) showToast('서버 상태 조회 실패: ' + error.message, () => fetchDashboardData());
      } finally { dashboardRequest = null; }
    })();
    return dashboardRequest;
  }

  function renderDashboard(data) {
    // Badges & Texts
    if (el.dashOsBadge) el.dashOsBadge.textContent = data.osName;
    if (el.dashVerBadge) el.dashVerBadge.textContent = data.version;
    if (el.dashVersionPill) el.dashVersionPill.textContent = data.version;
    if (el.portalVerVal) el.portalVerVal.textContent = data.version;

    // CPU
    document.getElementById('metric-cpu-title').textContent = data.cpu.label || 'CPU 사용률';
    if (el.metricCpuVal) el.metricCpuVal.textContent = metricPercent(data.cpu);
    if (el.metricCpuCores) el.metricCpuCores.textContent = `${data.cpu.cores}코어 · ${data.cpu.scope === 'process' ? '서버 프로세스' : '기기 전체'}`;
    if (el.metricCpuBar) el.metricCpuBar.style.width = `${Math.min(100, data.cpu.percent)}%`;
    if (el.metricCpuLoad) el.metricCpuLoad.textContent = data.cpu.reason || `실측 · ${data.cpu.sampleSeconds}초 샘플 · 1분 부하 ${data.cpu.load1 ?? '측정 불가'}`;

    // Memory
    if (el.metricMemVal) el.metricMemVal.textContent = metricPercent(data.memory);
    if (el.metricMemUsed) el.metricMemUsed.textContent = `${data.memory.usedFormatted}`;
    if (el.metricMemBar) el.metricMemBar.style.width = `${Math.min(100, data.memory.percent)}%`;
    if (el.metricMemDetail) el.metricMemDetail.textContent = `전체 ${data.memory.totalFormatted} 중 ${data.memory.freeFormatted} 여유`;

    // Battery
    if (data.battery && data.battery.supported) {
      if (el.metricBatteryVal) el.metricBatteryVal.textContent = `${data.battery.percentage}%`;
      if (el.metricBatteryStatus) el.metricBatteryStatus.textContent = data.battery.status;
      if (el.metricBatteryBar) el.metricBatteryBar.style.width = `${data.battery.percentage}%`;
      if (el.metricBatteryDetail) el.metricBatteryDetail.textContent = `온도 ${data.battery.temperature === null ? '측정 불가' : data.battery.temperature + '°C'} (${data.battery.plugged})`;
    } else {
      if (el.metricBatteryVal) el.metricBatteryVal.textContent = '측정 불가';
      if (el.metricBatteryStatus) el.metricBatteryStatus.textContent = '권한 또는 장치 미지원';
      if (el.metricBatteryBar) el.metricBatteryBar.style.width = '0%';
      if (el.metricBatteryDetail) el.metricBatteryDetail.textContent = 'Termux:API 앱과 termux-api 패키지 및 권한을 확인하세요.';
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
    if (el.dashStoragePath) el.dashStoragePath.textContent = data.diagnostics?.storageDetails?.path || '확인 불가';
  }

  // ================= Changelog Fetching & Modal =================
  async function fetchChangelog() {
    if (!Pulse.isAdmin) return;
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
    let html = escapeHtml(raw)
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
    if (!Pulse.isAdmin || document.hidden || isCheckingUpdate || state.isUpdating) return;
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
      if (!data.success || data.fetchFailed || data.timeout) throw new Error('업데이트 확인 불가');

      if (data.success && data.hasUpdate) {
        state.hasUpdate = true;
        state.updateInfo = data;


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

        if (el.updateBanner) el.updateBanner.classList.add('hidden');

        if (el.sidebarVersionBadge) {
          el.sidebarVersionBadge.className = 'version-badge latest';
          el.sidebarVersionBadge.textContent = `${state.dashboardData?.version || ''} 최신 ✓`;
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
      if (el.sidebarVersionBadge) el.sidebarVersionBadge.textContent = '업데이트 확인 불가';
      if (el.portalUpdateStatus) el.portalUpdateStatus.textContent = '업데이트 확인 불가';
      if (isManual) showToast('업데이트 확인 실패 (인터넷 연결 상태를 확인하세요)', () => checkServerUpdate(true));
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
    if (state.isUpdating || !Pulse.isAdmin) return;
    if (state.terminalBusy || activeUploads || uploadQueue.length) {
      showToast('명령 실행과 파일 업로드가 끝난 뒤 업데이트하세요.');
      return;
    }
    if (!await canLeaveEditor()) return;
    state.isUpdating = true;
    const label = text => {
      if (el.updateBtnLabel) el.updateBtnLabel.textContent = text;
      showToast(text);
    };
    if (el.btnApplyUpdate) el.btnApplyUpdate.disabled = true;
    try {
      label('1/3 · 최신 코드 다운로드 중');
      const data = await Pulse.post('/api/system/update');
      if (!data.restartSupported) {
        await Pulse.ask('다운로드 완료. Termux에서 ./stop.sh 후 ./start.sh --bg로 재시작하세요. 이후 새로고침하면 적용됩니다.', { cancel: false });
        return;
      }
      label('2/3 · 서버 재시작 중');
      await Pulse.post('/api/system/restart');
      label('3/3 · 서버 재접속 확인 중');
      for (let count = 0; count < 30; count++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const health = await Pulse.api('/api/system/health', { signal: AbortSignal.timeout(3000) });
          if (health.instanceId !== data.instanceId) {
            state.editorDirty = false;
            location.reload();
            return;
          }
        } catch (_) { /* The process is restarting. */ }
      }
      throw new Error('재접속을 확인하지 못했습니다. Termux에서 ./status.sh로 상태를 확인한 뒤 새로고침하세요.');
    } catch (error) {
      await Pulse.ask(error.message, { cancel: false });
    } finally {
      state.isUpdating = false;
      if (el.btnApplyUpdate) el.btnApplyUpdate.disabled = false;
      if (el.updateBtnLabel) el.updateBtnLabel.textContent = '업데이트 다시 확인';
    }
  }

  function metricPercent(metric) {
    if (metric.percent === null || metric.percent === undefined) return metric.measurement === 'sampling' ? '측정 중' : '측정 불가';
    return `${metric.percent}%${metric.measurement === 'estimated' ? ' (추정)' : ''}`;
  }
  function joinPath(name) { return state.folder ? `${state.folder}/${name}` : name; }
  function navigateFolder(path) {
    state.folder = path;
    state.page = 1;
    state.searchQuery = '';
    if (el.searchInput) el.searchInput.value = '';
    state.selected.clear();
    fetchFiles();
  }
  function addSelection(container, file, inline = false) {
    if (!Pulse.isAdmin) return;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = inline ? 'pulse-selection-inline' : 'pulse-selection';
    checkbox.dataset.path = file.path;
    checkbox.setAttribute('aria-label', `${file.name} 선택`);
    checkbox.checked = state.selected.has(file.path);
    checkbox.addEventListener('click', event => event.stopPropagation());
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) state.selected.add(file.path); else state.selected.delete(file.path);
      document.querySelectorAll('input[data-path]').forEach(other => {
        other.checked = state.selected.has(other.dataset.path);
      });
      updateFileTools();
    });
    container.prepend(checkbox);
  }
  function updateFileTools() {
    document.querySelectorAll('.pulse-file-path').forEach(el => { el.textContent = `내 보관함 / ${state.folder || ''}`; });
    document.querySelectorAll('.pulse-page-label').forEach(el => { el.textContent = `${state.page} / ${state.pages} · ${state.total}개`; });
    document.querySelectorAll('[data-file-action]').forEach(button => {
      const action = button.dataset.fileAction;
      if (action === 'prev') button.disabled = state.page <= 1;
      if (action === 'next') button.disabled = state.page >= state.pages;
      if (action === 'up') button.disabled = !state.folder;
      if (action === 'rename') button.disabled = state.selected.size !== 1;
      if (['move', 'delete'].includes(action)) button.disabled = !state.selected.size;
      if (action === 'select') button.textContent = state.selected.size ? `선택 해제 (${state.selected.size})` : '페이지 전체 선택';
    });
  }
  async function fileAction(action) {
    try {
      if (action === 'up') { navigateFolder(state.folder.split('/').slice(0, -1).join('/')); return; }
      if (action === 'home') { navigateFolder(''); return; }
      if (action === 'prev' || action === 'next') {
        state.page += action === 'next' ? 1 : -1;
        await fetchFiles(); return;
      }
      if (action === 'select') {
        if (state.selected.size) state.selected.clear(); else state.files.forEach(file => state.selected.add(file.path));
        render(); renderFinderFiles(); updateFileTools(); return;
      }
      if (action === 'trash') { await openTrash(); return; }
      if (action === 'mkdir') {
        const name = await Pulse.ask('새 폴더 이름', { input: true });
        if (!name) return;
        if (name.includes('/') || name.includes('\\')) throw new Error('폴더 이름에 경로 구분자를 사용할 수 없습니다.');
        await Pulse.post('/api/folders', { path: joinPath(name) });
      }
      if (action === 'rename') {
        const source = [...state.selected][0];
        const name = await Pulse.ask('새 이름', { input: true, value: source.split('/').pop() });
        if (!name) return;
        if (name.includes('/') || name.includes('\\')) throw new Error('이름에 경로 구분자를 사용할 수 없습니다.');
        const parent = source.split('/').slice(0, -1).join('/');
        await Pulse.post('/api/files/move', { source, destination: parent ? `${parent}/${name}` : name });
      }
      if (action === 'move' || action === 'delete') {
        const paths = [...state.selected];
        let folder = '';
        if (action === 'move') {
          folder = await Pulse.ask('이동할 폴더 경로를 입력하세요. 보관함 최상위로 이동하려면 비워두세요. 폴더는 먼저 생성해야 합니다.', { input: true });
          if (folder === null) return;
          folder = folder.trim().replace(/^\/+|\/+$/g, '');
        } else if (!await Pulse.ask(`${paths.length}개 항목을 휴지통으로 옮길까요?`, { confirm: '휴지통으로 이동' })) return;
        let completed = 0;
        const failed = [];
        for (const source of paths) {
          try {
            if (action === 'delete') await Pulse.api('/api/files/' + encodeURIComponent(source), { method: 'DELETE' });
            else await Pulse.post('/api/files/move', { source, destination: (folder ? folder + '/' : '') + source.split('/').pop() });
            completed++;
          } catch (error) { failed.push(`${source}: ${error.message}`); }
        }
        if (failed.length) await Pulse.ask(`${completed}개 완료, ${failed.length}개 실패\n${failed.join('\n')}`, { cancel: false });
        else showToast(`${completed}개 항목을 ${action === 'delete' ? '휴지통으로 옮겼습니다.' : '이동했습니다.'}`);
      }
      await fetchFiles();
      fetchStorageStats();
    } catch (error) { showToast(error.message, () => fileAction(action)); }
  }
  async function restoreTrash(id) {
    try { await Pulse.post(`/api/trash/${id}/restore`); await fetchFiles(); fetchStorageStats(); showToast('복원했습니다.'); }
    catch (error) { showToast(error.message, () => restoreTrash(id)); }
  }
  async function openTrash() {
    const data = await Pulse.api('/api/trash');
    const dialog = document.getElementById('pulse-trash');
    const list = document.getElementById('pulse-trash-list');
    list.replaceChildren();
    if (!data.items.length) list.textContent = '휴지통이 비어 있습니다.';
    for (const item of data.items) {
      const row = document.createElement('div');
      row.className = 'pulse-trash-row';
      const name = document.createElement('span');
      name.textContent = item.path;
      row.appendChild(name);
      for (const restore of [true, false]) {
        const button = document.createElement('button');
        button.className = 'btn btn-outline';
        button.textContent = restore ? '복원' : '영구 삭제';
        button.addEventListener('click', async () => {
          if (!restore && !await Pulse.ask(`'${item.path}'을 영구 삭제할까요? 복구할 수 없습니다.`, { confirm: '영구 삭제' })) return;
          button.disabled = true;
          try {
            if (restore) await Pulse.post(`/api/trash/${item.id}/restore`);
            else await Pulse.api(`/api/trash/${item.id}`, { method: 'DELETE' });
            await openTrash(); await fetchFiles(); fetchStorageStats();
          } catch (error) { await Pulse.ask(error.message, { cancel: false }); }
          finally { button.disabled = false; }
        });
        row.appendChild(button);
      }
      list.appendChild(row);
    }
    if (!dialog.open) dialog.showModal();
  }
  function setupFileTools() {
    const dialog = document.createElement('dialog');
    dialog.id = 'pulse-trash';
    dialog.className = 'pulse-dialog';
    dialog.setAttribute('aria-label', '휴지통');
    dialog.innerHTML = '<h2>휴지통</h2><p>영구 삭제 전까지 저장 공간을 사용합니다.</p><div id="pulse-trash-list"></div><form method="dialog"><button class="btn btn-primary">닫기</button></form>';
    document.body.appendChild(dialog);
    const targets = [document.getElementById('file-grid').parentElement, document.querySelector('.finder-content')];
    targets.forEach(target => {
      const toolbar = document.createElement('div');
      toolbar.className = 'pulse-file-tools';
      const path = document.createElement('span');
      path.className = 'pulse-file-path';
      toolbar.appendChild(path);
      const pager = document.createElement('div');
      pager.className = 'pulse-pagination';
      for (const [action, text] of Object.entries({ home: '보관함', up: '상위 폴더', mkdir: '새 폴더', select: '페이지 전체 선택', rename: '이름 변경', move: '이동', delete: '휴지통 이동', trash: '휴지통', prev: '이전', next: '다음' })) {
        const button = document.createElement('button');
        button.className = 'btn btn-outline';
        button.dataset.fileAction = action;
        button.textContent = text;
        if (!['home', 'up', 'prev', 'next'].includes(action)) button.setAttribute('data-admin', '');
        button.addEventListener('click', async () => {
          button.disabled = true;
          try { await fileAction(action); }
          finally { button.disabled = false; updateFileTools(); }
        });
        (['prev', 'next'].includes(action) ? pager : toolbar).appendChild(button);
      }
      const page = document.createElement('span');
      page.className = 'pulse-page-label';
      pager.insertBefore(page, pager.lastChild);
      target.prepend(toolbar);
      target.appendChild(pager);
    });
    const vncButton = document.createElement('button');
    vncButton.className = 'win-btn-sm';
    vncButton.textContent = '연결 주소';
    vncButton.addEventListener('click', async () => {
      const url = await Pulse.ask('Linux 데스크톱 주소를 입력하세요. 비워두면 서버 기본 주소를 사용합니다. HTTPS 접속 시 HTTPS 주소가 필요합니다.', { input: true, value: localStorage.getItem('pulse_vnc_url') || '' });
      if (url === null) return;
      if (url.trim()) {
        try { const parsed = new URL(url.trim()); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(); }
        catch (_) { showToast('올바른 HTTP 또는 HTTPS 주소를 입력하세요.'); return; }
      }
      localStorage.setItem('pulse_vnc_url', url.trim());
      checkVncStatus();
    });
    document.querySelector('#win-linux .window-header-actions').appendChild(vncButton);
    updateFileTools();
  }

  // ================= File API & List Rendering =================
  let fileRequest = 0;
  async function fetchFiles() {
    const requestId = ++fileRequest;
    el.loadingState.classList.remove('hidden');
    try {
      const query = new URLSearchParams({ path: state.folder, page: state.page, limit: 60,
        q: state.searchQuery, type: state.currentFilter, sort: state.sortBy });
      const data = await Pulse.api('/api/files?' + query);
      if (requestId !== fileRequest) return;
      state.files = data.files;
      state.total = data.total;
      state.page = data.page;
      state.pages = data.pages;
      state.counts = data.counts;
      state.selected.clear();
      updateCounts();
      render();
      renderFinderFiles();
      updateFileTools();
      updatePortalSummaries();
    } catch (error) {
      if (requestId !== fileRequest) return;
      state.files = [];
      state.total = 0;
      state.pages = 1;
      state.selected.clear();
      render();
      renderFinderFiles();
      updateFileTools();
      showToast(error.message, () => fetchFiles());
    } finally {
      if (requestId === fileRequest) el.loadingState.classList.add('hidden');
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
    const othersPct = (((typeSizes.other?.bytes || 0) + (typeSizes.audio?.bytes || 0)) / totalBytes) * 100;

    if (el.segPhotos) el.segPhotos.style.width = photosPct + '%';
    if (el.segVideos) el.segVideos.style.width = videosPct + '%';
    if (el.segDocs) el.segDocs.style.width = docsPct + '%';
    if (el.segOthers) el.segOthers.style.width = othersPct + '%';

    const usedFormatted = data.cloudUsedFormatted || '0 B';
    const totalFormatted = data.diskTotalFormatted || '0 GB';
    if (el.storageText) {
      el.storageText.innerHTML = `<strong>${usedFormatted}</strong> 클라우드 사용 중 (전체: ${totalFormatted})`;
    }
  }

  function updateCounts() {
    const counts = state.counts;
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
      folder: '폴더',
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
    const list = state.files;

    state.filteredFiles = list;
    // 모든 파일을 순서대로 미리보기 리스트로 등록 (키보드 좌우 방향키로 연속 탐색 가능!)
    state.previewableList = list;

    if (el.fileSummary) {
      el.fileSummary.textContent = `${state.total}개 항목 · ${state.page}/${state.pages}페이지`;
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
      if (file.type === 'image' && file.thumbnailUrl) {
        thumbContent = `<img class="file-thumb-img" src="${escapeHtml(file.thumbnailUrl)}" alt="${escapeHtml(file.name)}" loading="lazy">`;
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
            <span class="doc-badge-ext">${escapeHtml(file.extension.toUpperCase()) || 'TXT'}</span>
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          </div>
        `;
      } else {
        thumbContent = `
          <div class="file-thumb-icon-placeholder">
            ${getFileTypeIconSvg(file.type)}
            <span class="doc-badge-ext">${escapeHtml(file.extension.toUpperCase())}</span>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="file-thumbnail-wrap">
          ${thumbContent}
          <div class="file-card-actions">
            <button class="card-action-btn btn-dl" title="다운로드" data-action="download">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
            <button class="card-action-btn btn-del" title="삭제" data-action="delete">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
        <div class="file-card-info">
          <div class="file-card-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
          <div class="file-card-meta">
            <span class="file-meta-size">${file.sizeFormatted}</span>
            <span class="file-meta-date">${file.dateFormatted}</span>
          </div>
        </div>
      `;

      const btnDl = card.querySelector('.btn-dl');
      const btnDel = card.querySelector('.btn-del');

      if (btnDl) {
        btnDl.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (file.type === 'folder') navigateFolder(file.path);
          else downloadFile(file.path || file.name);
        });
      }

      if (btnDel) {
        btnDel.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          promptDeleteFile(file);
        });
      }

      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-action-btn')) return;
        openPreview(index);
      });

      addSelection(card, file);
      card.querySelector('img')?.addEventListener('error', event => { event.target.hidden = true; });
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
          <div class="row-actions-wrap">
            <button class="row-action-btn btn-view" title="미리보기">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path></svg>
            </button>
            <button class="row-action-btn btn-dl" title="다운로드">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
            <button class="row-action-btn btn-del" title="삭제">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      `;

      const btnView = tr.querySelector('.btn-view');
      const btnDl = tr.querySelector('.btn-dl');
      const btnDel = tr.querySelector('.btn-del');

      if (btnView) {
        btnView.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          openPreview(index);
        });
      }
      if (btnDl) {
        btnDl.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (file.type === 'folder') navigateFolder(file.path);
          else downloadFile(file.path || file.name);
        });
      }
      if (btnDel) {
        btnDel.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          promptDeleteFile(file);
        });
      }

      tr.addEventListener('click', (e) => {
        if (e.target.closest('.row-action-btn')) return;
        openPreview(index);
      });
      addSelection(tr.querySelector('td'), file, true);
      el.fileListBody.appendChild(tr);
    });
  }

  function applyViewMode(mode) {
    state.viewMode = mode;
    localStorage.setItem('pulse_view_mode', mode);

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
    if (file.type === 'folder') { navigateFolder(file.path); return; }

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
    else if (file.isText) {
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
        if (!res.ok) { const error = await res.json(); throw new Error(error.error || '미리보기 실패'); }
        const text = await res.text();
        state.activePreviewText = text;

        const lines = text.split('\n');
        const lineCount = lines.length;
        const charCount = text.length;

        container.querySelector('.preview-text-toolbar').innerHTML = `
          <span>라인: ${lineCount.toLocaleString()}줄 | 글자: ${charCount.toLocaleString()}자 | UTF-8</span>
          <span>${escapeHtml(file.extension.toUpperCase()) || 'TXT'} 문서</span>
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
        <button class="btn btn-primary">
          다운로드하여 열기 (${file.sizeFormatted})
        </button>
      `;
      fallback.querySelector('button').addEventListener('click', () => downloadFile(file.path || file.name));
      el.previewBody.appendChild(fallback);
    }

    // Modal action buttons
    el.previewDownloadBtn.onclick = () => downloadFile(file.path || file.name);
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
    el.deleteModalMsg.textContent = `'${file.name}' (${file.sizeFormatted}) 항목을 휴지통으로 옮길까요? 나중에 복원할 수 있습니다.`;
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
    if (el.previewModal && !el.previewModal.classList.contains('hidden')) {
      closePreview();
    }

    try {
      const res = await fetch(`/api/files/${encodeURIComponent(file.path || file.name)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(`'${file.name}' 항목을 휴지통으로 옮겼습니다.`, () => restoreTrash(data.trashId), '복원');
        await fetchFiles();
        if (typeof renderFinderFiles === 'function') {
          renderFinderFiles();
        }
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
    if (!Pulse.isAdmin || !fileList || fileList.length === 0) return;

    for (const file of Array.from(fileList)) uploadQueue.push({ file, folder: state.folder });
    pumpUploads();
  }

  const uploadQueue = [];
  let activeUploads = 0;
  function pumpUploads() {
    while (activeUploads < 2 && uploadQueue.length) {
      activeUploads++;
      const job = uploadQueue.shift();
      startUpload(job.file, job.folder);
    }
  }
  function startUpload(file, folder) {
    el.uploadWidget.classList.remove('hidden');
    el.uploadWidgetTitleText.textContent = `업로드 중 · 대기 ${uploadQueue.length}개`;

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
      xhr.open('POST', '/api/upload?path=' + encodeURIComponent(folder), true);
      xhr.setRequestHeader('X-CSRF-Token', Pulse.csrf);

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
          showToast('업로드 실패. 로그인과 저장 공간을 확인하세요.', () => { uploadQueue.push({ file, folder }); pumpUploads(); });
          itemEl.querySelector('.upload-progress-bar').style.backgroundColor = 'var(--apple-red)';
        }
      };

      xhr.onerror = () => {
        itemEl.querySelector('.upload-item-pct').textContent = '오류 ✕';
        showToast('업로드 연결 실패', () => { uploadQueue.push({ file, folder }); pumpUploads(); });
        itemEl.querySelector('.upload-progress-bar').style.backgroundColor = 'var(--apple-red)';
      };

      xhr.onloadend = () => { activeUploads--; pumpUploads(); };
      xhr.send(formData);
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

  // ==========================================================================
  // 🖥️ 가상 데스크탑 GUI (Cloud Desktop OS) 환경 구현
  // ==========================================================================
  let desktopClockTimer = null;
  let desktopInitialized = false;

  function setupDesktopEnvironment() {
    if (desktopInitialized) return;
    desktopInitialized = true;

    setupDesktopWindowControls();
    setupTerminalLogic();
    setupFinderLogic();
    setupEditorLogic();
    setupBrowserLogic();
    setupLinuxVncLogic();
    setupWallpaperTheme();

    // Start Desktop Clock
    updateDesktopClock();
    if (!desktopClockTimer) {
      desktopClockTimer = setInterval(updateDesktopClock, 1000);
    }
  }

  function initDesktopView() {
    setupDesktopEnvironment();
    updateDesktopClock();
    updateMenubarIndicators();


  }

  function updateDesktopClock() {
    if (document.hidden || state.currentAppView !== 'desktop') return;
    const clockEl = document.getElementById('desktop-clock');
    if (!clockEl) return;
    const now = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const day = days[now.getDay()];
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    clockEl.innerHTML = `<span>${month}월 ${date}일 (${day}) ${hours}:${mins}</span>`;
  }

  function updateMenubarIndicators() {
    const ipText = document.getElementById('menubar-ip-text');
    const batPct = document.getElementById('menubar-battery-pct');
    if (state.dashboardData) {
      if (ipText && state.dashboardData.network) {
        ipText.textContent = state.dashboardData.network.localIp;
      }
      if (batPct && state.dashboardData.battery && state.dashboardData.battery.percentage !== null) {
        batPct.textContent = `${state.dashboardData.battery.percentage}%`;
      } else if (batPct) { batPct.textContent = '—'; }
      const data = state.dashboardData;
      const labels = {
        'settings-os-version': data.version ? `Pulse OS ${data.version}` : 'Pulse OS · 버전 정보 없음',
        'about-os-version': data.version ? `버전 ${data.version.replace(/^v/, '')}` : '버전 정보 없음',
        'settings-device-name': data.osName || '기기 정보 없음',
        'about-device-name': data.osName || '기기 정보 없음',
        'about-cpu-name': data.cpu && data.cpu.cores ? `${data.cpu.cores}코어` : '정보 없음'
      };
      Object.entries(labels).forEach(([id, value]) => {
        const target = document.getElementById(id);
        if (target) target.textContent = value;
      });
      const aboutMem = document.getElementById('about-mem-name');
      if (aboutMem && state.dashboardData.memory) {
        aboutMem.textContent = state.dashboardData.memory.totalFormatted;
      }
    }
  }

  // Window Management
  function setupDesktopWindowControls() {
    // Desktop shortcut icons
    document.querySelectorAll('.desktop-shortcut').forEach(sc => {
      const appId = sc.getAttribute('data-app');
      sc.addEventListener('click', () => openDesktopWindow(appId));
      sc.addEventListener('dblclick', () => openDesktopWindow(appId));
      sc.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') openDesktopWindow(appId);
      });
    });

    // Dock icons
    document.querySelectorAll('.dock-item').forEach(btn => {
      const appId = btn.getAttribute('data-app');
      btn.addEventListener('click', () => {
        const win = document.getElementById('win-' + appId);
        if (!win) return;
        if (win.classList.contains('hidden')) {
          openDesktopWindow(appId);
        } else if (win.classList.contains('window-minimized')) {
          win.classList.remove('window-minimized');
          bringWindowToFront(appId);
        } else if (state.activeDesktopApp === appId) {
          // If already front, toggle minimize
          minimizeDesktopWindow(appId);
        } else {
          bringWindowToFront(appId);
        }
      });
    });

    // Menubar App Dropdown / Actions
    const appleBtn = document.getElementById('btn-desktop-apple');
    if (appleBtn) {
      appleBtn.addEventListener('click', () => openDesktopWindow('about'));
    }

    const fsBtn = document.getElementById('btn-desktop-fullscreen');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    document.querySelectorAll('.menubar-menus .menubar-item').forEach(item => {
      item.addEventListener('click', () => {
        const act = item.getAttribute('data-action');
        if (act === 'open-finder') openDesktopWindow('finder');
        else if (act === 'open-terminal') openDesktopWindow('terminal');
        else if (act === 'open-editor') openDesktopWindow('editor');
        else if (act === 'open-monitor') openDesktopWindow('monitor');
      });
    });

    // Traffic light buttons
    document.querySelectorAll('.traffic-light.btn-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeDesktopWindow(btn.getAttribute('data-app'));
      });
    });
    document.querySelectorAll('.traffic-light.btn-min').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        minimizeDesktopWindow(btn.getAttribute('data-app'));
      });
    });
    document.querySelectorAll('.traffic-light.btn-max').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        maximizeDesktopWindow(btn.getAttribute('data-app'));
      });
    });

    // Windows dragging and resizing
    document.querySelectorAll('.desktop-window').forEach(win => {
      const appId = win.getAttribute('data-app');
      win.addEventListener('mousedown', () => bringWindowToFront(appId));
      win.addEventListener('touchstart', () => bringWindowToFront(appId), { passive: true });
      makeWindowDraggable(win);
      makeWindowResizable(win);
    });
  }

  function openDesktopWindow(appId) {
    if (['terminal', 'linux'].includes(appId) && !Pulse.isAdmin) return;
    const win = document.getElementById('win-' + appId);
    if (!win) return;
    win.classList.remove('hidden');
    win.classList.remove('window-minimized');
    bringWindowToFront(appId);

    // Update Dock Dot
    const dot = document.querySelector(`.dock-dot[data-app-dot="${appId}"]`);
    if (dot) dot.classList.remove('hidden');

    if (appId === 'editor' && !document.getElementById('editor-filename-input').value) {
      document.getElementById('editor-filename-input').value = joinPath('Untitled.txt');
    }

    // Default sizing and cascading positioning
    if (!win.dataset.positioned) {
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      if (screenW <= 768) {
        win.style.top = '38px';
        win.style.left = '2.5%';
        win.style.width = '95%';
        win.style.height = `${screenH - 120}px`;
      } else {
        const count = Object.keys(state.openWindows).length;
        const offset = (count % 6) * 24;
        win.style.top = `${60 + offset}px`;
        win.style.left = `${90 + offset}px`;
        if (appId === 'terminal') { win.style.width = '640px'; win.style.height = '420px'; }
        else if (appId === 'finder') { win.style.width = '680px'; win.style.height = '440px'; }
        else if (appId === 'editor') { win.style.width = '700px'; win.style.height = '460px'; }
        else if (appId === 'monitor') { win.style.width = '560px'; win.style.height = '400px'; }
        else if (appId === 'browser') { win.style.width = '720px'; win.style.height = '480px'; }
        else if (appId === 'linux') { win.style.width = '720px'; win.style.height = '480px'; }
        else if (appId === 'settings') { win.style.width = '520px'; win.style.height = '380px'; }
        else if (appId === 'about') { win.style.width = '380px'; win.style.height = '340px'; }
      }
      win.dataset.positioned = 'true';
    }

    state.openWindows[appId] = true;

    // Trigger app initializations
    if (appId === 'terminal') {
      setTimeout(() => {
        const inp = document.getElementById('terminal-input');
        if (inp) inp.focus();
      }, 100);
    } else if (appId === 'finder') {
      renderFinderFiles();
    } else if (appId === 'monitor') {
      updateMonitorWidget();
    } else if (appId === 'linux') {
      checkVncStatus();
    }
  }

  async function closeDesktopWindow(appId) {
    if (appId === 'editor' && !await canLeaveEditor()) return;
    if (appId === 'editor') {
      document.getElementById('editor-textarea').value = state.editorSavedText || '';
      document.getElementById('editor-filename-input').value = state.editorSavedPath || '';
      state.editorDirty = false;
      document.getElementById('editor-save-status').textContent = state.editorSavedPath ? '저장됨 ✓' : '새 문서';
      editorStats();
    }
    const win = document.getElementById('win-' + appId);
    if (!win) return;
    win.classList.add('hidden');
    win.classList.remove('window-maximized');
    win.classList.remove('window-minimized');
    delete state.openWindows[appId];

    const dot = document.querySelector(`.dock-dot[data-app-dot="${appId}"]`);
    if (dot) dot.classList.add('hidden');

    document.querySelector(`.dock-item[data-app="${appId}"]`)?.classList.remove('active');
    const remaining = Object.keys(state.openWindows).filter(id => !document.getElementById('win-' + id).classList.contains('window-minimized'));
    if (remaining.length > 0) {
      bringWindowToFront(remaining[remaining.length - 1]);
    } else {
      const titleEl = document.getElementById('desktop-active-app-name');
      if (titleEl) titleEl.textContent = 'Pulse OS';
    }
  }

  function minimizeDesktopWindow(appId) {
    const win = document.getElementById('win-' + appId);
    if (!win) return;
    win.classList.add('window-minimized');
    document.querySelectorAll('.dock-item').forEach(item => item.classList.remove('active'));
    const title = document.getElementById('desktop-active-app-name');
    if (title) title.textContent = 'Pulse OS';
  }

  function maximizeDesktopWindow(appId) {
    const win = document.getElementById('win-' + appId);
    if (!win) return;
    win.classList.toggle('window-maximized');
  }

  function bringWindowToFront(appId) {
    const win = document.getElementById('win-' + appId);
    if (!win) return;
    state.topZIndex++;
    win.style.zIndex = state.topZIndex;
    state.activeDesktopApp = appId;
    document.querySelectorAll('.desktop-window').forEach(item => item.classList.toggle('mobile-background', item !== win));
    document.querySelectorAll('.dock-item').forEach(item => {
      item.classList.toggle('active', item.dataset.app === appId);
      item.setAttribute('aria-pressed', String(item.dataset.app === appId));
    });

    const names = {
      terminal: 'Pulse 터미널',
      finder: 'Pulse 파일',
      editor: 'Pulse 에디터',
      monitor: 'Pulse 모니터',
      browser: 'Pulse 브라우저',
      linux: 'Linux 데스크톱',
      settings: 'Pulse OS 설정',
      about: 'Pulse OS 정보'
    };
    const titleEl = document.getElementById('desktop-active-app-name');
    if (titleEl) titleEl.textContent = names[appId] || 'Pulse OS';
  }

  function makeWindowDraggable(win) {
    const header = win.querySelector('.window-header');
    if (!header) return;

    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    function onStart(clientX, clientY) {
      if (window.innerWidth <= 768) return;
      if (win.classList.contains('window-maximized')) return;
      isDragging = true;
      bringWindowToFront(win.getAttribute('data-app'));
      startX = clientX;
      startY = clientY;
      const rect = win.getBoundingClientRect();
      const canvas = document.getElementById('desktop-canvas');
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      initialLeft = rect.left - canvasRect.left;
      initialTop = rect.top - canvasRect.top;
    }

    function onMove(clientX, clientY) {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;
      const canvas = document.getElementById('desktop-canvas');
      if (!canvas) return;
      const maxLeft = canvas.clientWidth - 80;
      const maxTop = canvas.clientHeight - 80;

      const newLeft = Math.max(0, Math.min(initialLeft + dx, maxLeft));
      const newTop = Math.max(0, Math.min(initialTop + dy, maxTop));
      win.style.left = `${newLeft}px`;
      win.style.top = `${newTop}px`;
    }

    function onEnd() {
      isDragging = false;
    }

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.traffic-light') || e.target.closest('.win-btn-sm')) return;
      onStart(e.clientX, e.clientY);
      const moveHandler = (ev) => onMove(ev.clientX, ev.clientY);
      const upHandler = () => {
        onEnd();
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
      };
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', upHandler);
    });

    header.addEventListener('touchstart', (e) => {
      if (e.target.closest('.traffic-light') || e.target.closest('.win-btn-sm')) return;
      if (e.touches.length === 1) {
        onStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    header.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length === 1) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    header.addEventListener('touchend', onEnd);
  }

  function makeWindowResizable(win) {
    const handle = win.querySelector('.window-resize-handle');
    if (!handle) return;

    let isResizing = false;
    let startX = 0, startY = 0;
    let startW = 0, startH = 0;

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startW = win.offsetWidth;
      startH = win.offsetHeight;
      bringWindowToFront(win.getAttribute('data-app'));

      const onMouseMove = (ev) => {
        if (!isResizing) return;
        const newW = Math.max(300, startW + (ev.clientX - startX));
        const newH = Math.max(200, startH + (ev.clientY - startY));
        win.style.width = `${newW}px`;
        win.style.height = `${newH}px`;
      };

      const onMouseUp = () => {
        isResizing = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // [App 1: Terminal]
  function setupTerminalLogic() {
    const form = document.getElementById('terminal-form');
    const input = document.getElementById('terminal-input');
    const output = document.getElementById('terminal-output');
    const promptEl = document.getElementById('terminal-prompt');
    const clearBtn = document.getElementById('btn-term-clear');

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        output.innerHTML = '';
      });
    }

    document.querySelectorAll('.preset-cmd-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.getAttribute('data-cmd');
        if (cmd) executeCommand(cmd);
      });
    });

    if (form && input) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const cmd = input.value.trim();
        if (!cmd || state.terminalBusy) return;
        input.value = '';
        executeCommand(cmd);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') {
          if (state.terminalHistoryIdx < state.terminalHistory.length - 1) {
            state.terminalHistoryIdx++;
            input.value = state.terminalHistory[state.terminalHistory.length - 1 - state.terminalHistoryIdx];
          }
          e.preventDefault();
        } else if (e.key === 'ArrowDown') {
          if (state.terminalHistoryIdx > 0) {
            state.terminalHistoryIdx--;
            input.value = state.terminalHistory[state.terminalHistory.length - 1 - state.terminalHistoryIdx];
          } else if (state.terminalHistoryIdx === 0) {
            state.terminalHistoryIdx = -1;
            input.value = '';
          }
          e.preventDefault();
        }
      });
    }

    async function executeCommand(cmd) {
      if (state.terminalBusy || !Pulse.isAdmin) return;
      state.terminalHistory.push(cmd);
      state.terminalHistoryIdx = -1;

      const line = document.createElement('div');
      line.className = 'term-line term-cmd';
      line.textContent = `${promptEl.textContent} ${cmd}`;
      output.appendChild(line);

      if (cmd === 'clear') {
        output.innerHTML = '';
        return;
      }
      if (cmd === 'help') {
        const helpLine = document.createElement('div');
        helpLine.className = 'term-line term-info';
        helpLine.textContent = `[Pulse 터미널 도움말]
- Pulse 서버가 실행 중인 기기의 쉘 명령을 수행합니다 (예: ls, pwd, df -h, python3, git 등).
- 'cd <dir>'로 작업 디렉토리를 자유롭게 이동할 수 있습니다.
- 상단의 자주 쓰는 명령어 버튼을 누르면 즉시 실행됩니다.`;
        output.appendChild(helpLine);
        output.scrollTop = output.scrollHeight;
        return;
      }
      if (cmd === 'exit') {
        closeDesktopWindow('terminal');
        return;
      }

      state.terminalBusy = true;
      const status = document.getElementById('terminal-status');
      status.textContent = '실행 중 · 최대 15초';
      status.dataset.busy = 'true';
      const controls = document.querySelectorAll('#terminal-form button, .preset-cmd-btn, #btn-term-clear');
      controls.forEach(button => { button.disabled = true; });
      try {
        const res = await fetch('/api/terminal/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd, cwd: state.terminalCwd })
        });
        const data = await res.json();
        status.textContent = data.exitCode === 0 ? '실행 완료 · 최대 15초' : `실행 실패 · 종료 코드 ${data.exitCode ?? res.status}`;
        if (data.cwd) {
          state.terminalCwd = data.cwd;
          const shortCwd = data.cwd.split('/').slice(-2).join('/') || data.cwd;
          promptEl.textContent = `pulse:${shortCwd}$`;
        }
        const outLine = document.createElement('div');
        outLine.className = `term-line ${data.exitCode === 0 ? 'term-success' : 'term-err'}`;
        outLine.textContent = data.output || data.error || (data.exitCode === 0 ? '(성공 - 반환값 없음)' : `종료 코드: ${data.exitCode}`);
        output.appendChild(outLine);
      } catch (err) {
        const errLine = document.createElement('div');
        errLine.className = 'term-line term-err';
        errLine.textContent = `실행 통신 오류: ${err.message}`;
        status.textContent = '연결 실패 · 서버에서 명령이 실행 중일 수 있습니다.';
        output.appendChild(errLine);
      } finally {
        state.terminalBusy = false;
        status.dataset.busy = 'false';
        controls.forEach(button => { button.disabled = false; });
      }
      output.scrollTop = output.scrollHeight;
    }
  }

  // [App 2: Finder]
  function setupFinderLogic() {
    const newFileBtn = document.getElementById('btn-finder-new-file');
    const refreshBtn = document.getElementById('btn-finder-refresh');

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        fetchFiles().then(() => renderFinderFiles());
      });
    }

    if (newFileBtn) {
      newFileBtn.addEventListener('click', async () => {
        const name = await Pulse.ask('생성할 파일명을 입력하세요 (예: script.py, memo.txt):', { input: true });
        if (!name || !name.trim()) return;
        fetch('/api/files/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: joinPath(name.trim()), content: '' })
        })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            showToast(`'${data.filename}' 파일이 생성되었습니다.`);
            fetchFiles().then(() => {
              renderFinderFiles();
              openEditorWithFile(data.filename);
            });
          } else {
            showToast('파일 생성 실패: ' + (data.error || '오류'));
          }
        })
        .catch(err => showToast('파일 생성 통신 오류: ' + err.message));
      });
    }

    // Filter sidebar
    document.querySelectorAll('.finder-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.finder-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        state.currentFilter = item.getAttribute('data-finder-filter') || 'all';
        state.page = 1;
        fetchFiles();
      });
    });
  }

  function getFileEmoji(file) {
    if (file.type === 'folder') return Pulse.icon('finder');
    if (file.type === 'image') return '🖼️';
    if (file.type === 'video') return '🎬';
    if (file.type === 'audio') return '🎵';
    if (file.type === 'pdf') return '📕';
    if (file.isText) return '📝';
    if (file.type === 'archive') return '📦';
    return '📄';
  }

  function renderFinderFiles() {
    const grid = document.getElementById('finder-file-grid');
    const status = document.getElementById('finder-status-text');
    if (!grid) return;
    grid.innerHTML = '';

    const list = state.files;

    if (status) status.textContent = `${state.total}개 항목 · ${state.page}/${state.pages}페이지`;

    if (list.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #86868b; padding: 24px; font-size: 13px;">파일이 없습니다.</div>';
      return;
    }

    list.forEach(file => {
      const item = document.createElement('div');
      item.className = 'finder-item';
      item.innerHTML = `
        <div class="finder-item-icon">${getFileEmoji(file)}</div>
        <div class="finder-item-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
      `;

      item.addEventListener('click', () => {
        if (file.type === 'folder') { navigateFolder(file.path); return; }
        if (file.isText) {
          openEditorWithFile(file.path || file.name);
        } else {
          state.previewableList = state.files;
          const idx = state.files.findIndex(f => f.path === file.path);
          if (idx !== -1) openPreview(idx);
        }
      });

      addSelection(item, file);
      grid.appendChild(item);
    });
  }

  async function canLeaveEditor() {
    if (state.editorBusy) { showToast('파일을 불러오거나 저장하는 중입니다. 잠시 기다려주세요.'); return false; }
    return !state.editorDirty || Boolean(await Pulse.ask('저장하지 않은 변경 내용이 있습니다. 변경 내용을 버리고 계속할까요?', { confirm: '변경 버리기' }));
  }

  function editorStats() {
    const text = document.getElementById('editor-textarea').value;
    const lines = text.split('\n').length;
    document.getElementById('editor-stats-badge').textContent = `${lines}줄 | ${text.length}자`;
    document.getElementById('editor-gutter').textContent = Array.from({ length: Math.min(lines, 10000) }, (_, i) => i + 1).join('\n');
  }
  function editorBusy(busy) {
    state.editorBusy = busy;
    document.getElementById('editor-textarea').readOnly = busy || !Pulse.isAdmin;
    document.getElementById('editor-filename-input').disabled = busy || !Pulse.isAdmin;
    document.getElementById('btn-editor-save').disabled = busy || !Pulse.isAdmin;
  }
  function setupEditorLogic() {
    const textarea = document.getElementById('editor-textarea');
    const filename = document.getElementById('editor-filename-input');
    const dirty = () => {
      state.editorDirty = true;
      document.getElementById('editor-save-status').textContent = '저장 안 됨';
      document.getElementById('editor-save-status').classList.remove('green');
      editorStats();
    };
    textarea.addEventListener('input', dirty);
    filename.addEventListener('input', dirty);
    textarea.addEventListener('scroll', () => { document.getElementById('editor-gutter').scrollTop = textarea.scrollTop; });
    textarea.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault(); saveEditorContent();
      }
      if (event.key === 'Tab' && !textarea.readOnly) {
        event.preventDefault();
        textarea.setRangeText('    ', textarea.selectionStart, textarea.selectionEnd, 'end');
        dirty();
      }
    });
    document.getElementById('btn-editor-save').addEventListener('click', saveEditorContent);
    window.addEventListener('beforeunload', event => {
      if (state.editorDirty || state.editorBusy) { event.preventDefault(); event.returnValue = ''; }
    });
    editorBusy(false);
  }
  async function saveEditorContent() {
    if (state.editorBusy || !Pulse.isAdmin) return;
    const filename = document.getElementById('editor-filename-input').value.trim();
    if (!filename) { showToast('저장할 파일명을 입력하세요.'); return; }
    editorBusy(true);
    const status = document.getElementById('editor-save-status');
    status.textContent = '저장 중…';
    try {
      await Pulse.post('/api/files/save', { filename, content: document.getElementById('editor-textarea').value });
      state.editorDirty = false;
      state.editorSavedText = document.getElementById('editor-textarea').value;
      state.editorSavedPath = filename;
      status.textContent = '저장됨 ✓';
      status.classList.add('green');
      document.getElementById('editor-win-title').textContent = `Pulse 에디터 — ${filename}`;
      fetchFiles();
      fetchStorageStats();
    } catch (error) {
      status.textContent = '저장 실패 · 다시 시도하세요';
      showToast(error.message, saveEditorContent);
    } finally { editorBusy(false); }
  }
  async function openEditorWithFile(filename) {
    if (!await canLeaveEditor() || state.editorBusy) return;
    editorBusy(true);
    const status = document.getElementById('editor-save-status');
    status.textContent = '불러오는 중…';
    try {
      const response = await fetch('/api/preview/' + encodeURIComponent(filename));
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '파일을 불러올 수 없습니다.');
      }
      const content = await response.text();
      document.getElementById('editor-textarea').value = content;
      document.getElementById('editor-filename-input').value = filename;
      document.getElementById('editor-win-title').textContent = `Pulse 에디터 — ${filename}`;
      state.editorDirty = false;
      state.editorSavedText = content;
      state.editorSavedPath = filename;
      editorStats();
      status.textContent = Pulse.isAdmin ? '저장됨 ✓' : '읽기 전용';
      status.classList.add('green');
      openDesktopWindow('editor');
    } catch (error) {
      status.textContent = '불러오기 실패 · 기존 내용 유지';
      status.classList.remove('green');
      showToast(error.message, () => openEditorWithFile(filename));
    } finally { editorBusy(false); }
  }

  // [App 4: Activity Monitor Widget]
  function updateMonitorWidget() {
    if (!state.dashboardData) return;
    const d = state.dashboardData;

    const cpuPct = document.getElementById('mon-cpu-pct');
    const cpuBar = document.getElementById('mon-cpu-bar');
    const cpuDetail = document.getElementById('mon-cpu-detail');
    if (cpuPct && d.cpu) {
      cpuPct.textContent = metricPercent(d.cpu);
      cpuBar.style.width = `${d.cpu.percent || 0}%`;
      cpuDetail.textContent = `${d.cpu.label || 'CPU'} · ${d.cpu.cores}코어 | 1분 부하: ${d.cpu.load1 ?? '측정 불가'}`;
    }

    const memPct = document.getElementById('mon-mem-pct');
    const memBar = document.getElementById('mon-mem-bar');
    const memDetail = document.getElementById('mon-mem-detail');
    if (memPct && d.memory) {
      memPct.textContent = metricPercent(d.memory);
      memBar.style.width = `${d.memory.percent || 0}%`;
      memDetail.textContent = `사용: ${d.memory.usedFormatted} / ${d.memory.totalFormatted}`;
    }

    const batPct = document.getElementById('mon-bat-pct');
    const batBar = document.getElementById('mon-bat-bar');
    const batDetail = document.getElementById('mon-bat-detail');
    if (batPct && d.battery) {
      const pct = d.battery.percentage !== null ? d.battery.percentage : 0;
      batPct.textContent = d.battery.supported ? `${pct}%` : '측정 불가';
      batBar.style.width = `${pct}%`;
      batDetail.textContent = `상태: ${d.battery.status} (${d.battery.plugged})`;
    }

    const diskPct = document.getElementById('mon-disk-pct');
    const diskBar = document.getElementById('mon-disk-bar');
    const diskDetail = document.getElementById('mon-disk-detail');
    if (diskPct && d.disk) {
      diskPct.textContent = `${d.disk.percent}%`;
      diskBar.style.width = `${d.disk.percent}%`;
      diskDetail.textContent = `클라우드: ${d.disk.cloudUsedFormatted} (여유: ${d.disk.freeFormatted})`;
    }

    const uptime = document.getElementById('mon-uptime');
    const ip = document.getElementById('mon-ip');
    const pid = document.getElementById('mon-pid');
    if (uptime && d.uptime) uptime.textContent = d.uptime.formatted;
    if (ip && d.network) ip.textContent = `${d.network.localIp}:${d.network.port}`;
    if (pid) pid.textContent = d.pid;

    const refreshBtn = document.getElementById('btn-monitor-refresh');
    if (refreshBtn && !refreshBtn.dataset.bound) {
      refreshBtn.dataset.bound = 'true';
      refreshBtn.addEventListener('click', () => {
        fetchDashboardData(true).then(() => updateMonitorWidget());
      });
    }
  }

  // [App 5: Browser]
  function setupBrowserLogic() {
    const input = document.getElementById('browser-url-input');
    const goBtn = document.getElementById('btn-browser-go');
    const homeBtn = document.getElementById('btn-browser-home');
    const iframe = document.getElementById('browser-iframe');

    function navigate() {
      let url = (input.value || '').trim();
      if (!url) return;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      iframe.src = url;
    }

    if (goBtn) goBtn.addEventListener('click', navigate);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') navigate();
      });
    }
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        input.value = 'https://ko.wikipedia.org';
        navigate();
      });
    }
  }

  // [App 6: Linux GUI / noVNC]
  function setupLinuxVncLogic() {
    const refreshBtn = document.getElementById('btn-vnc-refresh');
    const connectBtn = document.getElementById('btn-connect-vnc');
    const copyCmdBtn = document.getElementById('btn-copy-vnc-cmd');

    if (refreshBtn) refreshBtn.addEventListener('click', checkVncStatus);
    if (connectBtn) connectBtn.addEventListener('click', checkVncStatus);
    if (copyCmdBtn) {
      copyCmdBtn.addEventListener('click', () => {
        const cmd = './setup-desktop.sh start';
        navigator.clipboard.writeText(cmd).then(() => {
          showToast('✓ 구축 명령어가 복사되었습니다: ' + cmd);
        }).catch(() => {
          showToast('복사 실패');
        });
      });
    }
  }

  async function checkVncStatus() {
    const setupView = document.getElementById('vnc-setup-view');
    const activeView = document.getElementById('vnc-active-view');
    const iframe = document.getElementById('vnc-iframe');
    try {
      const data = await Pulse.api('/api/system/vnc-status');
      const saved = localStorage.getItem('pulse_vnc_url');
      if (!data.running && !data.url && !saved) throw new Error('Linux 데스크톱이 실행되지 않았습니다. Termux에서 setup-desktop.sh start를 실행하세요.');
      const defaultUrl = new URL(location.origin);
      defaultUrl.port = String(data.port);
      defaultUrl.pathname = '/vnc.html';
      const url = new URL(saved || data.url || defaultUrl.href);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('HTTP 또는 HTTPS 주소를 입력하세요.');
      if (location.protocol === 'https:' && url.protocol !== 'https:') throw new Error('HTTPS 접속에서는 Linux 데스크톱도 HTTPS 주소가 필요합니다. 연결 주소를 설정하세요.');
      url.searchParams.set('autoconnect', 'true');
      iframe.src = url.href;
      document.getElementById('btn-open-vnc-tab').href = url.href;
      setupView.classList.add('hidden');
      activeView.classList.remove('hidden');
      showToast('연결 화면을 열었습니다. 연결되지 않으면 주소와 noVNC 서버를 확인하세요.');
    } catch (error) {
      iframe.src = '';
      activeView.classList.add('hidden');
      setupView.classList.remove('hidden');
      showToast(error.message, checkVncStatus);
    }
  }

  // [App 7: Settings & Wallpaper]
  function setupWallpaperTheme() {
    const screen = document.getElementById('desktop-screen');
    document.querySelectorAll('.wp-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme');
        document.querySelectorAll('.wp-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (screen) {
          screen.className = `desktop-screen theme-${theme}`;
        }
        localStorage.setItem('desktop_theme', theme);
      });
    });

    const savedTheme = localStorage.getItem('desktop_theme') || 'sonoma';
    if (screen) screen.className = `desktop-screen theme-${savedTheme}`;
    const activeBtn = document.querySelector(`.wp-option[data-theme="${savedTheme}"]`);
    if (activeBtn) {
      document.querySelectorAll('.wp-option').forEach(b => b.classList.remove('active'));
      activeBtn.classList.add('active');
    }
  }

  // ================= Utilities =================
  function showToast(message, retry, actionLabel = '다시 시도') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <span>${escapeHtml(message)}</span>
    `;
    toast.setAttribute('role', 'status');
    if (retry) {
      const button = document.createElement('button');
      button.className = 'btn btn-outline';
      button.textContent = actionLabel;
      button.addEventListener('click', () => { toast.remove(); retry(); });
      toast.appendChild(button);
    }
    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, retry ? 10000 : 4000);
  }

  function getTypeLabel(type) {
    const labels = {
      folder: '폴더',
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
      case 'folder': return Pulse.icon('finder');
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
