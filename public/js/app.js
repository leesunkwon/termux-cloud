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
    btnCloudNewFolder: document.getElementById('btn-cloud-new-folder'),
    cloudBreadcrumbBar: document.getElementById('cloud-breadcrumb-bar'),
    breadcrumbTrail: document.getElementById('breadcrumb-trail'),
    btnCloudUp: document.getElementById('btn-cloud-up'),
    uploadBtn: document.getElementById('upload-btn'),
    fileInput: document.getElementById('file-input'),

    // Sidebar
    sidebar: document.getElementById('sidebar'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    navItems: document.querySelectorAll('.nav-item'),
    countAll: document.getElementById('count-all'),
    countFolder: document.getElementById('count-folder'),
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
        checkServerUpdate(true);
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

    // Cloud New Folder & Up Directory
    if (el.btnCloudNewFolder) {
      el.btnCloudNewFolder.addEventListener('click', async () => {
        const name = await Pulse.ask('생성할 폴더명을 입력하세요:', { input: true, value: '새 폴더' });
        if (!name || !name.trim()) return;
        const cleanName = name.trim();
        if (cleanName.includes('/') || cleanName.includes('\\')) {
          showToast('폴더 이름에 경로 구분자를 사용할 수 없습니다.');
          return;
        }
        try {
          await Pulse.post('/api/folders', { path: joinPath(cleanName) });
          showToast(`'${cleanName}' 폴더가 생성되었습니다.`);
          await fetchFiles();
          if (typeof renderFinderFiles === 'function') renderFinderFiles();
        } catch (err) {
          showToast('폴더 생성 실패: ' + err.message);
        }
      });
    }

    if (el.btnCloudUp) {
      el.btnCloudUp.addEventListener('click', () => {
        if (!state.folder) return;
        const parent = state.folder.split('/').slice(0, -1).join('/');
        navigateFolder(parent);
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
      const res = await fetch('/api/system/check-update' + (isManual ? '?force=1' : ''), { cache: 'no-store' });
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
        await Pulse.ask('다운로드 완료. 스마트폰 Termux에서 termux-cloud restart를 실행하세요. 이후 새로고침하면 적용됩니다.', { cancel: false });
        return;
      }
      label('2/3 · 서버 재시작 중');
      if (!data.restartScheduled) await Pulse.post('/api/system/restart');
      label('3/3 · 서버 재접속 확인 중');
      for (let count = 0; count < 30; count++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        let health;
        try {
          health = await Pulse.api('/api/system/health', { signal: AbortSignal.timeout(3000) });
          if (health.instanceId !== data.instanceId) {
            state.editorDirty = false;
            location.reload();
            return;
          }
        } catch (_) { /* The process is restarting. */ }
        if (health?.restartError) throw new Error(health.restartError);
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
    if (state.currentFilter !== 'all') {
      state.currentFilter = 'all';
      el.navItems.forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-filter') === 'all');
      });
      updateTitle();
    }
    fetchFiles();
  }

  function renderBreadcrumbs() {
    if (!el.breadcrumbTrail) return;
    el.breadcrumbTrail.innerHTML = '';

    const rootBtn = document.createElement('button');
    rootBtn.className = `breadcrumb-item ${!state.folder ? 'active' : ''}`;
    rootBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span>내 보관함</span>
    `;
    rootBtn.addEventListener('click', () => navigateFolder(''));
    el.breadcrumbTrail.appendChild(rootBtn);

    if (state.folder) {
      if (el.btnCloudUp) el.btnCloudUp.classList.remove('hidden');
      const parts = state.folder.split('/').filter(Boolean);
      let accumulated = '';
      parts.forEach((part, idx) => {
        accumulated = accumulated ? `${accumulated}/${part}` : part;
        const targetPath = accumulated;
        const isLast = idx === parts.length - 1;

        const sep = document.createElement('span');
        sep.className = 'breadcrumb-sep';
        sep.textContent = '/';
        el.breadcrumbTrail.appendChild(sep);

        const btn = document.createElement('button');
        btn.className = `breadcrumb-item ${isLast ? 'active' : ''}`;
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <span>${escapeHtml(part)}</span>
        `;
        btn.addEventListener('click', () => navigateFolder(targetPath));
        el.breadcrumbTrail.appendChild(btn);
      });
    } else {
      if (el.btnCloudUp) el.btnCloudUp.classList.add('hidden');
    }
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
      if (action === 'select') {
        const label = button.querySelector('.btn-label') || button;
        label.textContent = state.selected.size ? `선택 해제 (${state.selected.size})` : '전체 선택';
      }
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
        await Pulse.post('/api/rename', { oldPath: source, newName: name });
      }
      if (action === 'move') {
        const target = await Pulse.ask('이동할 대상 폴더 (비워두면 최상위 폴더)', { input: true });
        if (target === null) return;
        await Pulse.post('/api/move', { paths: [...state.selected], destination: target.trim() });
      }
      if (action === 'delete') {
        if (!await Pulse.ask(`선택한 ${state.selected.size}개 항목을 휴지통으로 이동할까요?`, { confirm: '휴지통 이동' })) return;
        await Pulse.post('/api/batch/delete', { paths: [...state.selected] });
      }
      state.selected.clear();
      await fetchFiles();
      if (typeof renderFinderFiles === 'function') renderFinderFiles();
      fetchStorageStats();
      fetchDashboardData(true);
      showToast('작업을 완료했습니다.');
    } catch (error) {
      await Pulse.ask(error.message, { cancel: false });
    }
  }
  const fileActionMeta = {
    home: {
      text: '보관함',
      cls: 'btn btn-secondary btn-file-nav',
      icon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
    },
    up: {
      text: '상위 폴더',
      cls: 'btn btn-secondary btn-file-nav',
      icon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>'
    },
    mkdir: {
      text: '새 폴더',
      cls: 'btn btn-primary btn-file-create',
      icon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>'
    },
    select: {
      text: '전체 선택',
      cls: 'btn btn-outline btn-file-util',
      icon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
    },
    rename: {
      text: '이름 변경',
      cls: 'btn btn-outline btn-file-util',
      icon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
    },
    move: {
      text: '이동',
      cls: 'btn btn-outline btn-file-util',
      icon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>'
    },
    delete: {
      text: '휴지통 이동',
      cls: 'btn btn-danger-subtle btn-file-danger',
      icon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
    },
    trash: {
      text: '휴지통',
      cls: 'btn btn-outline btn-file-trash',
      icon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>'
    },
    prev: {
      text: '이전',
      cls: 'btn btn-secondary btn-pager',
      icon: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>'
    },
    next: {
      text: '다음',
      cls: 'btn btn-secondary btn-pager',
      icon: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>'
    }
  };
  async function openTrash() {
    const data = await Pulse.api('/api/trash');
    const dialog = document.getElementById('pulse-trash');
    const list = document.getElementById('pulse-trash-list');
    list.replaceChildren();
    if (!data.items.length) {
      list.innerHTML = '<div class="pulse-trash-empty">휴지통이 비어 있습니다.</div>';
    }
    for (const item of data.items) {
      const row = document.createElement('div');
      row.className = 'pulse-trash-row';
      const name = document.createElement('span');
      name.className = 'pulse-trash-name';
      name.textContent = item.path;
      row.appendChild(name);

      const actionGroup = document.createElement('div');
      actionGroup.className = 'pulse-trash-actions';

      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'btn btn-success btn-trash-restore';
      restoreBtn.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg><span>복원</span>';
      restoreBtn.addEventListener('click', async () => {
        restoreBtn.disabled = true;
        try {
          await Pulse.post(`/api/trash/${item.id}/restore`);
          await openTrash(); await fetchFiles(); fetchStorageStats();
          showToast('파일을 복원했습니다.');
        } catch (error) { await Pulse.ask(error.message, { cancel: false }); }
        finally { restoreBtn.disabled = false; }
      });
      actionGroup.appendChild(restoreBtn);

      const purgeBtn = document.createElement('button');
      purgeBtn.className = 'btn btn-danger btn-trash-purge';
      purgeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg><span>영구 삭제</span>';
      purgeBtn.addEventListener('click', async () => {
        if (!await Pulse.ask(`'${item.path}'을 영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.`, { confirm: '영구 삭제' })) return;
        purgeBtn.disabled = true;
        try {
          await Pulse.api(`/api/trash/${item.id}`, { method: 'DELETE' });
          await openTrash(); await fetchFiles(); fetchStorageStats();
          showToast('영구 삭제되었습니다.');
        } catch (error) { await Pulse.ask(error.message, { cancel: false }); }
        finally { purgeBtn.disabled = false; }
      });
      actionGroup.appendChild(purgeBtn);

      row.appendChild(actionGroup);
      list.appendChild(row);
    }
    if (!dialog.open) dialog.showModal();
  }
  function setupFileTools() {
    const dialog = document.createElement('dialog');
    dialog.id = 'pulse-trash';
    dialog.className = 'pulse-dialog pulse-trash-dialog';
    dialog.setAttribute('aria-label', '휴지통');
    dialog.innerHTML = '<div class="pulse-trash-header"><h2>♻️ 휴지통</h2><p>영구 삭제 전까지 저장 공간을 사용합니다.</p></div><div id="pulse-trash-list"></div><form method="dialog" class="pulse-trash-footer"><button class="btn btn-secondary">닫기</button></form>';
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
      for (const [action, meta] of Object.entries(fileActionMeta)) {
        const button = document.createElement('button');
        button.className = meta.cls;
        button.dataset.fileAction = action;
        button.innerHTML = `<span class="btn-icon" aria-hidden="true">${meta.icon}</span><span class="btn-label">${meta.text}</span>`;
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
    if (el.countFolder) el.countFolder.textContent = counts.folder || 0;
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
    renderBreadcrumbs();
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
      } else if (state.folder) {
        const folderName = state.folder.split('/').pop() || state.folder;
        el.emptyTitle.textContent = `'${folderName}' 폴더가 비어 있습니다`;
        el.emptyDesc.textContent = "상단의 '업로드' 또는 '새 폴더' 버튼을 눌러 파일을 추가하세요.";
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
      const isFolder = file.type === 'folder';
      card.className = isFolder ? 'file-card file-card-folder' : 'file-card';
      card.setAttribute('data-index', index);

      let thumbContent = '';
      if (isFolder) {
        thumbContent = `
          <div class="file-thumb-folder-placeholder">
            <svg class="folder-svg-icon" viewBox="0 0 24 24" width="54" height="54" fill="#ffd159" stroke="#e09d17" stroke-width="1.2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <span class="folder-badge-tag">폴더</span>
          </div>
        `;
      } else if (file.type === 'image' && file.thumbnailUrl) {
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
            <span class="doc-badge-ext">${escapeHtml(file.extension ? file.extension.toUpperCase() : 'TXT')}</span>
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          </div>
        `;
      } else {
        thumbContent = `
          <div class="file-thumb-icon-placeholder">
            ${getFileTypeIconSvg(file.type)}
            <span class="doc-badge-ext">${escapeHtml(file.extension ? file.extension.toUpperCase() : 'FILE')}</span>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="file-thumbnail-wrap">
          ${thumbContent}
          <div class="file-card-actions">
            ${isFolder ? `
            <button class="card-action-btn btn-open" title="폴더 열기" data-action="open">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </button>` : `
            <button class="card-action-btn btn-dl" title="다운로드" data-action="download">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>`}
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

      const btnOpen = card.querySelector('.btn-open');
      const btnDl = card.querySelector('.btn-dl');
      const btnDel = card.querySelector('.btn-del');

      if (btnOpen) {
        btnOpen.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          navigateFolder(file.path);
        });
      }

      if (btnDl) {
        btnDl.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          downloadFile(file.path || file.name);
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
        if (isFolder) {
          navigateFolder(file.path);
        } else {
          openPreview(index);
        }
      });

      if (isFolder) {
        card.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.stopPropagation();
          card.classList.add('drag-hover-folder');
        });
        card.addEventListener('dragleave', (e) => {
          e.preventDefault();
          e.stopPropagation();
          card.classList.remove('drag-hover-folder');
        });
        card.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          card.classList.remove('drag-hover-folder');
          if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            for (const f of Array.from(e.dataTransfer.files)) {
              uploadQueue.push({ file: f, folder: file.path });
            }
            pumpUploads();
            showToast(`'${file.name}' 폴더로 ${e.dataTransfer.files.length}개 파일 업로드를 시작합니다.`);
          }
        });
      }

      addSelection(card, file);
      card.querySelector('img')?.addEventListener('error', event => { event.target.hidden = true; });
      el.fileGrid.appendChild(card);
    });
  }

  function renderList(files) {
    el.fileListBody.innerHTML = '';
    files.forEach((file, index) => {
      const tr = document.createElement('tr');
      const isFolder = file.type === 'folder';
      tr.className = isFolder ? 'file-row file-row-folder' : 'file-row';

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
            ${isFolder ? `
            <button class="row-action-btn btn-open" title="폴더 열기">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </button>` : `
            <button class="row-action-btn btn-view" title="미리보기">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path></svg>
            </button>
            <button class="row-action-btn btn-dl" title="다운로드">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>`}
            <button class="row-action-btn btn-del" title="삭제">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      `;

      const btnOpen = tr.querySelector('.btn-open');
      const btnView = tr.querySelector('.btn-view');
      const btnDl = tr.querySelector('.btn-dl');
      const btnDel = tr.querySelector('.btn-del');

      if (btnOpen) {
        btnOpen.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          navigateFolder(file.path);
        });
      }
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
          downloadFile(file.path || file.name);
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
        if (isFolder) {
          navigateFolder(file.path);
        } else {
          openPreview(index);
        }
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
    setupContextMenu();
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

  // Desktop OS Right-click Context Menu
  function setupContextMenu() {
    const ctxMenu = document.getElementById('desktop-context-menu');
    const screen = document.getElementById('desktop-screen');
    if (!ctxMenu || !screen) return;

    function hideMenu() {
      ctxMenu.classList.add('hidden');
      ctxMenu.innerHTML = '';
    }

    document.addEventListener('click', (e) => {
      if (!ctxMenu.contains(e.target)) hideMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideMenu();
    });
    window.addEventListener('blur', hideMenu);

    function handleContextMenu(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        hideMenu();
        return;
      }

      const finderItem = e.target.closest('.finder-item');
      const windowEl = e.target.closest('.desktop-window');
      const dockEl = e.target.closest('.desktop-dock');
      const menubarEl = e.target.closest('.desktop-menubar');

      if (windowEl && !finderItem) {
        hideMenu();
        return;
      }
      if (dockEl || menubarEl) {
        hideMenu();
        return;
      }

      e.preventDefault();

      if (finderItem) {
        const path = finderItem.dataset.path;
        const file = finderItem._file || state.files.find(f => f.path === path);
        if (!file) { hideMenu(); return; }

        const isDir = file.type === 'folder';
        ctxMenu.innerHTML = `
          <div class="ctx-item" data-action="open">
            <span class="ctx-icon">${isDir ? '📂' : (file.isText ? '📝' : '👁️')}</span>
            <span class="ctx-label">${isDir ? '열기' : (file.isText ? '에디터로 편집' : '미리보기')}</span>
          </div>
          ${!isDir ? `
          <div class="ctx-item" data-action="download">
            <span class="ctx-icon">⬇️</span>
            <span class="ctx-label">다운로드</span>
          </div>` : ''}
          ${Pulse.isAdmin ? `
          <div class="ctx-divider"></div>
          <div class="ctx-item" data-action="rename">
            <span class="ctx-icon">✏️</span>
            <span class="ctx-label">이름 변경</span>
            <span class="ctx-shortcut">Enter</span>
          </div>
          <div class="ctx-item ctx-danger" data-action="delete">
            <span class="ctx-icon">🗑️</span>
            <span class="ctx-label">휴지통으로 이동</span>
          </div>` : ''}
        `;

        ctxMenu.querySelectorAll('.ctx-item').forEach(item => {
          item.addEventListener('click', async (ev) => {
            ev.stopPropagation();
            hideMenu();
            const action = item.getAttribute('data-action');
            if (action === 'open') {
              if (isDir) {
                navigateFolder(file.path);
              } else if (file.isText) {
                openEditorWithFile(file.path || file.name);
              } else {
                state.previewableList = state.files;
                const idx = state.files.findIndex(f => f.path === file.path);
                if (idx !== -1) openPreview(idx);
              }
            } else if (action === 'download') {
              const a = document.createElement('a');
              a.href = `/api/download/${encodeURIComponent(file.path)}`;
              a.download = file.name;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            } else if (action === 'rename') {
              const newName = await Pulse.ask('새 이름 입력:', { input: true, value: file.name });
              if (!newName || newName.trim() === file.name) return;
              const cleanName = newName.trim();
              if (cleanName.includes('/') || cleanName.includes('\\')) {
                showToast('이름에 경로 구분자를 사용할 수 없습니다.');
                return;
              }
              try {
                await Pulse.post('/api/rename', { oldPath: file.path, newName: cleanName });
                showToast(`'${cleanName}'(으)로 변경되었습니다.`);
                await fetchFiles();
                renderFinderFiles();
              } catch (err) {
                showToast('이름 변경 실패: ' + err.message);
              }
            } else if (action === 'delete') {
              if (!await Pulse.ask(`'${file.name}' 항목을 휴지통으로 이동할까요?`, { confirm: '휴지통 이동' })) return;
              try {
                await Pulse.post('/api/batch/delete', { paths: [file.path] });
                showToast(`'${file.name}'을(를) 휴지통으로 이동했습니다.`);
                await fetchFiles();
                renderFinderFiles();
                fetchStorageStats();
              } catch (err) {
                showToast('삭제 실패: ' + err.message);
              }
            }
          });
        });
      } else {
        // Desktop wallpaper context menu
        ctxMenu.innerHTML = `
          ${Pulse.isAdmin ? `
          <div class="ctx-item" data-action="new-file">
            <span class="ctx-icon">📄</span>
            <span class="ctx-label">새 텍스트 파일</span>
          </div>
          <div class="ctx-item" data-action="new-folder">
            <span class="ctx-icon">📁</span>
            <span class="ctx-label">새 폴더</span>
          </div>
          <div class="ctx-divider"></div>` : ''}
          <div class="ctx-item" data-action="refresh">
            <span class="ctx-icon">🔄</span>
            <span class="ctx-label">바탕화면 새로고침</span>
          </div>
          <div class="ctx-item" data-action="theme">
            <span class="ctx-icon">🎨</span>
            <span class="ctx-label">배경화면 및 테마 설정</span>
          </div>
        `;

        ctxMenu.querySelectorAll('.ctx-item').forEach(item => {
          item.addEventListener('click', async (ev) => {
            ev.stopPropagation();
            hideMenu();
            const action = item.getAttribute('data-action');
            if (action === 'new-file') {
              const name = await Pulse.ask('생성할 파일명 입력 (예: memo.txt):', { input: true, value: 'untitled.txt' });
              if (!name || !name.trim()) return;
              const cleanName = name.trim();
              try {
                const res = await fetch('/api/files/create', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filename: joinPath(cleanName), content: '' })
                });
                const data = await res.json();
                if (data.success) {
                  showToast(`'${data.filename}' 파일이 생성되었습니다.`);
                  await fetchFiles();
                  renderFinderFiles();
                  openEditorWithFile(data.filename);
                } else {
                  showToast('파일 생성 실패: ' + (data.error || '오류'));
                }
              } catch (err) {
                showToast('파일 생성 통신 오류: ' + err.message);
              }
            } else if (action === 'new-folder') {
              const name = await Pulse.ask('생성할 폴더명 입력:', { input: true, value: '새 폴더' });
              if (!name || !name.trim()) return;
              const cleanName = name.trim();
              if (cleanName.includes('/') || cleanName.includes('\\')) {
                showToast('폴더 이름에 경로 구분자를 사용할 수 없습니다.');
                return;
              }
              try {
                await Pulse.post('/api/folders', { path: joinPath(cleanName) });
                showToast(`'${cleanName}' 폴더가 생성되었습니다.`);
                await fetchFiles();
                renderFinderFiles();
              } catch (err) {
                showToast('폴더 생성 실패: ' + err.message);
              }
            } else if (action === 'refresh') {
              showToast('바탕화면 및 파일 상태를 새로고침했습니다.');
              fetchFiles().then(() => renderFinderFiles());
              fetchDashboardData(true).then(() => updateMonitorWidget());
            } else if (action === 'theme') {
              openDesktopWindow('settings');
            }
          });
        });
      }

      ctxMenu.classList.remove('hidden');
      const menuW = 200;
      const menuH = 180;
      let left = e.clientX;
      let top = e.clientY;

      if (left + menuW > window.innerWidth - 10) {
        left = window.innerWidth - menuW - 10;
      }
      if (top + menuH > window.innerHeight - 10) {
        top = window.innerHeight - menuH - 10;
      }

      ctxMenu.style.left = `${Math.max(10, left)}px`;
      ctxMenu.style.top = `${Math.max(34, top)}px`;
    }

    screen.addEventListener('contextmenu', handleContextMenu);

    // Touch long-press support
    let touchTimer = null;
    let touchMoved = false;
    let touchStartPos = { x: 0, y: 0 };

    screen.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      touchMoved = false;
      const t = e.touches[0];
      touchStartPos = { x: t.clientX, y: t.clientY };
      clearTimeout(touchTimer);
      touchTimer = setTimeout(() => {
        if (!touchMoved) {
          handleContextMenu({
            preventDefault: () => {},
            target: e.target,
            clientX: touchStartPos.x,
            clientY: touchStartPos.y
          });
        }
      }, 550);
    }, { passive: true });

    screen.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const dx = Math.abs(e.touches[0].clientX - touchStartPos.x);
        const dy = Math.abs(e.touches[0].clientY - touchStartPos.y);
        if (dx > 10 || dy > 10) {
          touchMoved = true;
          clearTimeout(touchTimer);
        }
      }
    }, { passive: true });

    screen.addEventListener('touchend', () => {
      clearTimeout(touchTimer);
    }, { passive: true });
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
    } else if (appId === 'editor') {
      editorStats();
      if (typeof updateEditorHighlight === 'function') updateEditorHighlight();
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
      if (typeof updateEditorHighlight === 'function') updateEditorHighlight();
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
    let currentSnapZone = null;
    const snapPreview = document.getElementById('desktop-snap-preview');

    function hideSnapPreview() {
      if (snapPreview) {
        snapPreview.className = 'desktop-snap-preview hidden';
      }
      currentSnapZone = null;
    }

    function onStart(clientX, clientY) {
      if (window.innerWidth <= 768) return;
      if (win.classList.contains('window-maximized')) return;

      if (win.dataset.snapped) {
        try {
          const pre = JSON.parse(win.dataset.preSnap || '{}');
          if (pre.width) win.style.width = pre.width;
          if (pre.height) win.style.height = pre.height;
        } catch (e) {}
        delete win.dataset.snapped;
      }

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

      // Window Snap Detection
      if (snapPreview && window.innerWidth > 768) {
        const threshold = 24;
        if (clientX <= threshold) {
          if (currentSnapZone !== 'left') {
            currentSnapZone = 'left';
            snapPreview.className = 'desktop-snap-preview snap-left';
          }
        } else if (clientX >= window.innerWidth - threshold) {
          if (currentSnapZone !== 'right') {
            currentSnapZone = 'right';
            snapPreview.className = 'desktop-snap-preview snap-right';
          }
        } else if (clientY <= 34) {
          if (currentSnapZone !== 'top') {
            currentSnapZone = 'top';
            snapPreview.className = 'desktop-snap-preview snap-top';
          }
        } else {
          hideSnapPreview();
        }
      }
    }

    function onEnd() {
      if (!isDragging) return;
      isDragging = false;

      if (currentSnapZone && window.innerWidth > 768) {
        win.dataset.preSnap = JSON.stringify({
          width: win.style.width || `${win.offsetWidth}px`,
          height: win.style.height || `${win.offsetHeight}px`
        });

        if (currentSnapZone === 'left') {
          win.style.left = '8px';
          win.style.top = '38px';
          win.style.width = 'calc(50% - 12px)';
          win.style.height = 'calc(100% - 120px)';
          win.dataset.snapped = 'left';
        } else if (currentSnapZone === 'right') {
          win.style.left = 'calc(50% + 4px)';
          win.style.top = '38px';
          win.style.width = 'calc(50% - 12px)';
          win.style.height = 'calc(100% - 120px)';
          win.dataset.snapped = 'right';
        } else if (currentSnapZone === 'top') {
          maximizeDesktopWindow(win.getAttribute('data-app'));
        }
      }
      hideSnapPreview();
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
    const copyBtn = document.getElementById('btn-term-copy');

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        output.innerHTML = '';
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const text = output.innerText || output.textContent;
        if (!text || !text.trim()) {
          showToast('복사할 터미널 출력이 없습니다.');
          return;
        }
        try {
          await navigator.clipboard.writeText(text);
          showToast('터미널 출력이 클립보드에 복사되었습니다.');
        } catch (err) {
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          showToast('터미널 출력이 복사되었습니다.');
        }
      });
    }

    function parseAnsiToHtml(raw) {
      if (!raw) return '';
      const ansiRegex = /(?:\x1b|\u001b)\[([0-9;]*)m/g;
      let html = '';
      let lastIndex = 0;
      const currentClasses = new Set();

      let match;
      while ((match = ansiRegex.exec(raw)) !== null) {
        const textChunk = raw.slice(lastIndex, match.index);
        if (textChunk) {
          if (currentClasses.size > 0) {
            html += `<span class="${Array.from(currentClasses).join(' ')}">${escapeHtml(textChunk)}</span>`;
          } else {
            html += escapeHtml(textChunk);
          }
        }

        const codes = match[1] ? match[1].split(';').map(c => parseInt(c, 10)) : [0];
        for (const code of codes) {
          if (code === 0 || isNaN(code)) {
            currentClasses.clear();
          } else if (code === 1) {
            currentClasses.add('ansi-bold');
          } else if (code === 4) {
            currentClasses.add('ansi-underline');
          } else if (code >= 30 && code <= 37) {
            currentClasses.forEach(c => { if (/^ansi-\d+$/.test(c)) currentClasses.delete(c); });
            currentClasses.add(`ansi-${code - 30}`);
          } else if (code >= 90 && code <= 97) {
            currentClasses.forEach(c => { if (/^ansi-\d+$/.test(c)) currentClasses.delete(c); });
            currentClasses.add(`ansi-${code - 90 + 8}`);
          } else if (code === 39) {
            currentClasses.forEach(c => { if (/^ansi-\d+$/.test(c)) currentClasses.delete(c); });
          }
        }

        lastIndex = ansiRegex.lastIndex;
      }

      const remaining = raw.slice(lastIndex);
      if (remaining) {
        if (currentClasses.size > 0) {
          html += `<span class="${Array.from(currentClasses).join(' ')}">${escapeHtml(remaining)}</span>`;
        } else {
          html += escapeHtml(remaining);
        }
      }

      return html;
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
        helpLine.innerHTML = parseAnsiToHtml(`\x1b[1;34m[Pulse 터미널 도움말]\x1b[0m
- Pulse 서버가 실행 중인 기기의 쉘 명령을 수행합니다 (예: ls, pwd, df -h, python3, git 등).
- 'cd <dir>'로 작업 디렉토리를 자유롭게 이동할 수 있습니다.
- 상단의 자주 쓰는 명령어 버튼을 누르면 즉시 실행됩니다.
- 상단 '\x1b[1m출력 복사\x1b[0m' 버튼으로 터미널 기록을 간편하게 클립보드에 복사할 수 있습니다.`);
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
      const controls = document.querySelectorAll('#terminal-form button, .preset-cmd-btn, #btn-term-clear, #btn-term-copy');
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
        const rawContent = data.output || data.error || (data.exitCode === 0 ? '(성공 - 반환값 없음)' : `종료 코드: ${data.exitCode}`);
        outLine.innerHTML = parseAnsiToHtml(rawContent);
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
    const newFolderBtn = document.getElementById('btn-finder-new-folder');
    const refreshBtn = document.getElementById('btn-finder-refresh');

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        fetchFiles().then(() => renderFinderFiles());
      });
    }

    if (newFolderBtn) {
      newFolderBtn.addEventListener('click', async () => {
        const name = await Pulse.ask('생성할 폴더명을 입력하세요:', { input: true, value: '새 폴더' });
        if (!name || !name.trim()) return;
        const cleanName = name.trim();
        if (cleanName.includes('/') || cleanName.includes('\\')) {
          showToast('폴더 이름에 경로 구분자를 사용할 수 없습니다.');
          return;
        }
        try {
          await Pulse.post('/api/folders', { path: joinPath(cleanName) });
          showToast(`'${cleanName}' 폴더가 생성되었습니다.`);
          await fetchFiles();
          renderFinderFiles();
        } catch (err) {
          showToast('폴더 생성 실패: ' + err.message);
        }
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
      item.dataset.path = file.path;
      item._file = file;
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

  const GRAMMARS = {
    js: /(\/\*[\s\S]*?\*\/|\/\/.*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^\`\\])*`)|(\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|class|extends|super|this|import|export|from|as|default|await|async|yield|typeof|instanceof|void|delete|in|of)\b)|(\b(?:true|false|null|undefined|NaN)\b)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\())/g,
    py: /(#.*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b(?:def|class|return|if|elif|else|for|while|try|except|finally|raise|import|from|as|with|pass|break|continue|global|nonlocal|lambda|yield|async|await|and|or|not|is|in)\b)|(\b(?:True|False|None|self|cls|int|str|float|bool|list|dict|set|tuple)\b)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_]\w*(?=\s*\())|(@\w+)/g,
    sh: /(#.*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b(?:if|then|else|elif|fi|case|esac|for|while|until|do|done|in|function|select|time)\b)|(\$[a-zA-Z_0-9]+|\$\{[^}]+\})|(\b(?:echo|cd|ls|mkdir|rm|cp|mv|cat|grep|chmod|chown|sudo|curl|wget|git|apt|pkg|export)\b)|(\b\d+\b)/g,
    json: /("(?:\\.|[^"\\])*"(?=\s*:))|("(?:\\.|[^"\\])*")|(\b(?:true|false|null)\b)|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/g,
    html: /(<!--[\s\S]*?-->)|(<!DOCTYPE[^>]*>|<\/?[a-zA-Z0-9\-]+)|(\b[a-zA-Z\-]+(?=\s*=))|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(&[a-zA-Z0-9#]+;)/g,
    css: /(\/\*[\s\S]*?\*\/)|([.#][a-zA-Z0-9_\-]+)|(\b[a-zA-Z\-]+(?=\s*:))|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(#[0-9a-fA-F]{3,8}\b|\b\d+(?:px|em|rem|%|vh|vw|s|ms)?\b)/g
  };

  function getEditorLanguage(filename) {
    if (!filename) return 'txt';
    const ext = filename.split('.').pop().toLowerCase();
    if (['js', 'mjs', 'jsx', 'ts', 'tsx'].includes(ext)) return 'js';
    if (['py', 'pyw'].includes(ext)) return 'py';
    if (['html', 'htm', 'xml', 'svg'].includes(ext)) return 'html';
    if (['css', 'scss', 'less'].includes(ext)) return 'css';
    if (['json'].includes(ext)) return 'json';
    if (['sh', 'bash', 'zsh'].includes(ext)) return 'sh';
    return 'txt';
  }

  function getMatchClass(match, lang) {
    if (lang === 'js') {
      if (match[1]) return 'tok-com';
      if (match[2]) return 'tok-str';
      if (match[3]) return 'tok-kw';
      if (match[4]) return 'tok-type';
      if (match[5]) return 'tok-num';
      if (match[6]) return 'tok-fn';
    } else if (lang === 'py') {
      if (match[1]) return 'tok-com';
      if (match[2]) return 'tok-str';
      if (match[3]) return 'tok-kw';
      if (match[4]) return 'tok-type';
      if (match[5]) return 'tok-num';
      if (match[6]) return 'tok-fn';
      if (match[7]) return 'tok-attr';
    } else if (lang === 'sh') {
      if (match[1]) return 'tok-com';
      if (match[2]) return 'tok-str';
      if (match[3]) return 'tok-kw';
      if (match[4]) return 'tok-attr';
      if (match[5]) return 'tok-fn';
      if (match[6]) return 'tok-num';
    } else if (lang === 'json') {
      if (match[1]) return 'tok-attr';
      if (match[2]) return 'tok-str';
      if (match[3]) return 'tok-kw';
      if (match[4]) return 'tok-num';
    } else if (lang === 'html') {
      if (match[1]) return 'tok-com';
      if (match[2]) return 'tok-tag';
      if (match[3]) return 'tok-attr';
      if (match[4]) return 'tok-str';
      if (match[5]) return 'tok-type';
    } else if (lang === 'css') {
      if (match[1]) return 'tok-com';
      if (match[2]) return 'tok-attr';
      if (match[3]) return 'tok-type';
      if (match[4]) return 'tok-str';
      if (match[5]) return 'tok-num';
    }
    return '';
  }

  function highlightCode(rawText, lang) {
    if (!rawText) return '';
    const regex = GRAMMARS[lang];
    if (!regex) return escapeHtml(rawText);

    let lastIndex = 0;
    let html = '';
    regex.lastIndex = 0;
    let match;

    while ((match = regex.exec(rawText)) !== null) {
      if (match.index > lastIndex) {
        html += escapeHtml(rawText.slice(lastIndex, match.index));
      }
      const cls = getMatchClass(match, lang);
      if (cls) {
        html += `<span class="${cls}">${escapeHtml(match[0])}</span>`;
      } else {
        html += escapeHtml(match[0]);
      }
      lastIndex = regex.lastIndex;
      if (!match[0].length) { regex.lastIndex++; }
    }
    if (lastIndex < rawText.length) {
      html += escapeHtml(rawText.slice(lastIndex));
    }
    return html;
  }

  function updateEditorHighlight() {
    const textarea = document.getElementById('editor-textarea');
    const highlightCodeEl = document.getElementById('editor-highlight-code');
    const filenameEl = document.getElementById('editor-filename-input');
    if (!textarea || !highlightCodeEl) return;
    const filename = filenameEl ? filenameEl.value.trim() : '';
    const lang = getEditorLanguage(filename);
    const code = textarea.value;
    highlightCodeEl.innerHTML = highlightCode(code, lang) + (code.endsWith('\n') ? ' ' : '');
  }

  function editorStats() {
    const textarea = document.getElementById('editor-textarea');
    if (!textarea) return;
    const text = textarea.value;
    const lines = text.split('\n').length;
    const statsBadge = document.getElementById('editor-stats-badge');
    if (statsBadge) statsBadge.textContent = `${lines}줄 | ${text.length}자`;
    const gutter = document.getElementById('editor-gutter');
    if (gutter) {
      gutter.textContent = Array.from({ length: Math.min(lines, 10000) }, (_, i) => i + 1).join('\n');
    }
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
    const highlight = document.getElementById('editor-highlight');
    const gutter = document.getElementById('editor-gutter');

    const dirty = () => {
      state.editorDirty = true;
      document.getElementById('editor-save-status').textContent = '저장 안 됨';
      document.getElementById('editor-save-status').classList.remove('green');
      editorStats();
      updateEditorHighlight();
    };
    textarea.addEventListener('input', dirty);
    filename.addEventListener('input', () => {
      dirty();
      updateEditorHighlight();
    });
    textarea.addEventListener('scroll', () => {
      if (gutter) gutter.scrollTop = textarea.scrollTop;
      if (highlight) {
        highlight.scrollTop = textarea.scrollTop;
        highlight.scrollLeft = textarea.scrollLeft;
      }
    });
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
      updateEditorHighlight();
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
