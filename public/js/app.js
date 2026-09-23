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
    fileLoadError: null,
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
    finderView: 'browse',
    desktopFiles: [],
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
    portalCardApi: document.getElementById('portal-card-api'),
    portalFilesSummary: document.getElementById('portal-files-summary'),
    portalUptimeSummary: document.getElementById('portal-uptime-summary'),
    portalApiSummary: document.getElementById('portal-api-summary'),
    portalIpVal: document.getElementById('portal-ip-val'),
    portalVerVal: document.getElementById('portal-ver-val'),
    portalUpdateStatus: document.getElementById('portal-update-status'),
    portalChangelogBtn: document.getElementById('portal-changelog-btn'),

    // Cloud View Elements
    fileGrid: document.getElementById('file-grid'),
    fileListWrap: document.getElementById('file-list-wrap'),
    fileListBody: document.getElementById('file-list-body'),
    loadingState: document.getElementById('loading-state'),
    fileErrorState: document.getElementById('file-error-state'),
    fileErrorMessage: document.getElementById('file-error-message'),
    fileRetryBtn: document.getElementById('file-retry-btn'),
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
    sidebarScrim: document.getElementById('sidebar-scrim'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    navItems: document.querySelectorAll('.nav-item'),
    countAll: document.getElementById('count-all'),
    countFavorite: document.getElementById('count-favorite'),
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
    // v2.2.0 신규 기능 초기화
    setupZipTools();
    initPhotos();
    initCalendar();
    initShortcutsModal();
    // v2.3.0 신규 기능 초기화
    initClipboardApp();
    initFocusMode();
    initShareModal();
    initTagFilterListeners();
    // v2.4.0 신규 기능 초기화
    initPulseCam();
    // v2.6.0 Pulse API Studio 초기화
    initApiStudio();

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
    setSidebarOpen(false);

    // Update Nav Tab Buttons
    [el.tabPortal, el.tabCloud, el.tabDesktop, el.tabDashboard].forEach(btn => {
      if (!btn) return;
      const active = btn.getAttribute('data-view') === viewName;
      btn.classList.toggle('active', active);
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
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

  function setSidebarOpen(open) {
    if (!el.sidebar) return;
    const expanded = window.innerWidth <= 860 && open;
    const wasOpen = el.sidebar.classList.contains('open');
    el.sidebar.classList.toggle('open', expanded);
    syncSidebarAccessibility();
    if (expanded && !wasOpen) el.sidebar.querySelector('.nav-item.active')?.focus();
  }

  function syncSidebarAccessibility() {
    if (!el.sidebar) return;
    const mobile = window.innerWidth <= 860;
    const expanded = mobile && el.sidebar.classList.contains('open');
    [el.viewCloud?.querySelector('.main-content'), document.querySelector('.global-navbar'),
      document.querySelector('.pulse-account-bar')].forEach(node => {
      if (node) node.inert = expanded;
    });
    if (mobile && !expanded && el.sidebar.contains(document.activeElement)) el.mobileMenuBtn?.focus();
    el.sidebar.inert = mobile && !expanded;
    if (mobile && !expanded) el.sidebar.setAttribute('aria-hidden', 'true');
    else el.sidebar.removeAttribute('aria-hidden');
    if (expanded) {
      el.sidebar.setAttribute('role', 'dialog');
      el.sidebar.setAttribute('aria-modal', 'true');
    } else {
      el.sidebar.removeAttribute('role');
      el.sidebar.removeAttribute('aria-modal');
    }
    if (el.sidebarScrim) el.sidebarScrim.hidden = !expanded;
    if (el.mobileMenuBtn) {
      el.mobileMenuBtn.setAttribute('aria-expanded', String(expanded));
      el.mobileMenuBtn.setAttribute('aria-label', expanded ? '보관함 메뉴 닫기' : '보관함 메뉴 열기');
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
    if (el.portalApiSummary) {
      const apiCount = state.customApis ? state.customApis.length : 3;
      el.portalApiSummary.textContent = `${apiCount}개 API 엔드포인트 가동 중`;
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
    if (el.portalCardApi) {
      el.portalCardApi.addEventListener('click', () => {
        switchAppView('desktop');
        openDesktopWindow('api');
      });
    }
    [el.portalCardCloud, el.portalCardDesktop, el.portalCardDashboard, el.portalCardApi].forEach(card => {
      card?.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          card.click();
        }
      });
    });
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
      el.btnCopyWifiIp.addEventListener('click', async () => {
        const text = el.dashIpWifi.textContent;
        if (await copyToClipboard(text)) {
          showToast('✓ 주소가 클립보드에 복사되었습니다: ' + text);
        } else {
          showToast('복사 실패');
        }
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
      btn.setAttribute('aria-pressed', String(btn.classList.contains('active')));
      btn.addEventListener('click', () => {
        el.navItems.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        document.querySelectorAll('.sidebar-tag-chips .tag-chip').forEach(chip => {
          chip.classList.remove('active');
          chip.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        state.currentFilter = btn.getAttribute('data-filter');
        updateTitle();
        state.page = 1;
        fetchFiles();

        if (window.innerWidth <= 860) {
          setSidebarOpen(false);
        }
      });
    });

    if (el.mobileMenuBtn) {
      el.mobileMenuBtn.addEventListener('click', () => setSidebarOpen(!el.sidebar.classList.contains('open')));
    }
    el.sidebarScrim?.addEventListener('click', () => setSidebarOpen(false));
    window.addEventListener('resize', () => {
      if (window.innerWidth > 860) setSidebarOpen(false);
      else syncSidebarAccessibility();
    });
    el.fileRetryBtn?.addEventListener('click', () => fetchFiles());

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
      el.previewCopyTextBtn.addEventListener('click', async () => {
        if (!state.activePreviewText) return;
        if (await copyToClipboard(state.activePreviewText)) {
          showToast('✓ 파일 전체 내용이 클립보드에 복사되었습니다.');
        } else {
          showToast('복사 실패');
        }
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
      if (e.key === 'Escape' && el.sidebar.classList.contains('open')) setSidebarOpen(false);
      if (e.key === 'Tab' && el.sidebar.classList.contains('open') && window.innerWidth <= 860 &&
          !document.querySelector('dialog[open]')) {
        const focusable = Array.from(el.sidebar.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
          .filter(node => node.getClientRects().length > 0);
        if (focusable.length) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && (document.activeElement === first || !el.sidebar.contains(document.activeElement))) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && (document.activeElement === last || !el.sidebar.contains(document.activeElement))) {
            e.preventDefault();
            first.focus();
          }
        }
      }
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
        pushNotification('업데이트 대기', `${data.behindCount || 1}개의 새 커밋이 있습니다.`, 'update-available');
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
  function desktopJoin(name) {
    const clean = String(name || '').replace(/[\\/]/g, '').trim();
    return clean ? `Desktop/${clean}` : 'Desktop';
  }
  function loadRecents() {
    try {
      const items = JSON.parse(localStorage.getItem('pulse_recents') || '[]');
      return Array.isArray(items) ? items : [];
    } catch (_) { return []; }
  }
  function recordRecent(file) {
    if (!file || !file.path) return;
    const items = loadRecents().filter(x => x.path !== file.path);
    items.unshift({
      path: file.path,
      name: file.name,
      type: file.type || 'other',
      isText: !!file.isText,
      sizeFormatted: file.sizeFormatted || '',
      openedAt: Date.now()
    });
    localStorage.setItem('pulse_recents', JSON.stringify(items.slice(0, 20)));
  }
  function loadNotifications() {
    try {
      const items = JSON.parse(localStorage.getItem('pulse_notifications') || '[]');
      return Array.isArray(items) ? items : [];
    } catch (_) { return []; }
  }
  function pushNotification(title, body, key) {
    const items = loadNotifications();
    if (key && items.some(n => n.key === key && Date.now() - n.time < 30 * 60 * 1000)) return;
    items.unshift({ id: Date.now().toString(36), key: key || '', title, body, time: Date.now(), unread: true });
    localStorage.setItem('pulse_notifications', JSON.stringify(items.slice(0, 40)));
    renderNotificationCenter();
  }
  function formatNotifyTime(ts) {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  function navigateFolder(path) {
    state.folder = path;
    state.page = 1;
    state.searchQuery = '';
    if (el.searchInput) el.searchInput.value = '';
    state.selected.clear();
    state.finderView = 'browse';
    if (state.currentFilter !== 'all') {
      state.currentFilter = 'all';
      el.navItems.forEach(b => {
        const active = b.getAttribute('data-filter') === 'all';
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      document.querySelectorAll('.sidebar-tag-chips .tag-chip').forEach(chip => {
        chip.classList.remove('active');
        chip.setAttribute('aria-pressed', 'false');
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
    // ZIP 버튼 업데이트
    updateZipButton();
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
    if (el.loadingState) el.loadingState.classList.remove('hidden');
    if (el.emptyState) el.emptyState.classList.add('hidden');
    if (el.fileRetryBtn) el.fileRetryBtn.disabled = true;
    try {
      const query = new URLSearchParams({ path: state.folder, page: state.page, limit: 60,
        q: state.searchQuery, type: state.currentFilter, sort: state.sortBy });
      const data = await Pulse.api('/api/files?' + query);
      if (requestId !== fileRequest) return;
      state.fileLoadError = null;
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
      if (typeof fetchDesktopFiles === 'function') fetchDesktopFiles();
    } catch (error) {
      if (requestId !== fileRequest) return;
      state.fileLoadError = error.message || '서버 응답을 확인할 수 없습니다.';
      state.files = [];
      state.total = 0;
      state.pages = 1;
      state.selected.clear();
      render();
      renderFinderFiles();
      updateFileTools();
    } finally {
      if (requestId === fileRequest) {
        el.loadingState.classList.add('hidden');
        if (el.fileRetryBtn) el.fileRetryBtn.disabled = false;
      }
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
    if (el.countFavorite) el.countFavorite.textContent = counts.favorite || 0;
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
      favorite: '즐겨찾기',
      'tag:red': '빨강 태그',
      'tag:orange': '주황 태그',
      'tag:yellow': '노랑 태그',
      'tag:green': '초록 태그',
      'tag:blue': '파랑 태그',
      'tag:purple': '보라 태그',
      'tag:gray': '회색 태그',
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

    if (el.fileSummary) el.fileSummary.textContent = state.fileLoadError
      ? '목록 조회 실패' : `${state.total}개 항목 · ${state.page}/${state.pages}페이지`;

    if (state.fileLoadError) {
      el.fileGrid.innerHTML = '';
      el.fileListBody.innerHTML = '';
      el.fileGrid.classList.add('hidden');
      el.fileListWrap.classList.add('hidden');
      el.emptyState.classList.add('hidden');
      el.fileErrorMessage.textContent = state.fileLoadError;
      el.fileErrorState.classList.remove('hidden');
      return;
    }
    el.fileErrorState.classList.add('hidden');

    if (list.length === 0) {
      el.fileGrid.innerHTML = '';
      el.fileListBody.innerHTML = '';
      if (el.fileGrid) el.fileGrid.classList.add('hidden');
      if (el.fileListWrap) el.fileListWrap.classList.add('hidden');
      el.emptyState.classList.remove('hidden');
      if (state.searchQuery) {
        el.emptyTitle.textContent = '검색 결과가 없습니다';
        el.emptyDesc.textContent = `"${state.searchQuery}"에 일치하는 파일이 없습니다.`;
      } else if (state.folder) {
        const folderName = state.folder.split('/').pop() || state.folder;
        el.emptyTitle.textContent = `'${folderName}' 폴더가 비어 있습니다`;
        el.emptyDesc.textContent = document.body.dataset.role === 'admin'
          ? "상단의 '업로드' 또는 '새 폴더' 버튼을 눌러 파일을 추가하세요."
          : '관리자가 파일을 추가하면 이곳에 표시됩니다.';
      } else {
        el.emptyTitle.textContent = '파일이 없습니다';
        el.emptyDesc.textContent = document.body.dataset.role === 'admin'
          ? '상단의 업로드 버튼을 누르거나 파일을 드롭하세요.'
          : '관리자가 파일을 추가하면 이곳에 표시됩니다.';
      }
      return;
    }

    el.emptyState.classList.add('hidden');
    if (el.fileGrid) el.fileGrid.classList.toggle('hidden', state.viewMode !== 'grid');
    if (el.fileListWrap) el.fileListWrap.classList.toggle('hidden', state.viewMode !== 'list');

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
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `${file.name} ${isFolder ? '폴더 열기' : '미리보기'}`);

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

      const tagDots = (file.tags || []).map(t => `<span class="file-tag-dot tag-${escapeHtml(t)}"></span>`).join('');

      card.innerHTML = `
        <button class="file-card-favorite-btn ${file.favorite ? 'is-fav' : ''}" title="${file.favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}" data-action="favorite">
          ★
        </button>
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
          ${tagDots ? `<div class="file-card-tags">${tagDots}</div>` : ''}
        </div>
      `;

      const btnFav = card.querySelector('.file-card-favorite-btn');
      const btnOpen = card.querySelector('.btn-open');
      const btnDl = card.querySelector('.btn-dl');
      const btnDel = card.querySelector('.btn-del');

      if (btnFav) {
        btnFav.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          toggleFavorite(file.path);
        });
      }

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
      card.addEventListener('keydown', (event) => {
        if (event.target !== card || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        if (isFolder) navigateFolder(file.path);
        else openPreview(index);
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
      tr.tabIndex = 0;
      tr.setAttribute('aria-label', `${file.name} ${isFolder ? '폴더 열기' : '미리보기'}`);
      const tagDots = (file.tags || []).map(t => `<span class="file-tag-dot tag-${escapeHtml(t)}"></span>`).join('');

      tr.innerHTML = `
        <td class="col-name">
          <div class="list-name-wrap">
            <button class="list-favorite-btn ${file.favorite ? 'is-fav' : ''}" data-action="favorite" title="${file.favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}">★</button>
            <span class="list-type-icon ${file.type}-color">
              ${getFileTypeIconSvg(file.type)}
            </span>
            <span class="list-filename" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
            ${tagDots ? `<div class="list-tag-dots">${tagDots}</div>` : ''}
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

      const btnFav = tr.querySelector('.list-favorite-btn');
      const btnOpen = tr.querySelector('.btn-open');
      const btnView = tr.querySelector('.btn-view');
      const btnDl = tr.querySelector('.btn-dl');
      const btnDel = tr.querySelector('.btn-del');

      if (btnFav) {
        btnFav.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          toggleFavorite(file.path);
        });
      }

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
      tr.addEventListener('keydown', (event) => {
        if (event.target !== tr || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        if (isFolder) navigateFolder(file.path);
        else openPreview(index);
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
    if (el.btnGridView) el.btnGridView.setAttribute('aria-pressed', String(mode === 'grid'));
    if (el.btnListView) el.btnListView.setAttribute('aria-pressed', String(mode === 'list'));

    if (el.fileGrid) el.fileGrid.classList.toggle('hidden', mode !== 'grid');
    if (el.fileListWrap) el.fileListWrap.classList.toggle('hidden', mode !== 'list');

    render();
  }

  // ================= Universal File Previewer (Text, Media, PDF) =================
  async function openPreview(index) {
    state.activePreviewIndex = index;
    const file = state.previewableList[index];
    if (!file) return;
    recordRecent(file);
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
          if (typeof fetchDesktopFiles === 'function') fetchDesktopFiles();
          pushNotification('업로드 완료', `${file.name} 파일이 보관함에 저장되었습니다.`);
        } else {
          itemEl.querySelector('.upload-item-pct').textContent = '실패 ✕';
          itemEl.querySelector('.upload-progress-bar').style.backgroundColor = 'var(--apple-red)';

          let errMsg = '업로드 실패';
          try {
            const data = JSON.parse(xhr.responseText);
            if (data && data.error) errMsg = `업로드 실패: ${data.error}`;
            else if (data && data.description) errMsg = `업로드 실패: ${data.description}`;
          } catch (_) {
            if (xhr.status === 401) errMsg = '업로드 실패: 로그인이 필요합니다.';
            else if (xhr.status === 403) errMsg = '업로드 실패: 관리자 권한이 필요하거나 세션이 만료되었습니다.';
            else if (xhr.status === 413) errMsg = '업로드 실패: 파일 크기가 제한을 초과했습니다 (Cloudflare 터널 이용 시 최대 100MB).';
            else if (xhr.status === 404) errMsg = '업로드 실패: 업로드 폴더가 없습니다.';
            else if (xhr.status === 409) errMsg = '업로드 실패: 저장 공간이 부족하거나 쓰기 권한이 없습니다.';
            else if (xhr.status === 507) errMsg = '업로드 실패: 스마트폰 저장 공간이 부족합니다.';
            else errMsg = `업로드 실패 (HTTP ${xhr.status}). 로그인 및 저장 공간을 확인하세요.`;
          }

          showToast(errMsg, () => { uploadQueue.push({ file, folder }); pumpUploads(); });

          if (xhr.status === 401 && typeof window.Pulse?.showLogin === 'function') {
            window.Pulse.showLogin('세션이 만료되었습니다. 다시 로그인하세요.');
          }
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
        if (state.currentAppView === 'desktop') {
          if (!Pulse.isAdmin) return;
          for (const file of Array.from(e.dataTransfer.files)) uploadQueue.push({ file, folder: 'Desktop' });
          pumpUploads();
        } else {
          switchAppView('cloud');
          uploadFiles(e.dataTransfer.files);
        }
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

    setupSpotlightLogic();
    setupQuickLookLogic();
    setupMissionControlLogic();
    setupDesktopIconsAndMarquee();
    setupControlCenterLogic();
    setupStickiesLogic();
    setupNotesLogic();
    setupCalculatorLogic();
    setupTrashWindowLogic();
    setupNotificationCenter();
    setupMusicPlayerLogic();
    setupDockMagnificationAndMotion();
    fetchDesktopFiles();

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
        const pct = state.dashboardData.battery.percentage;
        if (pct <= 20) {
          pushNotification('배터리 부족', `스마트폰 배터리가 ${pct}%입니다.`, 'battery-low');
        }
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

  const DESKTOP_THEME_LABELS = {
    sonoma: 'Sonoma Dunes',
    sequoia: 'Sequoia Night',
    cyber: 'Cyber Neon',
    midnight: 'Midnight Ocean'
  };

  function placePopupAt(el, clientX, clientY, host, { minTop = 8, gutter = 8 } = {}) {
    if (!el || !host) return;
    el.classList.remove('hidden');
    const hostRect = host.getBoundingClientRect();
    const menuW = el.offsetWidth || 200;
    const menuH = el.offsetHeight || 160;
    let left = clientX - hostRect.left;
    let top = clientY - hostRect.top;
    if (left + menuW > hostRect.width - gutter) left -= menuW;
    if (top + menuH > hostRect.height - gutter) top -= menuH;
    left = Math.max(gutter, Math.min(left, hostRect.width - menuW - gutter));
    top = Math.max(minTop, Math.min(top, hostRect.height - menuH - gutter));
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
  }

  // Desktop OS Right-click Context Menu
  function setupContextMenu() {
    const ctxMenu = document.getElementById('desktop-context-menu');
    const screen = document.getElementById('desktop-screen');
    if (!ctxMenu || !screen) return;

    let suppressHideUntil = 0;

    function hideMenu() {
      ctxMenu.classList.add('hidden');
      ctxMenu.innerHTML = '';
    }

    function bindCtxActions(handlers) {
      ctxMenu.querySelectorAll('.ctx-item').forEach(item => {
        item.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          const action = item.getAttribute('data-action');
          hideMenu();
          if (action && handlers[action]) await handlers[action]();
        });
      });
    }

    document.addEventListener('click', (e) => {
      if (Date.now() < suppressHideUntil) return;
      if (!ctxMenu.contains(e.target)) hideMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideMenu();
    });
    window.addEventListener('blur', hideMenu);
    window.addEventListener('resize', hideMenu);
    screen.addEventListener('wheel', hideMenu, { passive: true });

    function handleContextMenu(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        hideMenu();
        return;
      }

      const finderItem = e.target.closest('.finder-item');
      const deskFileEl = e.target.closest('.desktop-file-icon');
      const shortcut = e.target.closest('.desktop-shortcut');
      const windowEl = e.target.closest('.desktop-window');
      const dockEl = e.target.closest('.desktop-dock');
      const menubarEl = e.target.closest('.desktop-menubar');
      const overlayEl = e.target.closest('.desktop-spotlight, .desktop-quicklook, .desktop-control-center-popover, .desktop-notify-popover, .desktop-context-menu');

      if (dockEl || menubarEl || overlayEl) {
        hideMenu();
        return;
      }

      e.preventDefault();
      suppressHideUntil = Date.now() + 400;

      if (finderItem) {
        const path = finderItem.dataset.path;
        const file = finderItem._file || state.files.find(f => f.path === path);
        if (!file) { hideMenu(); return; }
        finderItem.closest('#finder-file-grid')?.querySelectorAll('.finder-item.selected').forEach(el => el.classList.remove('selected'));
        finderItem.classList.add('selected');

        const isDir = file.type === 'folder';
        const isZip = !isDir && (file.extension === 'zip');
        ctxMenu.innerHTML = `
          <div class="ctx-item" data-action="open">
            <span class="ctx-icon">${isDir ? '📂' : (file.isText ? '📝' : '👁️')}</span>
            <span class="ctx-label">${isDir ? '열기' : (file.isText ? '에디터로 편집' : '미리보기')}</span>
          </div>
          <div class="ctx-item" data-action="favorite">
            <span class="ctx-icon">${file.favorite ? '★' : '☆'}</span>
            <span class="ctx-label">${file.favorite ? '즐겨찾기 해제' : '즐겨찾기에 추가'}</span>
          </div>
          ${!isDir ? `
          <div class="ctx-item" data-action="quicklook">
            <span class="ctx-icon">👁️</span>
            <span class="ctx-label">빠른 미리보기</span>
            <span class="ctx-shortcut">Space</span>
          </div>
          <div class="ctx-item" data-action="download">
            <span class="ctx-icon">⬇️</span>
            <span class="ctx-label">다운로드</span>
          </div>
          <div class="ctx-item" data-action="share">
            <span class="ctx-icon">🔗</span>
            <span class="ctx-label">공유 링크 생성</span>
          </div>
          ${isZip && Pulse.isAdmin ? `
          <div class="ctx-item" data-action="unzip">
            <span class="ctx-icon">📦</span>
            <span class="ctx-label">여기에 압축 해제</span>
          </div>` : ''}` : ''}
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
            } else if (action === 'favorite') {
              toggleFavorite(file.path);
            } else if (action === 'share') {
              openShareModal(file);
            } else if (action === 'quicklook') {
              openQuickLook(file, state.files);
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
            } else if (action === 'unzip') {
              await unzipFile(file.path);
            }
          });
        });
      } else if (shortcut) {
        const appId = shortcut.getAttribute('data-app');
        const names = {
          terminal: 'Pulse 터미널', finder: 'Pulse 파일', editor: 'Pulse 에디터',
          monitor: 'Pulse 모니터', browser: 'Pulse 브라우저', linux: 'Linux 데스크톱',
          stickies: '스티커 메모', music: 'Pulse 음악', settings: 'Pulse OS 설정'
        };
        ctxMenu.innerHTML = `
          <div class="ctx-item" data-action="open">
            <span class="ctx-icon">🚀</span>
            <span class="ctx-label">${names[appId] || '앱'} 열기</span>
          </div>
        `;
        bindCtxActions({
          open: () => openDesktopWindow(appId)
        });
      } else if (deskFileEl) {
        const file = deskFileEl._file;
        if (!file) { hideMenu(); return; }
        document.querySelectorAll('.desktop-file-icon.selected').forEach(el => el.classList.remove('selected'));
        deskFileEl.classList.add('selected');
        const isDir = file.type === 'folder';
        ctxMenu.innerHTML = `
          <div class="ctx-item" data-action="open">
            <span class="ctx-icon">${isDir ? '📂' : (file.isText ? '📝' : '👁️')}</span>
            <span class="ctx-label">${isDir ? '열기' : (file.isText ? '에디터로 편집' : '미리보기')}</span>
          </div>
          ${!isDir ? `
          <div class="ctx-item" data-action="quicklook">
            <span class="ctx-icon">👁️</span>
            <span class="ctx-label">빠른 미리보기</span>
            <span class="ctx-shortcut">Space</span>
          </div>
          <div class="ctx-item" data-action="download">
            <span class="ctx-icon">⬇️</span>
            <span class="ctx-label">다운로드</span>
          </div>` : ''}
          ${Pulse.isAdmin ? `
          <div class="ctx-divider"></div>
          <div class="ctx-item" data-action="rename">
            <span class="ctx-icon">✏️</span>
            <span class="ctx-label">이름 변경</span>
          </div>
          <div class="ctx-item ctx-danger" data-action="delete">
            <span class="ctx-icon">🗑️</span>
            <span class="ctx-label">휴지통으로 이동</span>
          </div>` : ''}
        `;
        bindCtxActions({
          open: () => openDesktopFile(file),
          quicklook: () => openQuickLook(file, state.desktopFiles),
          download: () => {
            const a = document.createElement('a');
            a.href = `/api/download/${encodeURIComponent(file.path)}`;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            a.remove();
          },
          rename: async () => {
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
              fetchDesktopFiles();
            } catch (err) {
              showToast('이름 변경 실패: ' + err.message);
            }
          },
          delete: async () => {
            if (!await Pulse.ask(`'${file.name}' 항목을 휴지통으로 이동할까요?`, { confirm: '휴지통 이동' })) return;
            try {
              await Pulse.post('/api/batch/delete', { paths: [file.path] });
              showToast(`'${file.name}'을(를) 휴지통으로 이동했습니다.`);
              await fetchFiles();
              fetchDesktopFiles();
              fetchStorageStats();
              if (typeof renderOsTrash === 'function') renderOsTrash();
            } catch (err) {
              showToast('삭제 실패: ' + err.message);
            }
          }
        });
      } else if (windowEl) {
        const appId = windowEl.getAttribute('data-app');
        const canMin = !!windowEl.querySelector('.traffic-light.btn-min');
        const canMax = !!windowEl.querySelector('.traffic-light.btn-max');
        const isMax = windowEl.classList.contains('window-maximized');
        ctxMenu.innerHTML = `
          <div class="ctx-item" data-action="front">
            <span class="ctx-icon">⬆️</span>
            <span class="ctx-label">앞으로 가져오기</span>
          </div>
          ${canMin ? `
          <div class="ctx-item" data-action="min">
            <span class="ctx-icon">⬇️</span>
            <span class="ctx-label">최소화</span>
          </div>` : ''}
          ${canMax ? `
          <div class="ctx-item" data-action="max">
            <span class="ctx-icon">⛶</span>
            <span class="ctx-label">${isMax ? '원래 크기로' : '최대화'}</span>
          </div>` : ''}
          <div class="ctx-divider"></div>
          <div class="ctx-item ctx-danger" data-action="close">
            <span class="ctx-icon">✕</span>
            <span class="ctx-label">닫기</span>
          </div>
        `;
        bindCtxActions({
          front: () => bringWindowToFront(appId),
          min: () => minimizeDesktopWindow(appId),
          max: () => maximizeDesktopWindow(appId),
          close: () => closeDesktopWindow(appId)
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
          <div class="ctx-item" data-action="spotlight">
            <span class="ctx-icon">🔍</span>
            <span class="ctx-label">Spotlight 검색</span>
            <span class="ctx-shortcut">Ctrl+Space</span>
          </div>
          <div class="ctx-item" data-action="mission">
            <span class="ctx-icon">🪟</span>
            <span class="ctx-label">미션 컨트롤</span>
            <span class="ctx-shortcut">F3</span>
          </div>
          <div class="ctx-item" data-action="stickies">
            <span class="ctx-icon">📌</span>
            <span class="ctx-label">스티커 메모 열기</span>
          </div>
          <div class="ctx-item" data-action="music">
            <span class="ctx-icon">🎵</span>
            <span class="ctx-label">Pulse 음악 열기</span>
          </div>
          <div class="ctx-divider"></div>
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
                  body: JSON.stringify({ filename: desktopJoin(cleanName), content: '' })
                });
                const data = await res.json();
                if (data.success) {
                  showToast(`바탕화면에 '${data.filename}' 파일이 생성되었습니다.`);
                  await fetchFiles();
                  fetchDesktopFiles();
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
                await Pulse.post('/api/folders', { path: desktopJoin(cleanName) });
                showToast(`바탕화면에 '${cleanName}' 폴더가 생성되었습니다.`);
                await fetchFiles();
                fetchDesktopFiles();
              } catch (err) {
                showToast('폴더 생성 실패: ' + err.message);
              }
            } else if (action === 'spotlight') {
              document.getElementById('btn-desktop-spotlight')?.click();
            } else if (action === 'mission') {
              toggleMissionControl();
            } else if (action === 'stickies') {
              openDesktopWindow('stickies');
            } else if (action === 'music') {
              openDesktopWindow('music');
            } else if (action === 'refresh') {
              showToast('바탕화면 및 파일 상태를 새로고침했습니다.');
              fetchFiles().then(() => renderFinderFiles());
              fetchDesktopFiles();
              fetchDashboardData(true).then(() => updateMonitorWidget());
            } else if (action === 'theme') {
              openDesktopWindow('settings');
            }
          });
        });
      }

      placePopupAt(ctxMenu, e.clientX, e.clientY, screen, { minTop: 34, gutter: 8 });
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
      sc.setAttribute('role', 'button');
      sc.setAttribute('aria-label', sc.title || `${appId} 열기`);
      sc.addEventListener('click', () => {
        if (window.innerWidth <= 768) openDesktopWindow(appId);
      });
      sc.addEventListener('dblclick', () => openDesktopWindow(appId));
      sc.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          openDesktopWindow(appId);
        }
      });
    });

    document.querySelectorAll('.window-header .traffic-light').forEach(button => {
      const action = button.classList.contains('btn-close') ? '닫기'
        : button.classList.contains('btn-min') ? '최소화' : '최대화';
      button.setAttribute('aria-label', action);
      if (!button.title) button.title = action;
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

    const ipBadge = document.getElementById('menubar-ip-badge');
    if (ipBadge) {
      ipBadge.style.cursor = 'pointer';
      ipBadge.title = '클릭하여 IP 복사';
      ipBadge.addEventListener('click', async () => {
        const ip = document.getElementById('menubar-ip-text')?.textContent;
        if (ip && ip !== '192.168.X.X' && await copyToClipboard(ip)) {
          showToast(`IP 주소(${ip})가 클립보드에 복사되었습니다.`);
        }
      });
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
        else if (appId === 'stickies') { win.style.width = '340px'; win.style.height = '300px'; }
        else if (appId === 'music') { win.style.width = '440px'; win.style.height = '480px'; }
        else if (appId === 'notes') { win.style.width = '720px'; win.style.height = '460px'; }
        else if (appId === 'calculator') { win.style.width = '280px'; win.style.height = '380px'; }
        else if (appId === 'trash') { win.style.width = '520px'; win.style.height = '380px'; }
        else if (appId === 'photos') { win.style.width = '820px'; win.style.height = '520px'; }
        else if (appId === 'clipboard') { win.style.width = '420px'; win.style.height = '500px'; }
        else if (appId === 'cam') { win.style.width = '620px'; win.style.height = '510px'; }
        else if (appId === 'api') { win.style.width = '840px'; win.style.height = '540px'; }
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
    } else if (appId === 'stickies') {
      const ta = document.getElementById('sticky-textarea');
      if (ta) ta.focus();
    } else if (appId === 'music') {
      if (typeof loadMusicPlaylist === 'function') loadMusicPlaylist();
    } else if (appId === 'notes') {
      if (typeof loadNotesList === 'function') loadNotesList();
    } else if (appId === 'trash') {
      if (typeof renderOsTrash === 'function') renderOsTrash();
    } else if (appId === 'photos') {
      loadPhotos();
    } else if (appId === 'clipboard') {
      renderClipboardHistory();
    } else if (appId === 'cam') {
      startPulseCam();
    } else if (appId === 'api') {
      if (typeof loadCustomApis === 'function') loadCustomApis();
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
    if (appId === 'music') {
      const audio = document.getElementById('pulse-bg-audio');
      if (audio) {
        audio.pause();
        const vinyl = document.getElementById('music-vinyl');
        if (vinyl) vinyl.classList.remove('playing');
        const playBtn = document.getElementById('btn-music-play');
        if (playBtn) playBtn.textContent = '▶';
      }
    }
    if (appId === 'cam') {
      stopPulseCam();
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
    win.classList.add('window-minimizing');
    setTimeout(() => {
      win.classList.remove('window-minimizing');
      win.classList.add('window-minimized');
      document.querySelectorAll('.dock-item').forEach(item => item.classList.remove('active'));
      const title = document.getElementById('desktop-active-app-name');
      if (title) title.textContent = 'Pulse OS';
    }, 220);
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
      stickies: '스티커 메모',
      music: 'Pulse 음악',
      notes: 'Pulse Notes',
      calculator: '계산기',
      trash: '휴지통',
      photos: 'Pulse Photos',
      clipboard: '클립보드',
      cam: 'Pulse Cam',
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
      const parent = win.offsetParent || document.getElementById('desktop-canvas');
      if (!parent) return;
      win._dragParent = parent;
      const parentRect = parent.getBoundingClientRect();
      initialLeft = rect.left - parentRect.left;
      initialTop = rect.top - parentRect.top;
    }

    function onMove(clientX, clientY) {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;
      const parent = win._dragParent || document.getElementById('desktop-canvas');
      if (!parent) return;
      const maxLeft = parent.clientWidth - 80;
      const maxTop = parent.clientHeight - 80;

      const newLeft = Math.max(0, Math.min(initialLeft + dx, maxLeft));
      const newTop = Math.max(0, Math.min(initialTop + dy, maxTop));
      win.style.left = `${newLeft}px`;
      win.style.top = `${newTop}px`;

      // Window Snap Detection
      if (snapPreview && window.innerWidth > 768) {
        const threshold = 24;
        const parentRect = parent.getBoundingClientRect();
        if (clientX <= parentRect.left + threshold) {
          if (currentSnapZone !== 'left') {
            currentSnapZone = 'left';
            snapPreview.className = 'desktop-snap-preview snap-left';
          }
        } else if (clientX >= parentRect.right - threshold) {
          if (currentSnapZone !== 'right') {
            currentSnapZone = 'right';
            snapPreview.className = 'desktop-snap-preview snap-right';
          }
        } else if (clientY <= parentRect.top + threshold) {
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

    const startResize = (clientX, clientY) => {
      isResizing = true;
      startX = clientX;
      startY = clientY;
      startW = win.offsetWidth;
      startH = win.offsetHeight;
      bringWindowToFront(win.getAttribute('data-app'));
    };

    const updateResize = (clientX, clientY) => {
      if (!isResizing) return;
      const newW = Math.max(300, startW + (clientX - startX));
      const newH = Math.max(200, startH + (clientY - startY));
      win.style.width = `${newW}px`;
      win.style.height = `${newH}px`;
    };

    const stopResize = () => {
      isResizing = false;
    };

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startResize(e.clientX, e.clientY);

      const onMouseMove = (ev) => {
        updateResize(ev.clientX, ev.clientY);
      };

      const onMouseUp = () => {
        stopResize();
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    handle.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      startResize(touch.clientX, touch.clientY);

      const onTouchMove = (ev) => {
        if (!ev.touches || ev.touches.length === 0) return;
        ev.preventDefault();
        updateResize(ev.touches[0].clientX, ev.touches[0].clientY);
      };

      const onTouchEnd = () => {
        stopResize();
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        document.removeEventListener('touchcancel', onTouchEnd);
      };

      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onTouchEnd);
      document.addEventListener('touchcancel', onTouchEnd);
    }, { passive: true });
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

    // Filter sidebar (Finder only — do not change Pulse Cloud filters)
    document.querySelectorAll('.finder-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.finder-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        if (item.getAttribute('data-finder-view') === 'recents') {
          state.finderView = 'recents';
        } else {
          state.finderView = 'browse';
          state.finderFilter = item.getAttribute('data-finder-filter') || 'all';
        }
        renderFinderFiles();
      });
    });

    window.addEventListener('keydown', (e) => {
      if (state.currentAppView !== 'desktop' || state.activeDesktopApp !== 'finder') return;
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (['INPUT', 'TEXTAREA'].includes(tag) || document.activeElement?.isContentEditable) return;
      if (e.key === 'Enter') {
        const selected = document.querySelector('#finder-file-grid .finder-item.selected');
        if (!selected) return;
        e.preventDefault();
        selected.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      }
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

  function renderFinderPath() {
    const bar = document.getElementById('finder-path-bar');
    if (!bar) return;
    bar.innerHTML = '';
    if (state.finderView === 'recents') {
      const label = document.createElement('span');
      label.className = 'finder-path-seg current';
      label.textContent = '최근 항목';
      bar.appendChild(label);
      return;
    }

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'finder-path-up';
    upBtn.title = '상위 폴더';
    upBtn.textContent = '↑';
    upBtn.disabled = !state.folder;
    upBtn.addEventListener('click', () => {
      if (!state.folder) return;
      navigateFolder(state.folder.split('/').slice(0, -1).join('/'));
    });
    bar.appendChild(upBtn);

    const root = document.createElement('button');
    root.type = 'button';
    root.className = `finder-path-seg ${!state.folder ? 'current' : ''}`;
    root.textContent = '내 보관함';
    if (state.folder) root.addEventListener('click', () => navigateFolder(''));
    bar.appendChild(root);

    if (!state.folder) return;
    const parts = state.folder.split('/').filter(Boolean);
    let accumulated = '';
    parts.forEach((part, idx) => {
      accumulated = accumulated ? `${accumulated}/${part}` : part;
      const sep = document.createElement('span');
      sep.className = 'finder-path-sep';
      sep.textContent = '/';
      bar.appendChild(sep);
      const btn = document.createElement('button');
      btn.type = 'button';
      const isLast = idx === parts.length - 1;
      btn.className = `finder-path-seg ${isLast ? 'current' : ''}`;
      btn.textContent = part;
      const target = accumulated;
      if (!isLast) btn.addEventListener('click', () => navigateFolder(target));
      bar.appendChild(btn);
    });
  }

  function renderFinderFiles() {
    const grid = document.getElementById('finder-file-grid');
    const status = document.getElementById('finder-status-text');
    if (!grid) return;
    grid.innerHTML = '';
    renderFinderPath();

    const recentsMode = state.finderView === 'recents';
    const filter = state.finderFilter || 'all';
    const list = recentsMode
      ? loadRecents()
      : (filter === 'all' ? (state.files || []) : (state.files || []).filter(f => f.type === filter));

    if (status) {
      status.textContent = recentsMode
        ? `최근 항목 ${list.length}개`
        : (filter === 'all' ? `${state.total}개 항목 · ${state.page}/${state.pages}페이지` : `${list.length}개 표시 중`);
    }

    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'grid-column:1/-1;text-align:center;color:#86868b;padding:28px 12px;font-size:13px;line-height:1.5';
      if (recentsMode) {
        empty.textContent = '최근에 연 파일이 없습니다.';
      } else if (filter !== 'all') {
        empty.textContent = '이 종류에 해당하는 항목이 없습니다.';
      } else if (state.folder) {
        empty.textContent = '이 폴더가 비어 있습니다. 상단의 새 폴더나 새 파일 버튼을 이용해 보세요.';
      } else {
        empty.textContent = '보관함이 비어 있습니다. 파일을 업로드하거나 새 폴더를 만들어 보세요.';
      }
      grid.appendChild(empty);
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

      const openFinderFile = () => {
        recordRecent(file);
        if (file.type === 'folder') { navigateFolder(file.path); return; }
        if (file.isText) {
          openEditorWithFile(file.path || file.name);
        } else {
          state.previewableList = recentsMode ? list : state.files;
          const idx = state.previewableList.findIndex(f => f.path === file.path);
          if (idx !== -1) openPreview(idx);
        }
      };

      item.addEventListener('click', (e) => {
        if (e.target.closest('input[type="checkbox"]')) return;
        grid.querySelectorAll('.finder-item.selected').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        if (window.innerWidth <= 768) openFinderFile();
      });
      item.addEventListener('dblclick', (e) => {
        e.preventDefault();
        grid.querySelectorAll('.finder-item.selected').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        openFinderFile();
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
      recordRecent({ path: filename, name: filename.split('/').pop(), type: 'document', isText: true });
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
      copyCmdBtn.addEventListener('click', async () => {
        const cmd = './setup-desktop.sh start';
        if (await copyToClipboard(cmd)) {
          showToast('✓ 구축 명령어가 복사되었습니다: ' + cmd);
        } else {
          showToast('복사 실패');
        }
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
        const themeMode = document.getElementById('cc-theme-mode');
        if (themeMode) themeMode.textContent = DESKTOP_THEME_LABELS[theme] || theme;
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

  // ==========================================================================
  // 🖥️ Pulse OS 8대 핵심 기능 고도화 구현 (v2.0.0)
  // ==========================================================================

  // 1. Spotlight 전역 검색 & 런처 (Cmd/Ctrl + Space)
  function setupSpotlightLogic() {
    const spotlightEl = document.getElementById('desktop-spotlight');
    const inputEl = document.getElementById('spotlight-input');
    const resultsEl = document.getElementById('spotlight-results');
    const closeBtn = document.getElementById('spotlight-close-btn');
    const openBtn = document.getElementById('btn-desktop-spotlight');

    if (!spotlightEl || !inputEl || !resultsEl) return;

    let selectedIdx = 0;
    let currentItems = [];

    function openSpotlight() {
      spotlightEl.classList.remove('hidden');
      inputEl.value = '';
      selectedIdx = 0;
      renderSpotlightResults('');
      setTimeout(() => inputEl.focus(), 60);
    }

    function closeSpotlight() {
      spotlightEl.classList.add('hidden');
    }

    if (openBtn) openBtn.addEventListener('click', openSpotlight);
    if (closeBtn) closeBtn.addEventListener('click', closeSpotlight);

    spotlightEl.addEventListener('click', (e) => {
      if (e.target === spotlightEl) closeSpotlight();
    });

    window.addEventListener('keydown', (e) => {
      if (state.currentAppView !== 'desktop') return;
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        if (spotlightEl.classList.contains('hidden')) openSpotlight();
        else closeSpotlight();
      }
    });

    inputEl.addEventListener('input', (e) => {
      selectedIdx = 0;
      renderSpotlightResults(e.target.value.trim());
    });

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSpotlight();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentItems.length > 0) {
          selectedIdx = (selectedIdx + 1) % currentItems.length;
          updateHighlight();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentItems.length > 0) {
          selectedIdx = (selectedIdx - 1 + currentItems.length) % currentItems.length;
          updateHighlight();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentItems.length > 0 && currentItems[selectedIdx]) {
          executeSpotlightItem(currentItems[selectedIdx]);
        }
      }
    });

    function updateHighlight() {
      const itemEls = resultsEl.querySelectorAll('.spotlight-item');
      itemEls.forEach((itemNode, i) => {
        itemNode.classList.toggle('active', i === selectedIdx);
        if (i === selectedIdx) itemNode.scrollIntoView({ block: 'nearest' });
      });
    }

    function executeSpotlightItem(item) {
      closeSpotlight();
      if (item.action) item.action();
    }

    function tryEvaluateMath(expr) {
      if (!expr || expr.length < 2) return null;
      const sanitized = expr.replace(/\^/g, '**').replace(/×/g, '*').replace(/÷/g, '/');
      if (!/^[0-9\s\+\-\*\/\%\(\)\.\*\*]+$/.test(sanitized)) return null;
      if (!/[\+\-\*\/\%]/.test(sanitized)) return null;
      try {
        const res = Function(`"use strict"; return (${sanitized});`)();
        if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
          return res;
        }
      } catch (_) {}
      return null;
    }

    function renderSpotlightResults(query) {
      resultsEl.innerHTML = '';
      currentItems = [];

      // Check math calculation
      const mathResult = tryEvaluateMath(query);
      if (mathResult !== null) {
        const formattedResult = Number(mathResult.toFixed(6)).toLocaleString();
        const calcCard = document.createElement('div');
        calcCard.className = 'spotlight-calc-card';
        calcCard.innerHTML = `
          <div class="spotlight-calc-expr">${escapeHtml(query)} =</div>
          <div class="spotlight-calc-result">${formattedResult}</div>
        `;
        resultsEl.appendChild(calcCard);

        currentItems.push({
          type: 'calc',
          action: async () => {
            if (await copyToClipboard(String(mathResult))) {
              showToast(`계산 결과(${formattedResult})가 클립보드에 복사되었습니다.`);
            } else {
              showToast(`계산 결과: ${formattedResult}`);
            }
          }
        });
      }

      // App list
      const allApps = [
        { id: 'finder', name: 'Pulse 파일', en: 'finder files', icon: '📁', desc: '파일 및 폴더 탐색기' },
        { id: 'terminal', name: 'Pulse 터미널', en: 'terminal bash shell cli', icon: '💻', desc: 'Linux 셸 명령 실행기', admin: true },
        { id: 'editor', name: 'Pulse 에디터', en: 'editor code text notepad', icon: '📝', desc: '코드 및 텍스트 편집기' },
        { id: 'stickies', name: '스티커 메모', en: 'stickies memo notes postit', icon: '📌', desc: '바탕화면 포스트잇 메모' },
        { id: 'notes', name: 'Pulse Notes', en: 'notes markdown memo journal', icon: '📓', desc: '마크다운 메모장' },
        { id: 'calculator', name: '계산기', en: 'calculator calc math', icon: '🧮', desc: '계산기' },
        { id: 'trash', name: '휴지통', en: 'trash bin recycle', icon: '🗑️', desc: '삭제한 파일 복원', admin: true },
        { id: 'music', name: 'Pulse 음악', en: 'music audio player mp3', icon: '🎵', desc: '보관함 미디어 플레이어' },
        { id: 'photos', name: 'Pulse Photos', en: 'photos gallery image picture camera', icon: '📸', desc: '날짜별 사진 갤러리' },
        { id: 'clipboard', name: '클립보드 히스토리', en: 'clipboard clip history copy paste', icon: '📋', desc: '복사한 텍스트 기록 및 핀 보관함' },
        { id: 'cam', name: 'Pulse Cam', en: 'cam camera cctv homecam webcam 홈캠 카메라', icon: '📷', desc: '스마트폰 원격 홈캠 / CCTV 모니터' },
        { id: 'api', name: 'API 서비스 (Studio)', en: 'api apis studio webhook 웹훅 함수 serverless rest endpoint 커스텀', icon: '⚡', desc: '나만의 API 직접 설계 및 링크 발급' },
        { id: 'monitor', name: 'Pulse 모니터', en: 'monitor activity resource cpu ram', icon: '📊', desc: '시스템 리소스 실시간 모니터' },
        { id: 'browser', name: 'Pulse 브라우저', en: 'browser web net', icon: '🌐', desc: '웹 사이트 브라우저' },
        { id: 'linux', name: 'Linux 데스크톱', en: 'linux vnc gui xfce desktop', icon: '🐧', desc: 'Termux XFCE4 GUI', admin: true },
        { id: 'settings', name: 'Pulse OS 설정', en: 'settings wallpaper preferences theme', icon: '⚙️', desc: '배경화면 및 환경설정' },
        { id: 'about', name: 'Pulse OS 정보', en: 'about system pulse info', icon: '⚡', desc: 'Pulse OS 시스템 사양 및 버전' },
        { id: '__focus', name: '집중 모드 (Focus Mode)', en: 'focus mode pomodoro dnd timer 방해금지', icon: '🌙', desc: '방해 금지 및 25분 집중 타이머 토글' },
        { id: '__shortcuts', name: '단축키 보기', en: 'shortcuts keybindings keyboard help', icon: '⌨️', desc: 'Pulse OS 전체 단축키 목록 (Ctrl+/)' },
      ];

      const qLower = query.toLowerCase();

      // Matched Apps
      const matchedApps = allApps.filter(app => {
        if (app.admin && !Pulse.isAdmin) return false;
        if (!query) return true;
        return app.name.toLowerCase().includes(qLower) || app.en.includes(qLower) || app.id.includes(qLower);
      });

      if (matchedApps.length > 0) {
        const sec = document.createElement('div');
        sec.className = 'spotlight-section-title';
        sec.textContent = '애플리케이션';
        resultsEl.appendChild(sec);

        matchedApps.forEach(app => {
          const item = {
            type: 'app',
            action: () => {
              if (app.id === '__shortcuts') openShortcutsModal();
              else if (app.id === '__focus') toggleFocusMode();
              else openDesktopWindow(app.id);
            }
          };
          currentItems.push(item);
          const itemIdx = currentItems.length - 1;

          const itemNode = document.createElement('div');
          itemNode.className = `spotlight-item ${itemIdx === selectedIdx ? 'active' : ''}`;
          itemNode.innerHTML = `
            <span class="spotlight-item-icon">${app.icon}</span>
            <div class="spotlight-item-main">
              <div class="spotlight-item-title">${app.name}</div>
              <div class="spotlight-item-sub">${app.desc}</div>
            </div>
          `;
          itemNode.addEventListener('click', () => executeSpotlightItem(item));
          resultsEl.appendChild(itemNode);
        });
      }

      // Matched System Actions
      const actions = [
        { name: '테마 전환 (테마 순환)', icon: '🌓', match: ['테마', 'theme', '다크', 'dark', '라이트', 'light'], action: () => toggleTheme() },
        { name: '미션 컨트롤 (모든 창 보기)', icon: '🪟', match: ['미션', 'mission', '창', 'windows', 'expose'], action: () => toggleMissionControl() },
        { name: '제어 센터 열기', icon: '🎛️', match: ['제어', 'control', '설정', '와이파이', 'ip'], action: () => toggleControlCenter() },
        { name: '화면 새로고침', icon: '🔄', match: ['새로고침', 'refresh', 'reload'], action: () => location.reload() },
        { name: '전체화면 토글', icon: '⛶', match: ['전체화면', 'fullscreen', 'full'], action: () => document.getElementById('btn-desktop-fullscreen')?.click() }
      ];

      const matchedActions = actions.filter(act => {
        if (!query) return false;
        return act.name.toLowerCase().includes(qLower) || act.match.some(m => m.includes(qLower));
      });

      if (matchedActions.length > 0) {
        const sec = document.createElement('div');
        sec.className = 'spotlight-section-title';
        sec.textContent = '시스템 동작';
        resultsEl.appendChild(sec);

        matchedActions.forEach(act => {
          const item = { type: 'action', action: act.action };
          currentItems.push(item);
          const itemIdx = currentItems.length - 1;

          const itemNode = document.createElement('div');
          itemNode.className = `spotlight-item ${itemIdx === selectedIdx ? 'active' : ''}`;
          itemNode.innerHTML = `
            <span class="spotlight-item-icon">${act.icon}</span>
            <div class="spotlight-item-main">
              <div class="spotlight-item-title">${act.name}</div>
              <div class="spotlight-item-sub">시스템 명령 실행</div>
            </div>
          `;
          itemNode.addEventListener('click', () => executeSpotlightItem(item));
          resultsEl.appendChild(itemNode);
        });
      }

      // Matched Files
      if (query && state.files && state.files.length > 0) {
        const matchedFiles = state.files.filter(f => f.name.toLowerCase().includes(qLower)).slice(0, 8);
        if (matchedFiles.length > 0) {
          const sec = document.createElement('div');
          sec.className = 'spotlight-section-title';
          sec.textContent = '보관함 파일';
          resultsEl.appendChild(sec);

          matchedFiles.forEach(file => {
            const isDir = file.type === 'folder';
            const icon = isDir ? '📁' : (file.type === 'image' ? '🖼️' : (file.type === 'video' ? '🎬' : (file.type === 'audio' ? '🎵' : '📄')));
            const item = {
              type: 'file',
              action: () => {
                if (isDir) {
                  openDesktopWindow('finder');
                  navigateFolder(file.path);
                } else if (file.isText) {
                  openDesktopWindow('editor');
                  openEditorWithFile(file.path);
                } else {
                  openQuickLook(file, state.files);
                }
              }
            };
            currentItems.push(item);
            const itemIdx = currentItems.length - 1;

            const itemNode = document.createElement('div');
            itemNode.className = `spotlight-item ${itemIdx === selectedIdx ? 'active' : ''}`;
            itemNode.innerHTML = `
              <span class="spotlight-item-icon">${icon}</span>
              <div class="spotlight-item-main">
                <div class="spotlight-item-title">${escapeHtml(file.name)}</div>
                <div class="spotlight-item-sub">${isDir ? '폴더' : file.sizeFormatted + ' · ' + (file.path || '')}</div>
              </div>
            `;
            itemNode.addEventListener('click', () => executeSpotlightItem(item));
            resultsEl.appendChild(itemNode);
          });
        }
      }

      const recents = loadRecents().filter(file => {
        if (!query) return true;
        return (file.name || '').toLowerCase().includes(qLower) || (file.path || '').toLowerCase().includes(qLower);
      }).slice(0, 6);
      if (recents.length) {
        const sec = document.createElement('div');
        sec.className = 'spotlight-section-title';
        sec.textContent = '최근 항목';
        resultsEl.appendChild(sec);
        recents.forEach(file => {
          const item = {
            type: 'recent',
            action: () => {
              if (file.isText) openEditorWithFile(file.path);
              else if (file.type === 'folder') { openDesktopWindow('finder'); navigateFolder(file.path); }
              else openQuickLook(file, loadRecents());
            }
          };
          currentItems.push(item);
          const itemIdx = currentItems.length - 1;
          const itemNode = document.createElement('div');
          itemNode.className = `spotlight-item ${itemIdx === selectedIdx ? 'active' : ''}`;
          itemNode.innerHTML = `
            <span class="spotlight-item-icon">🕐</span>
            <div class="spotlight-item-main">
              <div class="spotlight-item-title">${escapeHtml(file.name)}</div>
              <div class="spotlight-item-sub">${escapeHtml(file.path || '')}</div>
            </div>
          `;
          itemNode.addEventListener('click', () => executeSpotlightItem(item));
          resultsEl.appendChild(itemNode);
        });
      }

      if (currentItems.length === 0 && !mathResult) {
        resultsEl.innerHTML = `<div class="spotlight-empty">'${escapeHtml(query)}' 검색 결과가 없습니다.</div>`;
      }
    }
  }

  // 2. Quick Look 스페이스바 파일 미리보기
  let currentQuickLookList = [];
  let currentQuickLookIndex = 0;

  function openQuickLook(file, list = null) {
    const ql = document.getElementById('desktop-quicklook');
    if (!ql || !file) return;
    recordRecent(file);

    if (list && list.length > 0) {
      currentQuickLookList = list;
      currentQuickLookIndex = list.findIndex(f => f.path === file.path);
      if (currentQuickLookIndex === -1) currentQuickLookIndex = 0;
    } else {
      currentQuickLookList = [file];
      currentQuickLookIndex = 0;
    }

    renderQuickLookContent();
    ql.classList.remove('hidden');
  }

  function closeQuickLook() {
    const ql = document.getElementById('desktop-quicklook');
    if (!ql) return;
    ql.classList.add('hidden');
    const body = document.getElementById('quicklook-body');
    if (body) {
      const vid = body.querySelector('video, audio');
      if (vid) vid.pause();
      body.innerHTML = '';
    }
  }

  function quickLookNext(dir) {
    if (!currentQuickLookList.length) return;
    currentQuickLookIndex = (currentQuickLookIndex + dir + currentQuickLookList.length) % currentQuickLookList.length;
    renderQuickLookContent();
  }

  function renderQuickLookContent() {
    const file = currentQuickLookList[currentQuickLookIndex];
    if (!file) return;

    const filenameEl = document.getElementById('quicklook-filename');
    const filesizeEl = document.getElementById('quicklook-filesize');
    const counterEl = document.getElementById('quicklook-counter');
    const bodyEl = document.getElementById('quicklook-body');
    const openBtn = document.getElementById('btn-quicklook-open');

    if (filenameEl) filenameEl.textContent = file.name;
    if (filesizeEl) filesizeEl.textContent = file.type === 'folder' ? '폴더' : (file.sizeFormatted || '');
    if (counterEl) counterEl.textContent = `${currentQuickLookIndex + 1} / ${currentQuickLookList.length}`;

    if (openBtn) {
      openBtn.onclick = () => {
        closeQuickLook();
        if (file.type === 'folder') {
          openDesktopWindow('finder');
          navigateFolder(file.path);
        } else if (file.isText) {
          openDesktopWindow('editor');
          openEditorWithFile(file.path);
        } else {
          openPreview(state.files.findIndex(f => f.path === file.path));
        }
      };
    }

    if (!bodyEl) return;
    bodyEl.innerHTML = '<div style="color:rgba(255,255,255,0.6)">불러오는 중...</div>';

    const ext = (file.extension || '').toLowerCase();
    const isImg = file.type === 'image' || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
    const isVideo = file.type === 'video' || ['mp4', 'webm', 'mov', 'mkv'].includes(ext);
    const isAudio = file.type === 'audio' || ['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext);

    const viewUrl = `/api/view/${encodeURIComponent(file.path)}`;

    if (isImg) {
      bodyEl.innerHTML = `<img src="${viewUrl}" alt="${escapeHtml(file.name)}">`;
    } else if (isVideo) {
      bodyEl.innerHTML = `<video controls autoplay style="max-height:100%;max-width:100%" src="${viewUrl}"></video>`;
    } else if (isAudio) {
      bodyEl.innerHTML = `
        <div style="text-align:center;padding:20px;">
          <div style="font-size:48px;margin-bottom:12px;">🎵</div>
          <div style="margin-bottom:14px;font-weight:500;">${escapeHtml(file.name)}</div>
          <audio controls autoplay src="${viewUrl}"></audio>
        </div>`;
    } else if (file.isText || ['txt', 'md', 'js', 'py', 'html', 'css', 'json', 'sh', 'log'].includes(ext)) {
      fetch(viewUrl)
        .then(r => r.ok ? r.text() : Promise.reject('파일을 읽을 수 없습니다.'))
        .then(txt => {
          bodyEl.innerHTML = `<pre class="quicklook-code">${escapeHtml(txt.slice(0, 100000))}</pre>`;
        })
        .catch(err => {
          bodyEl.innerHTML = `<div style="color:#ff6b6b;padding:20px;">${escapeHtml(err)}</div>`;
        });
    } else {
      bodyEl.innerHTML = `
        <div style="text-align:center;padding:30px;">
          <div style="font-size:56px;margin-bottom:12px;">📄</div>
          <div style="font-size:16px;font-weight:600;margin-bottom:6px;">${escapeHtml(file.name)}</div>
          <div style="color:rgba(255,255,255,0.5);font-size:13px;margin-bottom:20px;">${file.sizeFormatted || ''}</div>
          <a href="/api/download/${encodeURIComponent(file.path)}" download="${escapeHtml(file.name)}" class="quicklook-btn" style="text-decoration:none;display:inline-block;padding:8px 16px;">파일 다운로드</a>
        </div>`;
    }
  }

  function getSelectedDesktopOrFinderFile() {
    const activeFinderItem = document.querySelector('.finder-item.active, .finder-item.selected');
    if (activeFinderItem && activeFinderItem._file) return activeFinderItem._file;
    if (activeFinderItem && activeFinderItem.dataset.path) {
      return state.files.find(f => f.path === activeFinderItem.dataset.path) ||
        state.desktopFiles.find(f => f.path === activeFinderItem.dataset.path) ||
        loadRecents().find(f => f.path === activeFinderItem.dataset.path);
    }
    const deskIcon = document.querySelector('.desktop-file-icon.selected');
    if (deskIcon && deskIcon._file) return deskIcon._file;
    const activeShortcut = document.querySelector('.desktop-shortcut.selected');
    if (activeShortcut && activeShortcut.dataset.path) {
      return state.files.find(f => f.path === activeShortcut.dataset.path);
    }
    return null;
  }

  function setupQuickLookLogic() {
    const ql = document.getElementById('desktop-quicklook');
    const closeBtn = document.getElementById('btn-quicklook-close');
    const prevBtn = document.getElementById('btn-quicklook-prev');
    const nextBtn = document.getElementById('btn-quicklook-next');

    if (closeBtn) closeBtn.addEventListener('click', closeQuickLook);
    if (prevBtn) prevBtn.addEventListener('click', () => quickLookNext(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => quickLookNext(1));

    if (ql) {
      ql.addEventListener('click', (e) => {
        if (e.target === ql) closeQuickLook();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (state.currentAppView !== 'desktop') return;
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (['INPUT', 'TEXTAREA'].includes(tag) || document.activeElement.isContentEditable) return;

      if (e.code === 'Space') {
        if (ql && !ql.classList.contains('hidden')) {
          e.preventDefault();
          closeQuickLook();
        } else {
          const file = getSelectedDesktopOrFinderFile();
          if (file) {
            e.preventDefault();
            const list = document.querySelector('.desktop-file-icon.selected') ? state.desktopFiles : state.files;
            openQuickLook(file, list);
          }
        }
      } else if (e.key === 'Escape') {
        if (ql && !ql.classList.contains('hidden')) {
          e.preventDefault();
          closeQuickLook();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (ql && !ql.classList.contains('hidden')) {
          e.preventDefault();
          quickLookNext(1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (ql && !ql.classList.contains('hidden')) {
          e.preventDefault();
          quickLookNext(-1);
        }
      }
    });
  }

  // 3. Mission Control 멀티태스킹 뷰
  let missionControlActive = false;
  let savedWindowTransforms = {};

  function toggleMissionControl() {
    if (missionControlActive) {
      deactivateMissionControl();
    } else {
      activateMissionControl();
    }
  }

  function activateMissionControl() {
    const screen = document.getElementById('desktop-screen');
    if (!screen) return;

    const openWins = Object.keys(state.openWindows)
      .map(id => document.getElementById('win-' + id))
      .filter(w => w && !w.classList.contains('hidden') && !w.classList.contains('window-minimized'));

    if (openWins.length === 0) {
      showToast('현재 열려 있는 활성 창이 없습니다.');
      return;
    }

    missionControlActive = true;
    screen.classList.add('mission-control-active');
    savedWindowTransforms = {};

    const screenW = screen.clientWidth;
    const screenH = screen.clientHeight - 80;
    const count = openWins.length;

    let cols = 1;
    if (count === 2) cols = 2;
    else if (count >= 3 && count <= 4) cols = 2;
    else if (count >= 5) cols = 3;

    const rows = Math.ceil(count / cols);
    const cellW = screenW / cols;
    const cellH = screenH / rows;

    openWins.forEach((win, idx) => {
      const appId = win.getAttribute('data-app');
      savedWindowTransforms[appId] = {
        top: win.style.top,
        left: win.style.left,
        transform: win.style.transform
      };

      const c = idx % cols;
      const r = Math.floor(idx / cols);

      const targetCenterX = c * cellW + cellW / 2;
      const targetCenterY = 40 + r * cellH + cellH / 2;

      const winW = win.offsetWidth;
      const winH = win.offsetHeight;
      const winLeft = win.offsetLeft;
      const winTop = win.offsetTop;
      const curCenterX = winLeft + winW / 2;
      const curCenterY = winTop + winH / 2;

      const scale = Math.min((cellW * 0.8) / winW, (cellH * 0.8) / winH, 0.75);
      const deltaX = targetCenterX - curCenterX;
      const deltaY = targetCenterY - curCenterY;

      win.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scale})`;

      let badge = win.querySelector('.mission-control-badge');
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'mission-control-badge';
        const titles = {
          terminal: 'Pulse 터미널', finder: 'Pulse 파일', editor: 'Pulse 에디터',
          monitor: 'Pulse 모니터', browser: 'Pulse 브라우저', linux: 'Linux 데스크톱',
          settings: 'Pulse OS 설정', about: 'Pulse OS 정보', stickies: '스티커 메모', music: 'Pulse 음악',
          notes: 'Pulse Notes', calculator: '계산기', trash: '휴지통'
        };
        badge.textContent = titles[appId] || '윈도우';
        win.appendChild(badge);
      }

      function winClickHandler(e) {
        e.stopPropagation();
        deactivateMissionControl();
        bringWindowToFront(appId);
        win.removeEventListener('click', winClickHandler);
      }
      win.addEventListener('click', winClickHandler, { once: true });
    });
  }

  function deactivateMissionControl() {
    const screen = document.getElementById('desktop-screen');
    if (!screen) return;
    missionControlActive = false;
    screen.classList.remove('mission-control-active');

    Object.keys(savedWindowTransforms).forEach(appId => {
      const win = document.getElementById('win-' + appId);
      if (win) {
        win.style.transform = savedWindowTransforms[appId].transform || '';
        const badge = win.querySelector('.mission-control-badge');
        if (badge) badge.remove();
      }
    });
    savedWindowTransforms = {};
  }

  function setupMissionControlLogic() {
    const missionBtn = document.getElementById('btn-desktop-mission');
    if (missionBtn) missionBtn.addEventListener('click', toggleMissionControl);

    const screen = document.getElementById('desktop-screen');
    if (screen) {
      screen.addEventListener('click', (e) => {
        if (missionControlActive && !e.target.closest('.desktop-window')) {
          deactivateMissionControl();
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      if (state.currentAppView !== 'desktop') return;
      if (e.key === 'Escape' && missionControlActive) {
        e.preventDefault();
        deactivateMissionControl();
        return;
      }
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (['INPUT', 'TEXTAREA'].includes(tag) || document.activeElement?.isContentEditable) return;
      if (e.key === 'F3' || ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp')) {
        e.preventDefault();
        toggleMissionControl();
      }
    });
  }

  // 4. 바탕화면 마키(Marquee) 사각형 다중 선택
  function setupDesktopIconsAndMarquee() {
    const canvas = document.getElementById('desktop-canvas');
    const marquee = document.getElementById('desktop-marquee-selection');
    if (!canvas || !marquee) return;

    let isSelecting = false;
    let startX = 0, startY = 0;

    canvas.addEventListener('mousedown', (e) => {
      if (e.target.closest('.desktop-window') ||
          e.target.closest('.desktop-dock-wrap') ||
          e.target.closest('.desktop-menubar') ||
          e.target.closest('.desktop-shortcut') ||
          e.target.closest('.desktop-file-icon') ||
          e.target.closest('.desktop-context-menu')) {
        return;
      }
      if (e.button !== 0) return;

      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;

      if (!e.shiftKey) {
        document.querySelectorAll('.desktop-shortcut.selected').forEach(sc => sc.classList.remove('selected'));
      }

      const canvasRect = canvas.getBoundingClientRect();
      marquee.style.left = `${startX - canvasRect.left}px`;
      marquee.style.top = `${startY - canvasRect.top}px`;
      marquee.style.width = '0px';
      marquee.style.height = '0px';
      marquee.classList.remove('hidden');
    });

    window.addEventListener('mousemove', (e) => {
      if (!isSelecting) return;

      const curX = e.clientX;
      const curY = e.clientY;
      const canvasRect = canvas.getBoundingClientRect();

      const leftVp = Math.min(startX, curX);
      const topVp = Math.min(startY, curY);
      const width = Math.abs(curX - startX);
      const height = Math.abs(curY - startY);

      marquee.style.left = `${leftVp - canvasRect.left}px`;
      marquee.style.top = `${topVp - canvasRect.top}px`;
      marquee.style.width = `${width}px`;
      marquee.style.height = `${height}px`;

      const mRect = { left: leftVp, top: topVp, right: leftVp + width, bottom: topVp + height };

      document.querySelectorAll('.desktop-shortcut').forEach(sc => {
        const sRect = sc.getBoundingClientRect();
        const overlap = !(
          sRect.right < mRect.left ||
          sRect.left > mRect.right ||
          sRect.bottom < mRect.top ||
          sRect.top > mRect.bottom
        );
        sc.classList.toggle('selected', overlap);
      });
    });

    window.addEventListener('mouseup', () => {
      if (isSelecting) {
        isSelecting = false;
        marquee.classList.add('hidden');
      }
    });

    document.querySelectorAll('.desktop-shortcut').forEach(sc => {
      sc.addEventListener('click', (e) => {
        if (!e.shiftKey) {
          document.querySelectorAll('.desktop-shortcut.selected').forEach(s => s.classList.remove('selected'));
        }
        sc.classList.add('selected');
      });
    });
  }

  // 5. macOS 통합 제어 센터 (Control Center)
  function toggleTheme() {
    const screen = document.getElementById('desktop-screen');
    const themes = ['sonoma', 'sequoia', 'cyber', 'midnight'];
    const current = localStorage.getItem('desktop_theme') || 'sonoma';
    const next = themes[(themes.indexOf(current) + 1) % themes.length];
    if (screen) screen.className = `desktop-screen theme-${next}`;
    localStorage.setItem('desktop_theme', next);
    document.querySelectorAll('.wp-option').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-theme') === next);
    });
    const themeMode = document.getElementById('cc-theme-mode');
    if (themeMode) themeMode.textContent = DESKTOP_THEME_LABELS[next] || next;
    showToast(`테마가 '${DESKTOP_THEME_LABELS[next] || next}'(으)로 변경되었습니다.`);
  }

  function toggleControlCenter() {
    const cc = document.getElementById('desktop-control-center-popover');
    if (!cc) return;
    document.getElementById('desktop-notify-popover')?.classList.add('hidden');
    const isHidden = cc.classList.toggle('hidden');
    if (!isHidden) {
      updateControlCenterData();
    }
  }

  function updateControlCenterData() {
    const ipVal = document.getElementById('cc-ip-val');
    const batVal = document.getElementById('cc-battery-val');
    const cpuVal = document.getElementById('cc-cpu-val');
    const memVal = document.getElementById('cc-mem-val');

    if (state.dashboardData) {
      if (ipVal && state.dashboardData.network) ipVal.textContent = state.dashboardData.network.localIp;
      if (batVal && state.dashboardData.battery) batVal.textContent = state.dashboardData.battery.percentage !== null ? `${state.dashboardData.battery.percentage}%` : '연결됨';
      if (cpuVal && state.dashboardData.cpu) cpuVal.textContent = state.dashboardData.cpu.usage !== undefined ? `${state.dashboardData.cpu.usage}%` : `${state.dashboardData.cpu.cores || 4}코어`;
      if (memVal && state.dashboardData.memory) memVal.textContent = state.dashboardData.memory.usedFormatted || '정상';

      const tunnelTile = document.getElementById('cc-tile-tunnel');
      const tunnelVal = document.getElementById('cc-tunnel-val');
      const tunnel = state.dashboardData.network?.tunnel;
      if (tunnelTile && tunnelVal) {
        if (tunnel && tunnel.active && tunnel.url) {
          tunnelTile.classList.remove('hidden');
          tunnelVal.textContent = tunnel.url;
        } else {
          tunnelTile.classList.add('hidden');
        }
      }
    }

    const themeMode = document.getElementById('cc-theme-mode');
    const theme = localStorage.getItem('desktop_theme') || 'sonoma';
    if (themeMode) themeMode.textContent = DESKTOP_THEME_LABELS[theme] || theme;
  }

  function setupControlCenterLogic() {
    const ccBtn = document.getElementById('btn-desktop-control-center');
    const cc = document.getElementById('desktop-control-center-popover');
    if (!cc) return;

    if (ccBtn) ccBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleControlCenter();
    });

    document.addEventListener('click', (e) => {
      if (cc && !cc.classList.contains('hidden')) {
        if (!cc.contains(e.target) && e.target !== ccBtn && !ccBtn?.contains(e.target)) {
          cc.classList.add('hidden');
        }
      }
    });

    const copyIpBtn = document.getElementById('btn-cc-copy-ip');
    if (copyIpBtn) {
      copyIpBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const ip = document.getElementById('cc-ip-val')?.textContent || '';
        if (ip && await copyToClipboard(ip)) {
          showToast(`IP 주소(${ip})가 클립보드에 복사되었습니다.`);
        }
      });
    }

    const copyTunnelBtn = document.getElementById('btn-cc-copy-tunnel');
    if (copyTunnelBtn) {
      copyTunnelBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const url = document.getElementById('cc-tunnel-val')?.textContent || '';
        if (url && await copyToClipboard(url)) {
          showToast(`외부 접속 주소가 복사되었습니다:\n${url}`);
        }
      });
    }

    const themeBtn = document.getElementById('btn-cc-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        toggleTheme();
        updateControlCenterData();
      });
    }

    const blurSlider = document.getElementById('cc-blur-slider');
    const blurVal = document.getElementById('cc-blur-val');
    if (blurSlider) {
      blurSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        if (blurVal) blurVal.textContent = `${val}px`;
        const screen = document.getElementById('desktop-screen');
        if (screen) screen.style.backdropFilter = val > 0 ? `blur(${val}px)` : '';
      });
    }

    const volSlider = document.getElementById('cc-volume-slider');
    const volVal = document.getElementById('cc-volume-val');
    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        if (volVal) volVal.textContent = `${val}%`;
        const audio = document.getElementById('pulse-bg-audio');
        if (audio) audio.volume = val / 100;
        const musicVol = document.getElementById('music-vol-slider');
        if (musicVol) musicVol.value = val;
      });
    }

    document.getElementById('btn-cc-reload')?.addEventListener('click', () => location.reload());
    document.getElementById('btn-cc-mission')?.addEventListener('click', () => {
      cc.classList.add('hidden');
      toggleMissionControl();
    });
    document.getElementById('btn-cc-restart')?.addEventListener('click', async () => {
      if (!await Pulse.ask('서버를 재시작하시겠습니까?', { confirm: '재시작' })) return;
      try {
        await Pulse.post('/api/restart');
        showToast('서버를 재시작하는 중입니다...');
      } catch (e) {
        showToast('재시작 명령 실패: ' + e.message);
      }
    });
  }

  function fileGlyph(file) {
    if (file.type === 'folder') return '📁';
    if (file.type === 'image') return '🖼️';
    if (file.type === 'video') return '🎬';
    if (file.type === 'audio') return '🎵';
    if (file.isText) return '📄';
    return '📎';
  }

  async function fetchDesktopFiles() {
    try {
      const data = await Pulse.api('/api/files?' + new URLSearchParams({
        path: 'Desktop', page: 1, limit: 100, type: 'all', q: '', sort: 'name-asc'
      }));
      state.desktopFiles = data.files || [];
    } catch (_) {
      state.desktopFiles = [];
    }
    renderDesktopFiles();
  }

  function renderDesktopFiles() {
    const grid = document.getElementById('desktop-files-grid');
    if (!grid) return;
    grid.innerHTML = '';
    (state.desktopFiles || []).forEach(file => {
      const elIcon = document.createElement('div');
      elIcon.className = 'desktop-file-icon';
      elIcon.tabIndex = 0;
      elIcon.dataset.path = file.path;
      elIcon._file = file;
      elIcon.title = file.name;
      const thumb = file.thumbnailUrl
        ? `<img src="${escapeHtml(file.thumbnailUrl)}" alt="">`
        : fileGlyph(file);
      elIcon.innerHTML = `<div class="desktop-file-glyph">${thumb}</div><span class="desktop-file-name">${escapeHtml(file.name)}</span>`;
      elIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        grid.querySelectorAll('.desktop-file-icon.selected').forEach(n => n.classList.remove('selected'));
        elIcon.classList.add('selected');
        if (window.innerWidth <= 768) openDesktopFile(file);
      });
      elIcon.addEventListener('dblclick', (e) => {
        e.preventDefault();
        openDesktopFile(file);
      });
      elIcon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') openDesktopFile(file);
      });
      grid.appendChild(elIcon);
    });
  }

  function openDesktopFile(file) {
    if (!file) return;
    recordRecent(file);
    if (file.type === 'folder') {
      openDesktopWindow('finder');
      navigateFolder(file.path);
    } else if (file.isText) {
      openEditorWithFile(file.path);
    } else if (file.type === 'audio') {
      openDesktopWindow('music');
      openQuickLook(file, state.desktopFiles);
    } else {
      openQuickLook(file, state.desktopFiles);
    }
  }

  function renderNotificationCenter() {
    const list = document.getElementById('notify-list');
    const dot = document.getElementById('menubar-notify-dot');
    if (!list) return;
    const items = loadNotifications();
    if (dot) dot.classList.toggle('hidden', !items.some(n => n.unread));
    if (!items.length) {
      list.innerHTML = '<div class="notify-empty">새 알림이 없습니다.</div>';
      return;
    }
    list.innerHTML = '';
    items.forEach(n => {
      const row = document.createElement('div');
      row.className = 'notify-item';
      row.innerHTML = `<div class="notify-item-title">${escapeHtml(n.title)}</div>
        <div class="notify-item-body">${escapeHtml(n.body || '')}</div>
        <div class="notify-item-time">${formatNotifyTime(n.time)}</div>`;
      list.appendChild(row);
    });
  }

  function setupNotificationCenter() {
    const btn = document.getElementById('btn-desktop-notifications');
    const pop = document.getElementById('desktop-notify-popover');
    const clearBtn = document.getElementById('btn-notify-clear');
    if (!pop) return;
    renderNotificationCenter();
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cc = document.getElementById('desktop-control-center-popover');
        if (cc) cc.classList.add('hidden');
        const opening = pop.classList.contains('hidden');
        pop.classList.toggle('hidden');
        if (opening) {
          const items = loadNotifications().map(n => ({ ...n, unread: false }));
          localStorage.setItem('pulse_notifications', JSON.stringify(items));
          renderNotificationCenter();
        }
      });
    }
    document.addEventListener('click', (e) => {
      if (!pop.classList.contains('hidden') && !pop.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
        pop.classList.add('hidden');
      }
    });
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        localStorage.setItem('pulse_notifications', '[]');
        renderNotificationCenter();
      });
    }
  }

  // 6. 맥 스타일 스티커 메모 (여러 장)
  function setupStickiesLogic() {
    const textarea = document.getElementById('sticky-textarea');
    const charCount = document.getElementById('sticky-char-count');
    const stickyBody = document.getElementById('sticky-body');
    const foldBtn = document.getElementById('btn-stickies-fold');
    const winStickies = document.getElementById('win-stickies');
    const tabsEl = document.getElementById('sticky-tabs');
    if (!textarea || !stickyBody) return;

    let notes = [];
    let activeId = '';

    function persist() {
      localStorage.setItem('pulse_stickies_notes', JSON.stringify({ notes, activeId }));
    }
    function loadStore() {
      try {
        const parsed = JSON.parse(localStorage.getItem('pulse_stickies_notes') || 'null');
        if (parsed && Array.isArray(parsed.notes) && parsed.notes.length) {
          notes = parsed.notes;
          activeId = parsed.activeId || notes[0].id;
          return;
        }
      } catch (_) {}
      const legacyText = localStorage.getItem('pulse_stickies_text') || '';
      const legacyColor = localStorage.getItem('pulse_stickies_color') || 'yellow';
      notes = [{ id: 'n1', color: legacyColor, text: legacyText }];
      activeId = 'n1';
      persist();
    }
    function current() {
      return notes.find(n => n.id === activeId) || notes[0];
    }
    function renderTabs() {
      if (!tabsEl) return;
      tabsEl.innerHTML = '';
      notes.forEach((n, i) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = `sticky-tab ${n.id === activeId ? 'active' : ''}`;
        const label = (n.text || '').trim().split('\n')[0] || `메모 ${i + 1}`;
        tab.textContent = label.slice(0, 16);
        tab.addEventListener('click', () => { activeId = n.id; persist(); paint(); });
        tabsEl.appendChild(tab);
      });
    }
    function paint() {
      const n = current();
      if (!n) return;
      textarea.value = n.text || '';
      if (charCount) charCount.textContent = `${(n.text || '').length}자`;
      stickyBody.className = `sticky-body theme-${n.color || 'yellow'}`;
      document.querySelectorAll('#win-stickies .sticky-color-dot').forEach(dot => {
        dot.classList.toggle('active', dot.getAttribute('data-color') === (n.color || 'yellow'));
      });
      renderTabs();
    }

    loadStore();
    paint();

    textarea.addEventListener('input', (e) => {
      const n = current();
      if (!n) return;
      n.text = e.target.value;
      if (charCount) charCount.textContent = `${n.text.length}자`;
      persist();
      renderTabs();
    });

    document.querySelectorAll('#win-stickies .sticky-color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const n = current();
        if (!n) return;
        n.color = dot.getAttribute('data-color');
        persist();
        paint();
      });
    });

    document.getElementById('btn-sticky-new')?.addEventListener('click', () => {
      const id = 'n' + Date.now().toString(36);
      notes.push({ id, color: 'yellow', text: '' });
      activeId = id;
      persist();
      paint();
      textarea.focus();
    });

    document.getElementById('btn-sticky-delete')?.addEventListener('click', async () => {
      if (notes.length <= 1) {
        const n = current();
        if (n) n.text = '';
        persist();
        paint();
        return;
      }
      if (!await Pulse.ask('이 스티커 메모를 삭제할까요?', { confirm: '삭제' })) return;
      notes = notes.filter(n => n.id !== activeId);
      activeId = notes[0].id;
      persist();
      paint();
    });

    if (foldBtn && winStickies) {
      foldBtn.addEventListener('click', () => {
        winStickies.classList.toggle('window-folded');
      });
      winStickies.querySelector('.sticky-header')?.addEventListener('dblclick', (e) => {
        if (e.target.closest('.sticky-actions') || e.target.closest('.traffic-light')) return;
        winStickies.classList.toggle('window-folded');
      });
    }
  }

  function setupNotesLogic() {
    const listEl = document.getElementById('notes-list');
    const titleEl = document.getElementById('notes-title-input');
    const bodyEl = document.getElementById('notes-textarea');
    const statusEl = document.getElementById('notes-status');
    if (!listEl || !bodyEl) return;
    if (!Pulse.isAdmin) {
      bodyEl.readOnly = true;
      if (titleEl) titleEl.readOnly = true;
    }
    let currentPath = '';
    let dirty = false;

    function setStatus(text) { if (statusEl) statusEl.textContent = text; }

    window.loadNotesList = async function loadNotesList() {
      try {
        const data = await Pulse.api('/api/files?' + new URLSearchParams({
          path: 'Notes', page: 1, limit: 100, type: 'all', q: '', sort: 'modified-desc'
        }));
        const files = (data.files || []).filter(f => f.type !== 'folder' && (f.isText || (f.extension || '') === 'md'));
        listEl.innerHTML = '';
        if (!files.length) {
          listEl.innerHTML = '<div class="notes-item-sub" style="padding:12px">저장된 메모가 없습니다.</div>';
        }
        files.forEach(file => {
          const item = document.createElement('div');
          item.className = `notes-item ${file.path === currentPath ? 'active' : ''}`;
          item.innerHTML = `<div>${escapeHtml(file.name.replace(/\.md$/i, ''))}</div><div class="notes-item-sub">${escapeHtml(file.dateFormatted || '')}</div>`;
          item.addEventListener('click', () => openNote(file));
          listEl.appendChild(item);
        });
      } catch (err) {
        setStatus('메모 목록을 불러오지 못했습니다.');
      }
    };

    async function openNote(file) {
      if (dirty && !await Pulse.ask('저장하지 않은 메모가 있습니다. 계속할까요?', { confirm: '변경 버리기' })) return;
      try {
        const res = await fetch('/api/preview/' + encodeURIComponent(file.path));
        if (!res.ok) throw new Error('메모를 열 수 없습니다.');
        bodyEl.value = await res.text();
        titleEl.value = file.name.replace(/\.md$/i, '');
        currentPath = file.path;
        dirty = false;
        setStatus(file.path);
        recordRecent(file);
        loadNotesList();
      } catch (err) {
        showToast(err.message);
      }
    }

    async function saveNote() {
      if (!Pulse.isAdmin) return;
      const title = (titleEl.value || '').trim() || '새 메모';
      const safe = title.replace(/[\\/]/g, '').replace(/\.md$/i, '');
      const path = currentPath && currentPath.startsWith('Notes/') ? currentPath : `Notes/${safe}.md`;
      try {
        await Pulse.post('/api/files/save', { filename: path, content: bodyEl.value });
        currentPath = path;
        dirty = false;
        setStatus(`저장됨 · ${path}`);
        recordRecent({ path, name: `${safe}.md`, type: 'document', isText: true });
        await loadNotesList();
        showToast('메모를 저장했습니다.');
      } catch (err) {
        showToast('저장 실패: ' + err.message);
      }
    }

    titleEl?.addEventListener('input', () => { dirty = true; setStatus('수정됨 · 저장되지 않음'); });
    bodyEl.addEventListener('input', () => { dirty = true; setStatus('수정됨 · 저장되지 않음'); });
    document.getElementById('btn-notes-save')?.addEventListener('click', saveNote);
    document.getElementById('btn-notes-new')?.addEventListener('click', async () => {
      if (!Pulse.isAdmin) return;
      if (dirty && !await Pulse.ask('저장하지 않은 메모가 있습니다. 새 메모를 만들까요?', { confirm: '계속' })) return;
      const name = await Pulse.ask('새 메모 제목:', { input: true, value: '새 메모' });
      if (!name || !name.trim()) return;
      const safe = name.trim().replace(/[\\/]/g, '');
      const path = `Notes/${safe}.md`;
      try {
        await Pulse.post('/api/files/create', { filename: path, content: '' });
        currentPath = path;
        titleEl.value = safe;
        bodyEl.value = '';
        dirty = false;
        setStatus(path);
        await loadNotesList();
        bodyEl.focus();
      } catch (err) {
        if (String(err.message).includes('같은 이름')) {
          currentPath = path;
          openNote({ path, name: `${safe}.md`, isText: true, type: 'document' });
        } else showToast(err.message);
      }
    });
    bodyEl.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveNote();
      }
    });
  }

  function setupCalculatorLogic() {
    const display = document.getElementById('calc-display');
    const grid = document.getElementById('calc-grid');
    if (!display || !grid) return;
    let curr = '0';
    let prev = null;
    let op = null;
    let fresh = true;
    function show() { display.textContent = curr; }
    function compute() {
      if (prev == null || !op) return;
      const a = parseFloat(prev);
      const b = parseFloat(curr);
      let r = b;
      if (op === '+') r = a + b;
      else if (op === '-') r = a - b;
      else if (op === '*') r = a * b;
      else if (op === '/') r = b === 0 ? NaN : a / b;
      curr = Number.isFinite(r) ? String(Number(r.toPrecision(12))) : '오류';
      prev = null;
      op = null;
      fresh = true;
    }
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-calc]');
      if (!btn) return;
      const key = btn.getAttribute('data-calc');
      if (key >= '0' && key <= '9') {
        curr = (fresh || curr === '0' || curr === '오류') ? key : curr + key;
        fresh = false;
      } else if (key === '.') {
        if (fresh) { curr = '0.'; fresh = false; }
        else if (!curr.includes('.')) curr += '.';
      } else if (key === 'ac') {
        curr = '0'; prev = null; op = null; fresh = true;
      } else if (key === 'sign') {
        if (curr !== '0' && curr !== '오류') curr = curr.startsWith('-') ? curr.slice(1) : '-' + curr;
      } else if (key === 'pct') {
        curr = String(parseFloat(curr) / 100);
        fresh = true;
      } else if ('+-*/'.includes(key)) {
        if (prev != null && !fresh) compute();
        prev = curr; op = key; fresh = true;
      } else if (key === '=') {
        compute();
      }
      show();
    });
  }

  async function renderOsTrash() {
    const list = document.getElementById('os-trash-list');
    const status = document.getElementById('os-trash-status');
    if (!list) return;
    if (!Pulse.isAdmin) {
      list.innerHTML = '<div class="os-trash-empty">휴지통은 관리자만 사용할 수 있습니다.</div>';
      return;
    }
    try {
      const data = await Pulse.api('/api/trash');
      const items = data.items || [];
      if (status) status.textContent = items.length ? `${items.length}개 항목` : '비어 있음';
      if (!items.length) {
        list.innerHTML = '<div class="os-trash-empty">휴지통이 비어 있습니다.</div>';
        return;
      }
      list.innerHTML = '';
      items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'os-trash-row';
        const when = item.deleted ? formatNotifyTime(item.deleted * 1000) : '';
        row.innerHTML = `<div class="os-trash-name">${escapeHtml(item.path || '')}<div class="os-trash-meta">${when}</div></div>`;
        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'win-btn-sm';
        restoreBtn.textContent = '복원';
        restoreBtn.addEventListener('click', async () => {
          try {
            await Pulse.post(`/api/trash/${item.id}/restore`);
            showToast('파일을 복원했습니다.');
            await renderOsTrash();
            fetchFiles();
            fetchDesktopFiles();
            fetchStorageStats();
          } catch (err) { showToast(err.message); }
        });
        const purgeBtn = document.createElement('button');
        purgeBtn.className = 'win-btn-sm';
        purgeBtn.textContent = '영구 삭제';
        purgeBtn.addEventListener('click', async () => {
          if (!await Pulse.ask(`'${item.path}'을 영구 삭제할까요?`, { confirm: '영구 삭제' })) return;
          try {
            await Pulse.api(`/api/trash/${item.id}`, { method: 'DELETE' });
            showToast('영구 삭제되었습니다.');
            await renderOsTrash();
            fetchStorageStats();
          } catch (err) { showToast(err.message); }
        });
        row.appendChild(restoreBtn);
        row.appendChild(purgeBtn);
        list.appendChild(row);
      });
    } catch (err) {
      list.innerHTML = `<div class="os-trash-empty">${escapeHtml(err.message)}</div>`;
    }
  }

  function setupTrashWindowLogic() {
    document.getElementById('btn-trash-refresh')?.addEventListener('click', renderOsTrash);
    document.getElementById('btn-trash-empty')?.addEventListener('click', async () => {
      if (!Pulse.isAdmin) return;
      if (!await Pulse.ask('휴지통을 모두 비울까요? 이 작업은 되돌릴 수 없습니다.', { confirm: '비우기' })) return;
      try {
        await Pulse.api('/api/trash', { method: 'DELETE' });
        showToast('휴지통을 비웠습니다.');
        await renderOsTrash();
        fetchStorageStats();
      } catch (err) { showToast(err.message); }
    });
  }

  // 7. Pulse Music 플레이어
  let musicPlaylist = [];
  let currentTrackIndex = -1;

  function loadMusicPlaylist() {
    const listEl = document.getElementById('music-playlist-list');
    const countEl = document.getElementById('music-playlist-count');
    if (!listEl) return;

    const audioExts = ['mp3', 'flac', 'wav', 'm4a', 'ogg', 'aac', 'opus', 'wma'];
    musicPlaylist = (state.files || []).filter(f => {
      if (f.type === 'audio') return true;
      const ext = (f.extension || '').toLowerCase();
      return audioExts.includes(ext);
    });

    if (countEl) countEl.textContent = musicPlaylist.length;

    if (musicPlaylist.length === 0) {
      listEl.innerHTML = '<div class="music-playlist-empty" style="color:rgba(255,255,255,0.4);padding:16px;text-align:center;">보관함에 음악 파일이 없습니다.<br>MP3/WAV 파일을 보관함에 업로드해 보세요!</div>';
      return;
    }

    listEl.innerHTML = '';
    musicPlaylist.forEach((track, idx) => {
      const item = document.createElement('div');
      item.className = `music-track-item ${idx === currentTrackIndex ? 'playing' : ''}`;
      item.innerHTML = `
        <span style="display:flex;align-items:center;gap:8px;min-width:0;">
          <span>${idx === currentTrackIndex ? '▶' : '🎵'}</span>
          <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(track.name)}</span>
        </span>
        <span style="color:rgba(255,255,255,0.4);font-size:11px;flex-shrink:0;">${track.sizeFormatted || ''}</span>
      `;
      item.addEventListener('click', () => playTrack(idx));
      listEl.appendChild(item);
    });
  }

  function playTrack(index) {
    if (index < 0 || index >= musicPlaylist.length) return;
    currentTrackIndex = index;
    const track = musicPlaylist[index];
    const audio = document.getElementById('pulse-bg-audio');
    const titleEl = document.getElementById('music-track-title');
    const artistEl = document.getElementById('music-track-artist');
    const playBtn = document.getElementById('btn-music-play');
    const vinyl = document.getElementById('music-vinyl');

    if (titleEl) titleEl.textContent = track.name;
    if (artistEl) artistEl.textContent = track.path ? `보관함 / ${track.path}` : 'Pulse 보관함 음악';

    if (audio) {
      audio.src = `/api/view/${encodeURIComponent(track.path)}`;
      audio.play().then(() => {
        if (playBtn) playBtn.textContent = '⏸';
        if (vinyl) vinyl.classList.add('playing');
      }).catch(() => {});
    }

    loadMusicPlaylist();
  }

  function setupMusicPlayerLogic() {
    const audio = document.getElementById('pulse-bg-audio');
    const playBtn = document.getElementById('btn-music-play');
    const prevBtn = document.getElementById('btn-music-prev');
    const nextBtn = document.getElementById('btn-music-next');
    const progBar = document.getElementById('music-progress-bar');
    const curTime = document.getElementById('music-time-cur');
    const durTime = document.getElementById('music-time-dur');
    const volSlider = document.getElementById('music-vol-slider');
    const refreshBtn = document.getElementById('btn-music-refresh');
    const vinyl = document.getElementById('music-vinyl');

    if (!audio) return;
    audio.volume = 0.8;
    if (volSlider) volSlider.value = 80;

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (!audio.src && musicPlaylist.length > 0) {
          playTrack(0);
          return;
        }
        if (audio.paused) {
          audio.play().then(() => {
            playBtn.textContent = '⏸';
            vinyl?.classList.add('playing');
          });
        } else {
          audio.pause();
          playBtn.textContent = '▶';
          vinyl?.classList.remove('playing');
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (musicPlaylist.length === 0) return;
        const prev = (currentTrackIndex - 1 + musicPlaylist.length) % musicPlaylist.length;
        playTrack(prev);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (musicPlaylist.length === 0) return;
        const next = (currentTrackIndex + 1) % musicPlaylist.length;
        playTrack(next);
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        fetchFiles().then(loadMusicPlaylist);
      });
    }

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      if (progBar) progBar.value = pct;

      const curM = Math.floor(audio.currentTime / 60);
      const curS = String(Math.floor(audio.currentTime % 60)).padStart(2, '0');
      if (curTime) curTime.textContent = `${curM}:${curS}`;

      const durM = Math.floor(audio.duration / 60);
      const durS = String(Math.floor(audio.duration % 60)).padStart(2, '0');
      if (durTime) durTime.textContent = `${durM}:${durS}`;
    });

    if (progBar) {
      progBar.addEventListener('input', (e) => {
        if (audio.duration) {
          audio.currentTime = (e.target.value / 100) * audio.duration;
        }
      });
    }

    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        audio.volume = e.target.value / 100;
        const ccVol = document.getElementById('cc-volume-slider');
        const ccVal = document.getElementById('cc-volume-val');
        if (ccVol) ccVol.value = e.target.value;
        if (ccVal) ccVal.textContent = `${e.target.value}%`;
      });
    }

    audio.addEventListener('ended', () => {
      if (musicPlaylist.length > 0) {
        const next = (currentTrackIndex + 1) % musicPlaylist.length;
        playTrack(next);
      }
    });
  }

  // 8. Dock Magnification (호버 확대)
  function setupDockMagnificationAndMotion() {
    const dock = document.getElementById('desktop-dock');
    if (!dock) return;

    dock.addEventListener('mousemove', (e) => {
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      const items = dock.querySelectorAll('.dock-item');
      const mouseX = e.clientX;
      const radius = 120;

      items.forEach(item => {
        const rect = item.getBoundingClientRect();
        const itemCenterX = rect.left + rect.width / 2;
        const dist = Math.abs(mouseX - itemCenterX);

        if (dist < radius) {
          const factor = Math.cos((dist / radius) * (Math.PI / 2));
          const scale = 1 + 0.32 * factor;
          const translateY = -10 * factor;
          item.style.transform = `scale(${scale}) translateY(${translateY}px)`;
        } else {
          item.style.transform = 'scale(1) translateY(0)';
        }
      });
    });

    dock.addEventListener('mouseleave', () => {
      const items = dock.querySelectorAll('.dock-item');
      items.forEach(item => {
        item.style.transform = 'scale(1) translateY(0)';
      });
    });
  }

  // ================= Utilities =================
  async function copyToClipboard(text) {
    if (text == null || text === '') return false;
    let ok = false;
    try {
      await navigator.clipboard.writeText(String(text));
      ok = true;
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = String(text);
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand('copy');
      document.body.removeChild(ta);
    }
    if (ok && typeof addClipboardHistory === 'function') {
      addClipboardHistory(String(text));
    }
    return ok;
  }

  function showToast(message, retry, actionLabel = '다시 시도') {
    // Focus Mode(집중 모드) 활성화 시 방해를 방지하기 위해 팝업 차단하고 알림 센터에만 기록
    if (state.focusMode && !retry) {
      if (typeof addNotificationCenterItem === 'function') {
        addNotificationCenterItem('집중 모드 알림', message);
      }
      return;
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = retry
      ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    toast.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`;
    toast.setAttribute('role', 'status');
    if (retry) {
      const button = document.createElement('button');
      button.className = 'btn btn-outline';
      button.textContent = actionLabel;
      button.addEventListener('click', () => { toast.remove(); retry(); });
      toast.appendChild(button);
    }
    el.toastContainer.appendChild(toast);
    const lifetime = retry ? 10000 : 4000;
    setTimeout(() => {
      if (!toast.parentNode) return;
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 320);
    }, lifetime - 320);
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

  // ==========================================================================
  // 📸 Pulse Photos — 날짜별 사진 갤러리 앱
  // ==========================================================================
  let photosData = { groups: [], total: 0 };
  let photosCurrentView = 'all';
  let photosLightboxList = [];
  let photosLightboxIdx = 0;

  async function loadPhotos() {
    const loading = document.getElementById('photos-loading');
    const empty = document.getElementById('photos-empty');
    const container = document.getElementById('photos-grid-container');
    const badge = document.getElementById('photos-count-badge');
    if (!container) return;
    if (loading) loading.classList.remove('hidden');
    if (empty) empty.classList.add('hidden');
    container.innerHTML = '';
    try {
      const data = await Pulse.api('/api/photos');
      photosData = data;
      if (badge) badge.textContent = `사진 ${data.total}장`;
      renderPhotos(photosCurrentView);
    } catch (e) {
      showToast('사진 목록 로드 실패', () => loadPhotos());
    } finally {
      if (loading) loading.classList.add('hidden');
    }
  }

  function renderPhotos(view) {
    photosCurrentView = view;
    const container = document.getElementById('photos-grid-container');
    const empty = document.getElementById('photos-empty');
    if (!container) return;
    container.innerHTML = '';

    let groups = photosData.groups || [];
    if (view === 'recent') {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      groups = groups.map(g => ({
        ...g,
        photos: g.photos.filter(p => p.modified >= cutoff)
      })).filter(g => g.photos.length > 0);
    }

    const allPhotos = groups.flatMap(g => g.photos);
    photosLightboxList = allPhotos;

    if (allPhotos.length === 0) {
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');

    groups.forEach(group => {
      const header = document.createElement('div');
      header.className = 'photos-group-header';
      header.textContent = group.label + ` (${group.photos.length}장)`;
      container.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'photos-thumb-grid';
      group.photos.forEach((photo, localIdx) => {
        const globalIdx = allPhotos.indexOf(photo);
        const thumb = document.createElement('div');
        thumb.className = 'photos-thumb';
        thumb.title = photo.name;
        thumb.innerHTML = `<img src="${escapeHtml(photo.thumbnailUrl)}" alt="${escapeHtml(photo.name)}" loading="lazy">`;
        thumb.addEventListener('click', () => openPhotosLightbox(globalIdx));
        grid.appendChild(thumb);
      });
      container.appendChild(grid);
    });
  }

  function openPhotosLightbox(idx) {
    const lb = document.getElementById('photos-lightbox');
    if (!lb || photosLightboxList.length === 0) return;
    photosLightboxIdx = Math.max(0, Math.min(idx, photosLightboxList.length - 1));
    lb.classList.remove('hidden');
    renderPhotosLightbox();
  }

  function renderPhotosLightbox() {
    const photo = photosLightboxList[photosLightboxIdx];
    if (!photo) return;
    const img = document.getElementById('photos-lb-img');
    const name = document.getElementById('photos-lb-name');
    const info = document.getElementById('photos-lb-info');
    const dl = document.getElementById('photos-lb-download');
    const counter = document.getElementById('photos-lb-counter');
    if (img) { img.src = photo.previewUrl; img.alt = photo.name; }
    if (name) name.textContent = photo.name;
    if (info) info.textContent = photo.dateFormatted + ' · ' + photo.sizeFormatted;
    if (dl) { dl.href = photo.downloadUrl; dl.download = photo.name; }
    if (counter) counter.textContent = `${photosLightboxIdx + 1} / ${photosLightboxList.length}`;
  }

  function closePhotosLightbox() {
    const lb = document.getElementById('photos-lightbox');
    if (lb) lb.classList.add('hidden');
  }

  function initPhotos() {
    // Photos 사이드바 필터
    document.querySelectorAll('[data-photos-view]').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.photosView;
        if (view === 'slideshow') { startPhotosSlideshow(); return; }
        document.querySelectorAll('[data-photos-view]').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        renderPhotos(view);
      });
    });

    // 새로고침
    const refreshBtn = document.getElementById('btn-photos-refresh');
    if (refreshBtn) refreshBtn.addEventListener('click', loadPhotos);

    // 라이트박스 내비게이션
    const lbClose = document.getElementById('photos-lb-close');
    const lbPrev = document.getElementById('photos-lb-prev');
    const lbNext = document.getElementById('photos-lb-next');
    const lbBackdrop = document.getElementById('photos-lb-backdrop');
    if (lbClose) lbClose.addEventListener('click', closePhotosLightbox);
    if (lbBackdrop) lbBackdrop.addEventListener('click', closePhotosLightbox);
    if (lbPrev) lbPrev.addEventListener('click', () => {
      photosLightboxIdx = (photosLightboxIdx - 1 + photosLightboxList.length) % photosLightboxList.length;
      renderPhotosLightbox();
    });
    if (lbNext) lbNext.addEventListener('click', () => {
      photosLightboxIdx = (photosLightboxIdx + 1) % photosLightboxList.length;
      renderPhotosLightbox();
    });

    // 키보드 내비게이션 (라이트박스 열려 있을 때)
    document.addEventListener('keydown', (e) => {
      const lb = document.getElementById('photos-lightbox');
      if (!lb || lb.classList.contains('hidden')) return;
      if (e.key === 'Escape') { closePhotosLightbox(); return; }
      if (e.key === 'ArrowLeft') {
        photosLightboxIdx = (photosLightboxIdx - 1 + photosLightboxList.length) % photosLightboxList.length;
        renderPhotosLightbox();
      } else if (e.key === 'ArrowRight') {
        photosLightboxIdx = (photosLightboxIdx + 1) % photosLightboxList.length;
        renderPhotosLightbox();
      }
    });
  }

  let slideshowTimer = null;
  function startPhotosSlideshow() {
    if (photosLightboxList.length === 0) { showToast('슬라이드쇼를 시작할 사진이 없습니다.'); return; }
    openPhotosLightbox(0);
    slideshowTimer = setInterval(() => {
      photosLightboxIdx = (photosLightboxIdx + 1) % photosLightboxList.length;
      renderPhotosLightbox();
    }, 3000);
    const lbClose = document.getElementById('photos-lb-close');
    if (lbClose) {
      const origClose = lbClose.onclick;
      lbClose.onclick = () => { clearInterval(slideshowTimer); closePhotosLightbox(); lbClose.onclick = origClose; };
    }
  }

  // ==========================================================================
  // 📦 ZIP 압축 다운로드 / 압축 해제
  // ==========================================================================
  function setupZipTools() {
    const btnZip = document.getElementById('btn-zip-download');
    if (btnZip) {
      btnZip.addEventListener('click', () => {
        const paths = Array.from(state.selected);
        if (paths.length === 0) { showToast('다운로드할 파일을 선택하세요.'); return; }
        downloadZip(paths);
      });
    }
  }

  async function downloadZip(paths) {
    if (!paths || paths.length === 0) return;
    showToast(`ZIP 파일 생성 중... (${paths.length}개)`);
    try {
      const res = await fetch('/api/zip-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': Pulse.csrf },
        body: JSON.stringify({ paths })
      });
      if (!res.ok) throw new Error('ZIP 생성 실패');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const cd = res.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename\*?=(?:UTF-8'')?([^;\n]+)/i);
      a.download = match ? decodeURIComponent(match[1].replace(/"/g, '')) : 'Pulse-선택파일.zip';
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('ZIP 다운로드 완료 ✓');
    } catch (e) {
      showToast('ZIP 다운로드 실패: ' + e.message, () => downloadZip(paths));
    }
  }

  async function unzipFile(path) {
    try {
      showToast('ZIP 압축 해제 중...');
      const res = await Pulse.api('/api/unzip', {
        method: 'POST',
        body: JSON.stringify({ path })
      });
      showToast(`압축 해제 완료 ✓ (${res.extracted}개 파일)`);
      fetchFiles();
      renderFinderFiles();
    } catch (e) {
      showToast('압축 해제 실패: ' + e.message);
    }
  }

  // ZIP 버튼 선택 상태에 따라 보이기/숨기기
  function updateZipButton() {
    const btn = document.getElementById('btn-zip-download');
    if (!btn || !Pulse.isAdmin) return;
    btn.classList.toggle('hidden', state.selected.size === 0);
  }

  // ==========================================================================
  // 🗓️ Calendar 위젯
  // ==========================================================================
  let calYear = new Date().getFullYear();
  let calMonth = new Date().getMonth();
  let calSelectedDate = null;
  let calEvents = {};

  function initCalendar() {
    // localStorage에서 일정 로드
    try { calEvents = JSON.parse(localStorage.getItem('pulse_cal_events') || '{}'); } catch { calEvents = {}; }

    // 메뉴바 시계 클릭 → 팝오버 토글
    const clock = document.getElementById('desktop-clock');
    if (clock) {
      clock.style.cursor = 'pointer';
      clock.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCalendarPopover();
      });
    }

    // 이전/다음 달 버튼
    const prevBtn = document.getElementById('cal-prev-btn');
    const nextBtn = document.getElementById('cal-next-btn');
    if (prevBtn) prevBtn.addEventListener('click', () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); });

    // 일정 추가 버튼
    const addBtn = document.getElementById('cal-add-event-btn');
    const form = document.getElementById('cal-event-form');
    const cancelBtn = document.getElementById('cal-event-cancel-btn');
    if (addBtn) addBtn.addEventListener('click', () => { if (form) form.classList.toggle('hidden'); setTimeout(() => document.getElementById('cal-event-input')?.focus(), 50); });
    if (cancelBtn) cancelBtn.addEventListener('click', () => { if (form) form.classList.add('hidden'); });
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('cal-event-input');
        const text = input?.value?.trim();
        if (!text || !calSelectedDate) return;
        if (!calEvents[calSelectedDate]) calEvents[calSelectedDate] = [];
        calEvents[calSelectedDate].push(text);
        saveCalEvents();
        input.value = '';
        form.classList.add('hidden');
        renderCalendar();
        renderCalEvents();
      });
    }

    // 팝오버 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
      const pop = document.getElementById('calendar-popover');
      const clock2 = document.getElementById('desktop-clock');
      if (pop && !pop.contains(e.target) && !clock2?.contains(e.target)) {
        pop.classList.add('hidden');
      }
    });

    renderCalendar();
  }

  function toggleCalendarPopover() {
    const pop = document.getElementById('calendar-popover');
    if (!pop) return;
    // Control Center 등 다른 팝오버 닫기
    document.getElementById('desktop-control-center-popover')?.classList.add('hidden');
    document.getElementById('desktop-notify-popover')?.classList.add('hidden');
    pop.classList.toggle('hidden');
    if (!pop.classList.contains('hidden')) renderCalendar();
  }

  function renderCalendar() {
    const grid = document.getElementById('cal-grid');
    const label = document.getElementById('cal-month-label');
    if (!grid) return;
    const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
    if (label) label.textContent = `${calYear}년 ${monthNames[calMonth]}`;
    grid.innerHTML = '';
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    for (let i = 0; i < firstDay; i++) {
      const blank = document.createElement('div');
      blank.className = 'cal-day cal-day-blank';
      grid.appendChild(blank);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      if (dateStr === todayStr) cell.classList.add('cal-day-today');
      if (dateStr === calSelectedDate) cell.classList.add('cal-day-selected');
      if (calEvents[dateStr] && calEvents[dateStr].length > 0) cell.classList.add('cal-day-has-event');
      cell.textContent = d;
      cell.addEventListener('click', () => {
        calSelectedDate = dateStr;
        renderCalendar();
        renderCalEvents();
        document.getElementById('cal-selected-date-label').textContent = `${calYear}년 ${calMonth+1}월 ${d}일`;
      });
      grid.appendChild(cell);
    }
  }

  function renderCalEvents() {
    const list = document.getElementById('cal-events-list');
    if (!list) return;
    list.innerHTML = '';
    if (!calSelectedDate || !calEvents[calSelectedDate] || calEvents[calSelectedDate].length === 0) {
      list.innerHTML = '<div class="cal-no-events">일정 없음</div>';
      return;
    }
    calEvents[calSelectedDate].forEach((ev, idx) => {
      const item = document.createElement('div');
      item.className = 'cal-event-item';
      item.innerHTML = `<span class="cal-event-dot">●</span><span class="cal-event-text">${escapeHtml(ev)}</span><button class="cal-event-del" data-idx="${idx}" title="삭제">✕</button>`;
      item.querySelector('.cal-event-del').addEventListener('click', () => {
        calEvents[calSelectedDate].splice(idx, 1);
        if (calEvents[calSelectedDate].length === 0) delete calEvents[calSelectedDate];
        saveCalEvents();
        renderCalendar();
        renderCalEvents();
      });
      list.appendChild(item);
    });
  }

  function saveCalEvents() {
    try { localStorage.setItem('pulse_cal_events', JSON.stringify(calEvents)); } catch {}
  }

  // ==========================================================================
  // ⌨️ 단축키 치트시트 (Ctrl+/)
  // ==========================================================================
  const SHORTCUT_DATA = [
    {
      category: '🌐 전역',
      items: [
        { keys: ['Ctrl', '/'], desc: '단축키 목록 보기' },
        { keys: ['Ctrl', 'Space'], desc: 'Spotlight 검색 열기' },
        { keys: ['F3'], desc: '미션 컨트롤' },
        { keys: ['Ctrl', '↑'], desc: '미션 컨트롤' },
        { keys: ['F11'], desc: '전체화면 토글' },
      ]
    },
    {
      category: '☁️ Pulse Cloud',
      items: [
        { keys: ['Click'], desc: '파일 선택' },
        { keys: ['Shift', 'Click'], desc: '범위 다중 선택' },
      ]
    },
    {
      category: '🖥️ Pulse OS 창 관리',
      items: [
        { keys: ['드래그'], desc: '창 이동' },
        { keys: ['우하단 드래그'], desc: '창 크기 조절' },
        { keys: ['우클릭'], desc: '컨텍스트 메뉴' },
        { keys: ['메뉴바로 드래그'], desc: '창 최대화' },
        { keys: ['좌·우 끝 드래그'], desc: '50% 분할 스냅' },
      ]
    },
    {
      category: '📁 Finder / Cloud',
      items: [
        { keys: ['더블클릭'], desc: '파일 열기 / 폴더 진입' },
        { keys: ['Space'], desc: 'Quick Look 미리보기' },
        { keys: ['← →'], desc: 'Quick Look 이전/다음' },
        { keys: ['Esc'], desc: 'Quick Look 닫기' },
        { keys: ['Enter'], desc: '선택 항목 열기' },
      ]
    },
    {
      category: '📝 에디터',
      items: [
        { keys: ['Ctrl', 'S'], desc: '파일 저장' },
      ]
    },
    {
      category: '📸 Pulse Photos',
      items: [
        { keys: ['← →'], desc: '라이트박스 이전/다음' },
        { keys: ['Esc'], desc: '라이트박스 닫기' },
      ]
    },
    {
      category: '🔍 Spotlight',
      items: [
        { keys: ['↑ ↓'], desc: '결과 탐색' },
        { keys: ['Enter'], desc: '선택 실행' },
        { keys: ['Esc'], desc: '닫기' },
      ]
    },
  ];

  function openShortcutsModal() {
    const modal = document.getElementById('shortcuts-modal');
    if (!modal) return;
    renderShortcutsModal();
    modal.classList.remove('hidden');
    modal.focus();
  }

  function closeShortcutsModal() {
    const modal = document.getElementById('shortcuts-modal');
    if (modal) modal.classList.add('hidden');
  }

  function renderShortcutsModal() {
    const body = document.getElementById('shortcuts-body');
    if (!body) return;
    body.innerHTML = SHORTCUT_DATA.map(section => `
      <div class="shortcut-category">
        <div class="shortcut-category-title">${escapeHtml(section.category)}</div>
        <div class="shortcut-rows">
          ${section.items.map(item => `
            <div class="shortcut-row">
              <div class="shortcut-keys">${item.keys.map(k => `<kbd>${escapeHtml(k)}</kbd>`).join('')}</div>
              <span class="shortcut-desc">${escapeHtml(item.desc)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  function initShortcutsModal() {
    const closeBtn = document.getElementById('shortcuts-close-btn');
    const backdrop = document.getElementById('shortcuts-backdrop');
    if (closeBtn) closeBtn.addEventListener('click', closeShortcutsModal);
    if (backdrop) backdrop.addEventListener('click', closeShortcutsModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const modal = document.getElementById('shortcuts-modal');
        if (modal && !modal.classList.contains('hidden')) closeShortcutsModal();
        else openShortcutsModal();
      }
      if (e.key === 'Escape') closeShortcutsModal();
    });
  }

  // ==========================================================================
  // 🔔 알림 센터 헬퍼 (v2.3.0)
  // ==========================================================================
  function addNotificationCenterItem(title, body) {
    try {
      const items = JSON.parse(localStorage.getItem('pulse_notifications') || '[]');
      items.unshift({ id: Date.now() + Math.random(), title, body, time: Date.now(), unread: true });
      localStorage.setItem('pulse_notifications', JSON.stringify(items.slice(0, 50)));
      if (typeof renderNotificationCenter === 'function') renderNotificationCenter();
    } catch (_) {}
  }

  // ==========================================================================
  // 🔖 즐겨찾기 & 태그 관리 (v2.3.0)
  // ==========================================================================
  async function toggleFavorite(path) {
    if (!path) return;
    try {
      const res = await Pulse.post('/api/files/favorite', { path });
      const target = state.files.find(f => f.path === path);
      if (target) target.favorite = res.favorite;
      render();
      renderFinderFiles();
      fetchFiles();
      showToast(res.favorite ? '즐겨찾기에 추가되었습니다 ★' : '즐겨찾기에서 제거되었습니다.');
    } catch (e) {
      showToast('즐겨찾기 변경 실패: ' + e.message);
    }
  }

  async function toggleFileTag(path, tag) {
    if (!path || !tag) return;
    try {
      const res = await Pulse.post('/api/files/tags', { path, tag, action: 'toggle' });
      const target = state.files.find(f => f.path === path);
      if (target) target.tags = res.tags;
      render();
      renderFinderFiles();
      showToast('태그가 변경되었습니다.');
    } catch (e) {
      showToast('태그 변경 실패: ' + e.message);
    }
  }

  function initTagFilterListeners() {
    document.querySelectorAll('.sidebar-tag-chips .tag-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const filter = chip.dataset.filter;
        const wasActive = chip.classList.contains('active');
        document.querySelectorAll('.sidebar-tag-chips .tag-chip').forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-pressed', 'false');
        });
        el.navItems.forEach(item => {
          item.classList.remove('active');
          item.setAttribute('aria-pressed', 'false');
        });

        if (wasActive) {
          state.currentFilter = 'all';
          const allBtn = document.querySelector('.nav-item[data-filter="all"]');
          if (allBtn) {
            allBtn.classList.add('active');
            allBtn.setAttribute('aria-pressed', 'true');
          }
        } else {
          chip.classList.add('active');
          chip.setAttribute('aria-pressed', 'true');
          state.currentFilter = filter;
        }
        state.page = 1;
        updateTitle();
        fetchFiles();
        if (window.innerWidth <= 860) setSidebarOpen(false);
      });
    });
  }

  // ==========================================================================
  // 📋 Clipboard 히스토리 모듈 (v2.3.0)
  // ==========================================================================
  const CLIPBOARD_STORAGE_KEY = 'pulse_clipboard_items';

  function loadClipboardHistory() {
    try {
      return JSON.parse(localStorage.getItem(CLIPBOARD_STORAGE_KEY) || '[]');
    } catch (_) {
      return [];
    }
  }

  function saveClipboardHistory(items) {
    try {
      localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(items.slice(0, 100)));
    } catch (_) {}
  }

  function addClipboardHistory(text) {
    if (!text || typeof text !== 'string') return;
    const cleanText = text.trim();
    if (!cleanText || cleanText.length < 2) return;

    const items = loadClipboardHistory();
    const existingIdx = items.findIndex(item => item.text === cleanText);
    let isPinned = false;

    if (existingIdx !== -1) {
      isPinned = items[existingIdx].pinned || false;
      items.splice(existingIdx, 1);
    }

    items.unshift({
      id: 'clip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      text: cleanText,
      time: Date.now(),
      pinned: isPinned
    });

    saveClipboardHistory(items);
    if (state.openWindows.clipboard) {
      renderClipboardHistory();
    }
  }

  function togglePinClipboard(id) {
    const items = loadClipboardHistory();
    const item = items.find(i => i.id === id);
    if (item) {
      item.pinned = !item.pinned;
      saveClipboardHistory(items);
      renderClipboardHistory();
      showToast(item.pinned ? '클립이 고정되었습니다 📌' : '클립 고정이 해제되었습니다.');
    }
  }

  function deleteClipboardItem(id) {
    let items = loadClipboardHistory();
    items = items.filter(i => i.id !== id);
    saveClipboardHistory(items);
    renderClipboardHistory();
  }

  function clearClipboardHistory() {
    let items = loadClipboardHistory();
    // 핀 고정된 항목은 유지, 일반 항목만 삭제
    const pinned = items.filter(i => i.pinned);
    saveClipboardHistory(pinned);
    renderClipboardHistory();
    showToast('일반 클립보드 기록을 비웠습니다.');
  }

  function renderClipboardHistory(filterQuery = '') {
    const pinnedListEl = document.getElementById('clipboard-pinned-list');
    const recentListEl = document.getElementById('clipboard-recent-list');
    const pinnedSec = document.getElementById('clipboard-pinned-section');
    const recentSec = document.getElementById('clipboard-recent-section');
    const emptyEl = document.getElementById('clipboard-empty');
    if (!pinnedListEl || !recentListEl) return;

    let items = loadClipboardHistory();
    const q = (filterQuery || '').toLowerCase().trim();
    if (q) {
      items = items.filter(i => i.text.toLowerCase().includes(q));
    }

    const pinned = items.filter(i => i.pinned);
    const recent = items.filter(i => !i.pinned);

    if (emptyEl) {
      emptyEl.classList.toggle('hidden', items.length > 0);
    }
    if (pinnedSec) {
      pinnedSec.classList.toggle('hidden', pinned.length === 0);
    }
    if (recentSec) {
      recentSec.classList.toggle('hidden', recent.length === 0);
    }

    const makeItemHtml = (item) => `
      <div class="clipboard-item ${item.pinned ? 'is-pinned' : ''}" data-clip-id="${item.id}">
        <span class="clipboard-item-text" title="${escapeHtml(item.text)}">${escapeHtml(item.text)}</span>
        <div class="clipboard-item-actions">
          <button class="clip-btn clip-btn-pin ${item.pinned ? 'pinned' : ''}" data-action="pin" title="${item.pinned ? '고정 해제' : '핀 고정'}">📌</button>
          <button class="clip-btn clip-btn-copy" data-action="copy" title="다시 복사">복사</button>
          <button class="clip-btn clip-btn-del" data-action="delete" title="삭제">✕</button>
        </div>
      </div>
    `;

    pinnedListEl.innerHTML = pinned.map(makeItemHtml).join('');
    recentListEl.innerHTML = recent.map(makeItemHtml).join('');

    const bindItemEvents = (container) => {
      container.querySelectorAll('.clipboard-item').forEach(el => {
        const id = el.dataset.clipId;
        const item = items.find(i => i.id === id);
        if (!item) return;

        el.addEventListener('click', async (e) => {
          const actionBtn = e.target.closest('[data-action]');
          if (!actionBtn) {
            await copyToClipboard(item.text);
            showToast('클립보드에 복사되었습니다! 📋');
            return;
          }
          const act = actionBtn.dataset.action;
          if (act === 'pin') {
            togglePinClipboard(id);
          } else if (act === 'copy') {
            await copyToClipboard(item.text);
            showToast('클립보드에 복사되었습니다! 📋');
          } else if (act === 'delete') {
            deleteClipboardItem(id);
          }
        });
      });
    };

    bindItemEvents(pinnedListEl);
    bindItemEvents(recentListEl);
  }

  function initClipboardApp() {
    const searchInp = document.getElementById('clipboard-search-input');
    const quickAdd = document.getElementById('clipboard-quick-add');
    const addBtn = document.getElementById('btn-clipboard-add');
    const clearBtn = document.getElementById('btn-clipboard-clear');

    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        renderClipboardHistory(e.target.value);
      });
    }

    const handleAdd = () => {
      if (!quickAdd) return;
      const text = quickAdd.value.trim();
      if (text) {
        addClipboardHistory(text);
        quickAdd.value = '';
        showToast('클립보드에 추가되었습니다.');
      }
    };

    if (quickAdd) {
      quickAdd.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAdd();
      });
    }
    if (addBtn) addBtn.addEventListener('click', handleAdd);
    if (clearBtn) clearBtn.addEventListener('click', clearClipboardHistory);
  }

  // ==========================================================================
  // 🔗 파일 안전 공유 링크 모달 (v2.3.0)
  // ==========================================================================
  let currentShareTarget = null;

  function openShareModal(file) {
    currentShareTarget = file;
    const modal = document.getElementById('share-modal');
    const nameEl = document.getElementById('share-target-name');
    const metaEl = document.getElementById('share-target-meta');
    const resBox = document.getElementById('share-result-box');
    if (!modal) return;

    if (nameEl) nameEl.textContent = file.name;
    if (metaEl) metaEl.textContent = `${file.sizeFormatted || ''} · ${file.dateFormatted || ''}`;
    if (resBox) resBox.classList.add('hidden');

    modal.classList.remove('hidden');
  }

  function closeShareModal() {
    const modal = document.getElementById('share-modal');
    if (modal) modal.classList.add('hidden');
    currentShareTarget = null;
  }

  function initShareModal() {
    const closeBtn = document.getElementById('btn-share-close');
    const backdrop = document.getElementById('share-modal-backdrop');
    const createBtn = document.getElementById('btn-create-share');
    const copyBtn = document.getElementById('btn-copy-share-url');
    const urlInput = document.getElementById('share-url-input');

    if (closeBtn) closeBtn.addEventListener('click', closeShareModal);
    if (backdrop) backdrop.addEventListener('click', closeShareModal);

    if (createBtn) {
      createBtn.addEventListener('click', async () => {
        if (!currentShareTarget) return;
        const expSelect = document.getElementById('share-expire-select');
        const maxSelect = document.getElementById('share-maxdl-select');
        const expireHours = expSelect ? parseInt(expSelect.value, 10) : 24;
        const maxDownloads = maxSelect ? parseInt(maxSelect.value, 10) : 0;

        try {
          createBtn.disabled = true;
          createBtn.textContent = '링크 생성 중...';
          const res = await Pulse.post('/api/shares', {
            path: currentShareTarget.path,
            expireHours,
            maxDownloads
          });

          const fullUrl = window.location.origin + res.url;
          const resBox = document.getElementById('share-result-box');
          const metaText = document.getElementById('share-result-meta');

          if (urlInput) urlInput.value = fullUrl;
          if (metaText) {
            metaText.textContent = `유효 기한: ${res.expires} (최대 다운로드: ${res.maxDownloads ? res.maxDownloads + '회' : '무제한'})`;
          }
          if (resBox) resBox.classList.remove('hidden');

          await copyToClipboard(fullUrl);
          showToast('공유 링크가 생성되어 클립보드에 복사되었습니다! 🔗');
        } catch (e) {
          showToast('공유 링크 생성 실패: ' + e.message);
        } finally {
          createBtn.disabled = false;
          createBtn.textContent = '공유 링크 발급하기';
        }
      });
    }

    if (copyBtn && urlInput) {
      copyBtn.addEventListener('click', async () => {
        if (urlInput.value) {
          await copyToClipboard(urlInput.value);
          showToast('공유 URL이 클립보드에 복사되었습니다! 📋');
        }
      });
    }
  }

  // ==========================================================================
  // 🌙 Focus Mode (집중 모드 & 뽀모도로 타이머) (v2.3.0)
  // ==========================================================================
  state.focusMode = false;
  state.focusRemainingSeconds = 0;
  let focusIntervalTimer = null;

  function playFocusChime() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (_) {}
  }

  function updateFocusTimerDisplay() {
    const timerEl = document.getElementById('menubar-focus-timer');
    const ccDesc = document.getElementById('cc-focus-tile-desc');
    if (!timerEl) return;

    if (!state.focusMode) {
      timerEl.classList.add('hidden');
      if (ccDesc) ccDesc.textContent = '꺼짐';
      return;
    }

    timerEl.classList.remove('hidden');
    const m = Math.floor(state.focusRemainingSeconds / 60);
    const s = state.focusRemainingSeconds % 60;
    const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    timerEl.textContent = timeStr;
    if (ccDesc) ccDesc.textContent = `${timeStr} 남음`;
  }

  function toggleFocusMode(forceState = null, durationMinutes = 25) {
    const nextState = forceState !== null ? forceState : !state.focusMode;
    state.focusMode = nextState;

    const body = document.body;
    const btn = document.getElementById('btn-desktop-focus');
    const ccTile = document.getElementById('btn-cc-focus-toggle');

    if (state.focusMode) {
      body.classList.add('focus-mode-active');
      if (btn) btn.classList.add('active');
      if (ccTile) ccTile.classList.add('active');
      state.focusRemainingSeconds = durationMinutes * 60;
      updateFocusTimerDisplay();

      if (focusIntervalTimer) clearInterval(focusIntervalTimer);
      focusIntervalTimer = setInterval(() => {
        state.focusRemainingSeconds--;
        if (state.focusRemainingSeconds <= 0) {
          clearInterval(focusIntervalTimer);
          focusIntervalTimer = null;
          toggleFocusMode(false);
          playFocusChime();
          showToast('🎉 뽀모도로 집중 시간이 완료되었습니다! 잠시 휴식을 취하세요.');
          addNotificationCenterItem('집중 모드 완료', '25분 집중 세션이 종료되었습니다. 가벼운 스트레칭을 추천합니다!');
        } else {
          updateFocusTimerDisplay();
        }
      }, 1000);

      showToast(`🌙 집중 모드가 켜졌습니다 (${durationMinutes}분). 알림 팝업이 차단됩니다.`);
    } else {
      body.classList.remove('focus-mode-active');
      if (btn) btn.classList.remove('active');
      if (ccTile) ccTile.classList.remove('active');
      if (focusIntervalTimer) {
        clearInterval(focusIntervalTimer);
        focusIntervalTimer = null;
      }
      state.focusRemainingSeconds = 0;
      updateFocusTimerDisplay();
      showToast('☀️ 집중 모드가 꺼졌습니다.');
    }
  }

  function initFocusMode() {
    const btn = document.getElementById('btn-desktop-focus');
    const ccTile = document.getElementById('btn-cc-focus-toggle');

    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFocusMode();
      });
    }

    if (ccTile) {
      ccTile.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFocusMode();
      });
    }
  }

  // ==========================================================================
  // 📷 Pulse Cam (스마트폰 원격 홈캠 / CCTV & 스냅샷) (v2.4.0)
  // ==========================================================================

  let camActive = false;
  let camPollTimer = null;
  let camOsdTimer = null;
  let camBroadcastActive = false;
  let camBroadcastStream = null;
  let camBroadcastInterval = null;
  let camLocalStream = null;
  let camLens = '0'; // '0': 후면(environment), '1': 전면(user)
  let camSource = 'phone'; // 'phone' | 'local'
  let camIsFetchingFrame = false;

  function playCameraShutterSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // First mechanical click
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(800, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.07);
      gain1.gain.setValueAtTime(0.35, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.07);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.08);

      // Second shutter click
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.15);
      gain2.gain.setValueAtTime(0.28, ctx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.16);
    } catch (_) {}
  }

  function startCameraOsd() {
    if (camOsdTimer) clearInterval(camOsdTimer);
    const updateTime = () => {
      const elTime = document.getElementById('cam-osd-time');
      if (!elTime) return;
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      elTime.textContent = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    };
    updateTime();
    camOsdTimer = setInterval(updateTime, 1000);
  }

  function stopCameraOsd() {
    if (camOsdTimer) {
      clearInterval(camOsdTimer);
      camOsdTimer = null;
    }
  }

  async function checkCameraStatus() {
    try {
      const res = await fetch('/api/camera/status');
      if (!res.ok) return null;
      return await res.json();
    } catch (_) {
      return null;
    }
  }

  async function fetchRemoteCamFrame() {
    if (!camActive || camSource !== 'phone' || camIsFetchingFrame) return;
    camIsFetchingFrame = true;
    try {
      const img = document.getElementById('cam-remote-img');
      const placeholder = document.getElementById('cam-placeholder');
      const liveBadge = document.getElementById('cam-live-badge');
      const osdBadge = document.getElementById('cam-osd-badge');

      const status = await checkCameraStatus();
      if (!camActive || camSource !== 'phone') {
        camIsFetchingFrame = false;
        return;
      }

      if (status && (status.live_feed || status.termux_camera)) {
        if (placeholder) placeholder.classList.add('hidden');
        if (img) img.classList.remove('hidden');
        if (liveBadge) liveBadge.classList.remove('hidden');

        if (osdBadge) {
          osdBadge.textContent = status.live_feed ? 'CCTV · LIVE' : 'CCTV · TERMUX-API';
        }

        if (img) {
          const newImg = new Image();
          newImg.onload = () => {
            img.src = newImg.src;
            camIsFetchingFrame = false;
          };
          newImg.onerror = () => {
            camIsFetchingFrame = false;
          };
          newImg.src = `/api/camera/frame?t=${Date.now()}`;
          return;
        }
      } else {
        if (placeholder) {
          placeholder.classList.remove('hidden');
          const pTitle = document.getElementById('cam-placeholder-title');
          const pSub = document.getElementById('cam-placeholder-sub');
          if (pTitle) pTitle.textContent = '홈캠 신호 대기 중';
          if (pSub) pSub.innerHTML = '스마트폰 브라우저에서 아래 "내 기기 카메라 송출하기"를 켜거나<br>Termux:API로 원격 카메라를 연동하세요.';
        }
        if (img) {
          img.classList.add('hidden');
          img.src = '';
        }
        if (liveBadge) liveBadge.classList.add('hidden');
        if (osdBadge) osdBadge.textContent = 'CCTV · OFFLINE';
      }
    } catch (_) {}
    camIsFetchingFrame = false;
  }

  async function startLocalCamStream() {
    stopLocalCamStream();
    const video = document.getElementById('cam-local-video');
    const remoteImg = document.getElementById('cam-remote-img');
    const placeholder = document.getElementById('cam-placeholder');
    const liveBadge = document.getElementById('cam-live-badge');
    const osdBadge = document.getElementById('cam-osd-badge');

    if (remoteImg) { remoteImg.classList.add('hidden'); remoteImg.src = ''; }

    try {
      const facing = camLens === '1' ? 'user' : 'environment';
      camLocalStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      if (video) {
        video.srcObject = camLocalStream;
        video.classList.remove('hidden');
      }
      if (placeholder) placeholder.classList.add('hidden');
      if (liveBadge) liveBadge.classList.remove('hidden');
      if (osdBadge) osdBadge.textContent = 'LOCAL · WEBCAM';
    } catch (err) {
      if (video) video.classList.add('hidden');
      if (placeholder) {
        placeholder.classList.remove('hidden');
        const pTitle = document.getElementById('cam-placeholder-title');
        const pSub = document.getElementById('cam-placeholder-sub');
        if (pTitle) pTitle.textContent = '웹캠 접근 실패';
        if (pSub) pSub.textContent = '카메라 권한이 거부되었거나 연결된 웹캠이 없습니다: ' + (err.message || err);
      }
      if (liveBadge) liveBadge.classList.add('hidden');
      if (osdBadge) osdBadge.textContent = 'LOCAL · ERROR';
    }
  }

  function stopLocalCamStream() {
    if (camLocalStream) {
      camLocalStream.getTracks().forEach(t => t.stop());
      camLocalStream = null;
    }
    const video = document.getElementById('cam-local-video');
    if (video) {
      video.srcObject = null;
      video.classList.add('hidden');
    }
  }

  function startPulseCam() {
    camActive = true;
    startCameraOsd();

    const video = document.getElementById('cam-local-video');
    const remoteImg = document.getElementById('cam-remote-img');

    if (camSource === 'local') {
      startLocalCamStream();
    } else {
      stopLocalCamStream();
      if (remoteImg) remoteImg.classList.remove('hidden');
      if (video) video.classList.add('hidden');
      fetchRemoteCamFrame();
      if (camPollTimer) clearInterval(camPollTimer);
      camPollTimer = setInterval(fetchRemoteCamFrame, 350);
    }
  }

  function stopPulseCam() {
    camActive = false;
    stopCameraOsd();
    if (camPollTimer) {
      clearInterval(camPollTimer);
      camPollTimer = null;
    }
    stopLocalCamStream();

    const liveBadge = document.getElementById('cam-live-badge');
    if (liveBadge) liveBadge.classList.add('hidden');
  }

  async function toggleCamBroadcast() {
    const btn = document.getElementById('btn-cam-broadcast-toggle');
    const icon = document.getElementById('cam-broadcast-icon');
    const label = document.getElementById('cam-broadcast-label');

    if (camBroadcastActive) {
      if (camBroadcastInterval) {
        clearInterval(camBroadcastInterval);
        camBroadcastInterval = null;
      }
      if (camBroadcastStream) {
        camBroadcastStream.getTracks().forEach(t => t.stop());
        camBroadcastStream = null;
      }
      camBroadcastActive = false;
      if (btn) btn.classList.remove('broadcasting');
      if (icon) icon.textContent = '📱';
      if (label) label.textContent = '내 기기 카메라 송출하기';
      showToast('카메라 송출이 중지되었습니다.');
      return;
    }

    try {
      const facing = camLens === '1' ? 'user' : 'environment';
      camBroadcastStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 960 }, height: { ideal: 540 } },
        audio: false
      });

      const offscreenVideo = document.createElement('video');
      offscreenVideo.autoplay = true;
      offscreenVideo.playsInline = true;
      offscreenVideo.muted = true;
      offscreenVideo.srcObject = camBroadcastStream;
      await offscreenVideo.play();

      const offscreenCanvas = document.createElement('canvas');
      const offscreenCtx = offscreenCanvas.getContext('2d');

      let isSendingFrame = false;
      const sendFrame = async () => {
        if (!camBroadcastActive || isSendingFrame) return;
        if (!offscreenVideo.videoWidth || !offscreenVideo.videoHeight) return;
        isSendingFrame = true;
        try {
          offscreenCanvas.width = offscreenVideo.videoWidth;
          offscreenCanvas.height = offscreenVideo.videoHeight;
          offscreenCtx.drawImage(offscreenVideo, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
          const dataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.55);
          await fetch('/api/camera/feed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: dataUrl, camera: camLens })
          });
        } catch (_) {}
        isSendingFrame = false;
      };

      camBroadcastActive = true;
      if (btn) btn.classList.add('broadcasting');
      if (icon) icon.textContent = '🔴';
      if (label) label.textContent = '송출 중 (클릭하여 중지)';
      showToast('📡 카메라 송출을 시작했습니다! 실시간 화면이 공유됩니다.');

      camBroadcastInterval = setInterval(sendFrame, 200);

      if (camActive && camSource === 'phone') {
        fetchRemoteCamFrame();
      }
    } catch (err) {
      showToast('카메라 권한을 얻을 수 없습니다: ' + (err.message || err));
      if (btn) btn.classList.remove('broadcasting');
      if (icon) icon.textContent = '📱';
      if (label) label.textContent = '내 기기 카메라 송출하기';
      camBroadcastActive = false;
    }
  }

  async function takePulseCamSnapshot() {
    playCameraShutterSound();
    const flash = document.getElementById('cam-shutter-flash');
    if (flash) {
      flash.classList.add('flashing');
      setTimeout(() => flash.classList.remove('flashing'), 180);
    }

    const captureBtn = document.getElementById('btn-cam-capture');
    if (captureBtn) captureBtn.disabled = true;

    try {
      let payloadImage = null;

      if (camSource === 'local' && camLocalStream) {
        const video = document.getElementById('cam-local-video');
        if (video && video.videoWidth > 0) {
          const canvas = document.getElementById('cam-canvas') || document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          payloadImage = canvas.toDataURL('image/jpeg', 0.88);
        }
      } else if (camBroadcastActive && camBroadcastStream) {
        const canvas = document.getElementById('cam-canvas') || document.createElement('canvas');
        const video = document.getElementById('cam-local-video');
        if (video && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          payloadImage = canvas.toDataURL('image/jpeg', 0.88);
        }
      }

      const postBody = { camera: camLens };
      if (payloadImage) postBody.image = payloadImage;

      const res = await fetch('/api/camera/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postBody)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.description || data.message || '스냅샷 저장에 실패했습니다.');
      }

      showToast(`📸 스냅샷 저장 완료: ${data.filename}`);
      if (typeof addNotificationCenterItem === 'function') {
        addNotificationCenterItem('📷 Pulse Cam 스냅샷', `Camera/${data.filename} 에 저장되었습니다.`);
      }

      if (state.folder === 'Camera') {
        fetchFiles();
      }
      if (state.openWindows.photos && typeof loadPhotos === 'function') {
        loadPhotos();
      }
    } catch (err) {
      showToast('⚠️ 스냅샷 실패: ' + (err.message || err));
    } finally {
      if (captureBtn) captureBtn.disabled = false;
    }
  }

  function initPulseCam() {
    const sourceSelect = document.getElementById('cam-source-select');
    const lensSelect = document.getElementById('cam-lens-select');
    const btnRefresh = document.getElementById('btn-cam-refresh');
    const btnGrid = document.getElementById('btn-cam-grid-toggle');
    const btnFolder = document.getElementById('btn-cam-folder');
    const btnBroadcast = document.getElementById('btn-cam-broadcast-toggle');
    const btnCapture = document.getElementById('btn-cam-capture');
    const osdGrid = document.getElementById('cam-osd-grid');

    if (sourceSelect) {
      sourceSelect.addEventListener('change', (e) => {
        camSource = e.target.value;
        if (camActive) {
          startPulseCam();
        }
      });
    }

    if (lensSelect) {
      lensSelect.addEventListener('change', (e) => {
        camLens = e.target.value;
        if (camSource === 'local' && camActive) {
          startLocalCamStream();
        }
      });
    }

    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        if (camSource === 'phone') {
          fetchRemoteCamFrame();
          showToast('카메라 피드를 갱신했습니다.');
        } else {
          startLocalCamStream();
        }
      });
    }

    if (btnGrid && osdGrid) {
      btnGrid.addEventListener('click', () => {
        osdGrid.classList.toggle('show-grid');
        btnGrid.classList.toggle('active');
      });
    }

    if (btnFolder) {
      btnFolder.addEventListener('click', () => {
        openDesktopWindow('finder');
        navigateFolder('Camera');
        showToast('Camera 보관함으로 이동했습니다.');
      });
    }

    if (btnBroadcast) {
      btnBroadcast.addEventListener('click', toggleCamBroadcast);
    }

    if (btnCapture) {
      btnCapture.addEventListener('click', takePulseCamSnapshot);
    }
  }

  // ==============================================================================
  // ⚡ Pulse API Studio (v2.6.0)
  // ==============================================================================
  function initApiStudio() {
    const listEl = document.getElementById('api-list');
    const searchInput = document.getElementById('api-search-input');
    const emptyView = document.getElementById('api-empty-view');
    const editorContent = document.getElementById('api-editor-content');
    const btnNew = document.getElementById('btn-api-new');
    const btnEmptyCreate = document.getElementById('btn-api-empty-create');
    const btnRefresh = document.getElementById('btn-api-refresh');
    const btnSave = document.getElementById('btn-api-save');
    const btnDelete = document.getElementById('btn-api-delete');
    const statusPill = document.getElementById('api-view-status-pill');
    const tunnelIndicator = document.getElementById('api-tunnel-indicator');
    const countText = document.getElementById('api-count-text');
    const btnDocs = document.getElementById('btn-api-docs');

    // Inputs
    const inputName = document.getElementById('api-input-name');
    const inputPath = document.getElementById('api-input-path');
    const inputMethod = document.getElementById('api-input-method');
    const inputAuth = document.getElementById('api-input-auth');
    const inputApiKey = document.getElementById('api-input-apikey');
    const keyContainer = document.getElementById('api-key-container');
    const btnGenApiKey = document.getElementById('btn-gen-apikey');
    const inputStatusCode = document.getElementById('api-input-statuscode');
    const modeRadios = document.querySelectorAll('input[name="api-mode-radio"]');
    const paneJson = document.getElementById('editor-pane-json');
    const panePython = document.getElementById('editor-pane-python');
    const paneDevice = document.getElementById('editor-pane-device');
    const textareaJson = document.getElementById('api-textarea-json');
    const textareaPython = document.getElementById('api-textarea-python');
    const selectDeviceAction = document.getElementById('api-select-device-action');
    const btnFormatJson = document.getElementById('btn-format-json');

    // Links
    const linkTunnelUrl = document.getElementById('api-link-tunnel-url');
    const linkLocalUrl = document.getElementById('api-link-local-url');
    const btnCopyTunnel = document.getElementById('btn-copy-tunnel-url');
    const btnOpenTunnel = document.getElementById('btn-open-tunnel-url');
    const btnCopyLocal = document.getElementById('btn-copy-local-url');
    const btnOpenLocal = document.getElementById('btn-open-local-url');
    const curlCode = document.getElementById('api-curl-text');
    const btnCopyCurl = document.getElementById('btn-copy-curl');

    // Subtabs
    const subtabBtns = document.querySelectorAll('.api-subtab-btn');
    const paneDesign = document.getElementById('pane-api-design');
    const paneTester = document.getElementById('pane-api-tester');

    // Tester
    const testerMethodBadge = document.getElementById('tester-method-badge');
    const testerUrlInput = document.getElementById('tester-url-input');
    const testerQueryInput = document.getElementById('tester-query-input');
    const testerBodyBox = document.getElementById('tester-body-box');
    const testerBodyInput = document.getElementById('tester-body-input');
    const btnTesterSend = document.getElementById('btn-tester-send');
    const testerSendLabel = document.getElementById('tester-send-label');
    const testerResStatus = document.getElementById('tester-res-status');
    const testerResTime = document.getElementById('tester-res-time');
    const testerOutputPre = document.getElementById('tester-output-pre');

    // Statusbar
    const statusInfo = document.getElementById('api-status-info');
    const callsInfo = document.getElementById('api-calls-info');

    let currentApis = [];
    let activeApiId = null;
    let tunnelHostUrl = null;

    window.loadCustomApis = async function(preferredId) {
      try {
        const res = await fetch('/api/custom-apis');
        const data = await res.json();
        if (data.success) {
          currentApis = data.apis || [];
          state.customApis = currentApis;
          tunnelHostUrl = data.tunnelUrl || null;

          // Update tunnel chip
          if (tunnelIndicator) {
            if (tunnelHostUrl) {
              tunnelIndicator.textContent = 'Cloudflare 터널 활성';
              tunnelIndicator.classList.add('online');
            } else {
              tunnelIndicator.textContent = '로컬 Wi-Fi 모드';
              tunnelIndicator.classList.remove('online');
            }
          }

          // Update count
          if (countText) countText.textContent = `${currentApis.length}개 엔드포인트`;
          if (el.portalApiSummary) {
            el.portalApiSummary.textContent = `${currentApis.length}개 API 엔드포인트 가동 중`;
          }

          // Update total calls in statusbar
          const totalCalls = currentApis.reduce((acc, cur) => acc + (cur.calls || 0), 0);
          if (callsInfo) callsInfo.textContent = `총 ${totalCalls}회 호출됨`;

          renderList(searchInput ? searchInput.value.trim() : '');

          const targetId = preferredId || activeApiId;
          if (targetId && currentApis.some(a => a.id === targetId)) {
            selectApi(targetId);
          } else if (currentApis.length > 0) {
            selectApi(currentApis[0].id);
          } else {
            activeApiId = null;
            if (emptyView) emptyView.classList.remove('hidden');
            if (editorContent) editorContent.classList.add('hidden');
          }
        }
      } catch (err) {
        console.error('Failed to load custom APIs:', err);
      }
    };

    function renderList(query = '') {
      if (!listEl) return;
      listEl.innerHTML = '';
      const q = query.toLowerCase();
      const filtered = currentApis.filter(a => {
        if (!q) return true;
        return (a.name || '').toLowerCase().includes(q) ||
               (a.path || '').toLowerCase().includes(q) ||
               (a.method || '').toLowerCase().includes(q) ||
               (a.mode || '').toLowerCase().includes(q);
      });

      if (filtered.length === 0) {
        listEl.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 12px;">일치하는 API가 없습니다.</div>';
        return;
      }

      filtered.forEach(api => {
        const item = document.createElement('div');
        item.className = `api-item-card ${api.id === activeApiId ? 'active' : ''}`;
        const methodClass = `method-${(api.method || 'get').toLowerCase()}`;
        const authLabel = api.auth === 'public' ? '공개' : api.auth === 'key' ? 'Key' : '비공개';

        item.innerHTML = `
          <div class="api-item-top">
            <span class="api-method-badge ${methodClass}">${api.method || 'GET'}</span>
            <span class="api-item-path">/api/fn/${escapeHtml(api.path)}</span>
          </div>
          <div class="api-item-name">${escapeHtml(api.name || '새 API')}</div>
          <div class="api-item-meta">
            <span><span class="api-status-dot ${api.enabled ? 'active' : 'disabled'}"></span>${api.enabled ? '활성' : '비활성'} · ${authLabel}</span>
            <span>${api.calls || 0}회</span>
          </div>
        `;

        item.addEventListener('click', () => selectApi(api.id));
        listEl.appendChild(item);
      });
    }

    function selectApi(apiId) {
      activeApiId = apiId;
      const api = currentApis.find(a => a.id === apiId);
      if (!api) return;

      if (emptyView) emptyView.classList.add('hidden');
      if (editorContent) editorContent.classList.remove('hidden');

      // Update active card in list
      if (listEl) {
        const cards = listEl.querySelectorAll('.api-item-card');
        const filtered = currentApis.filter(a => {
          const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
          if (!q) return true;
          return (a.name || '').toLowerCase().includes(q) ||
                 (a.path || '').toLowerCase().includes(q) ||
                 (a.method || '').toLowerCase().includes(q) ||
                 (a.mode || '').toLowerCase().includes(q);
        });
        cards.forEach((cardEl, idx) => {
          cardEl.classList.toggle('active', filtered[idx] && filtered[idx].id === apiId);
        });
      }

      // Header Topbar
      const viewMethodBadge = document.getElementById('api-view-method-badge');
      const viewPath = document.getElementById('api-view-path');
      if (viewMethodBadge) {
        viewMethodBadge.textContent = api.method || 'GET';
        viewMethodBadge.className = `api-method-badge method-${(api.method || 'get').toLowerCase()}`;
      }
      if (viewPath) viewPath.textContent = api.path || '';
      if (statusPill) {
        statusPill.textContent = api.enabled ? '활성' : '비활성';
        statusPill.className = `api-status-pill ${api.enabled ? 'pill-active' : 'pill-inactive'}`;
      }

      // Inputs
      if (inputName) inputName.value = api.name || '';
      if (inputPath) inputPath.value = api.path || '';
      if (inputMethod) inputMethod.value = api.method || 'GET';
      if (inputAuth) {
        inputAuth.value = api.auth || 'public';
        if (keyContainer) keyContainer.classList.toggle('hidden', inputAuth.value !== 'key');
      }
      if (inputApiKey) inputApiKey.value = api.apiKey || '';
      if (inputStatusCode) inputStatusCode.value = String(api.statusCode || 200);

      // Mode
      const currentMode = api.mode || 'json';
      modeRadios.forEach(radio => {
        radio.checked = radio.value === currentMode;
        const card = radio.closest('.api-mode-card');
        if (card) card.classList.toggle('selected', radio.checked);
      });
      showModeEditor(currentMode);

      if (textareaJson) textareaJson.value = api.jsonBody || '{\n  "message": "Hello from Pulse API"\n}';
      if (textareaPython) textareaPython.value = api.pythonCode || "def handle(req):\n    name = req.get('params', {}).get('name', 'World')\n    return {'message': f'Hello, {name}!'}\n";
      if (selectDeviceAction) selectDeviceAction.value = api.deviceAction || 'battery';

      // Update URLs, cURL and Tester
      updateLiveUrlsAndCurl();

      if (testerBodyInput) {
        testerBodyInput.value = api.jsonBody || '{\n  "test": true\n}';
      }
      if (testerResStatus) {
        testerResStatus.textContent = '응답 대기';
        testerResStatus.className = 'api-res-badge';
      }
      if (testerResTime) testerResTime.textContent = '0 ms';
      if (testerOutputPre) {
        testerOutputPre.textContent = '// [요청 전송] 버튼을 누르면 실시간 응답이 여기에 표시됩니다.';
      }

      // Statusbar
      if (statusInfo) statusInfo.textContent = `엔드포인트: /api/fn/${api.path} · ${currentMode.toUpperCase()} 엔진`;
      if (callsInfo) callsInfo.textContent = `이 API ${api.calls || 0}회 호출됨 (최근: ${api.lastCalled ? api.lastCalled.split('T')[1].slice(0, 5) : '기록 없음'})`;
    }

    function updateLiveUrlsAndCurl() {
      const curPath = (inputPath ? inputPath.value.trim() : '') || (activeApiId ? (currentApis.find(a => a.id === activeApiId)?.path || '') : 'my-api');
      const curMethod = inputMethod ? inputMethod.value : 'GET';
      const curAuth = inputAuth ? inputAuth.value : 'public';
      const curKey = inputApiKey ? inputApiKey.value.trim() : '';

      const viewMethodBadge = document.getElementById('api-view-method-badge');
      const viewPath = document.getElementById('api-view-path');
      if (viewMethodBadge) {
        viewMethodBadge.textContent = curMethod;
        viewMethodBadge.className = `api-method-badge method-${(curMethod || 'get').toLowerCase()}`;
      }
      if (viewPath) viewPath.textContent = curPath;

      const localUrl = `${location.protocol}//${location.host}/api/fn/${curPath}`;
      const tunnelUrl = tunnelHostUrl ? `${tunnelHostUrl}/api/fn/${curPath}` : '';

      if (linkLocalUrl) linkLocalUrl.value = localUrl;
      if (btnOpenLocal) btnOpenLocal.href = localUrl;

      if (linkTunnelUrl) {
        linkTunnelUrl.value = tunnelUrl;
        if (!tunnelUrl) {
          linkTunnelUrl.placeholder = '터널 가동 시 자동 발급 (termux-cloud --bg)';
        }
      }
      if (btnOpenTunnel) {
        if (tunnelUrl) {
          btnOpenTunnel.href = tunnelUrl;
          btnOpenTunnel.style.display = 'inline-flex';
        } else {
          btnOpenTunnel.style.display = 'none';
        }
      }

      // cURL Command
      const effectiveUrl = tunnelUrl || localUrl;
      let curlCmd = `curl -X ${curMethod} "${effectiveUrl}"`;
      if (curAuth === 'key') {
        curlCmd += ` -H "X-API-Key: ${curKey || 'YOUR_API_KEY'}"`;
      }
      const selectedRadio = document.querySelector('input[name="api-mode-radio"]:checked');
      const curMode = selectedRadio ? selectedRadio.value : 'json';
      if (curMode === 'json' && ['POST', 'PUT', 'PATCH'].includes(curMethod)) {
        const bodyContent = ((textareaJson ? textareaJson.value : '{}') || '{}').replace(/\n/g, ' ').replace(/"/g, '\\"');
        curlCmd += ` -H "Content-Type: application/json" -d "${bodyContent}"`;
      }
      if (curlCode) curlCode.textContent = curlCmd;

      // Tester Sync
      if (testerMethodBadge) {
        testerMethodBadge.textContent = curMethod;
        testerMethodBadge.className = `api-method-badge method-${(curMethod || 'get').toLowerCase()}`;
      }
      if (testerUrlInput) {
        const queryStr = testerQueryInput ? testerQueryInput.value.trim() : '';
        const cleanQuery = queryStr ? (queryStr.startsWith('?') ? queryStr : '?' + queryStr) : '';
        testerUrlInput.value = `/api/fn/${curPath}${cleanQuery}`;
      }
      if (testerBodyBox) {
        testerBodyBox.classList.toggle('hidden', ['GET', 'DELETE'].includes(curMethod));
      }
    }

    function showModeEditor(mode) {
      if (paneJson) paneJson.classList.toggle('hidden', mode !== 'json');
      if (panePython) panePython.classList.toggle('hidden', mode !== 'python');
      if (paneDevice) paneDevice.classList.toggle('hidden', mode !== 'device');
    }

    function createNewApi() {
      activeApiId = null;
      if (emptyView) emptyView.classList.add('hidden');
      if (editorContent) editorContent.classList.remove('hidden');

      const randNum = Math.floor(Math.random() * 9000 + 1000);
      const defaultPath = `my-api-${randNum}`;

      if (inputName) inputName.value = '새 API 서비스';
      if (inputPath) inputPath.value = defaultPath;
      if (inputMethod) inputMethod.value = 'GET';
      if (inputAuth) {
        inputAuth.value = 'public';
        if (keyContainer) keyContainer.classList.add('hidden');
      }
      if (inputApiKey) inputApiKey.value = '';
      if (inputStatusCode) inputStatusCode.value = '200';

      modeRadios.forEach(radio => {
        radio.checked = radio.value === 'json';
        const card = radio.closest('.api-mode-card');
        if (card) card.classList.toggle('selected', radio.value === 'json');
      });
      showModeEditor('json');

      if (textareaJson) textareaJson.value = '{\n  "success": true,\n  "message": "나만의 API가 정상 작동합니다!",\n  "version": "1.0.0"\n}';
      if (textareaPython) textareaPython.value = "def handle(req):\n    # req['params'], req['body'], req['method'] 활용 가능\n    return {\n        'status': 'ok',\n        'time': req.get('time')\n    }\n";
      if (selectDeviceAction) selectDeviceAction.value = 'battery';

      if (statusPill) {
        statusPill.textContent = '신규';
        statusPill.className = 'api-status-pill pill-active';
      }

      // Live links and curl preview
      updateLiveUrlsAndCurl();

      if (inputName) inputName.focus();
    }

    async function saveApi() {
      const name = inputName ? inputName.value.trim() : '';
      const path = inputPath ? inputPath.value.trim() : '';
      if (!name) {
        showToast('API 이름을 입력하세요.');
        if (inputName) inputName.focus();
        return;
      }
      if (!path) {
        showToast('엔드포인트 경로를 입력하세요.');
        if (inputPath) inputPath.focus();
        return;
      }

      const method = inputMethod ? inputMethod.value : 'GET';
      const auth = inputAuth ? inputAuth.value : 'public';
      const apiKey = inputApiKey ? inputApiKey.value.trim() : '';
      const statusCode = parseInt(inputStatusCode ? inputStatusCode.value : '200', 10) || 200;
      const selectedRadio = document.querySelector('input[name="api-mode-radio"]:checked');
      const mode = selectedRadio ? selectedRadio.value : 'json';
      const jsonBody = textareaJson ? textareaJson.value : '{}';
      const pythonCode = textareaPython ? textareaPython.value : '';
      const deviceAction = selectDeviceAction ? selectDeviceAction.value : 'battery';

      if (mode === 'json') {
        try {
          JSON.parse(jsonBody);
        } catch (e) {
          showToast('JSON 응답 본문에 문법 오류가 있습니다.');
          return;
        }
      }

      const payload = {
        id: activeApiId || '',
        name,
        path,
        method,
        auth,
        apiKey,
        statusCode,
        mode,
        jsonBody,
        pythonCode,
        deviceAction,
        enabled: true
      };

      try {
        if (btnSave) btnSave.disabled = true;
        const res = await fetch('/api/custom-apis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
          showToast(`API '${name}'(/api/fn/${result.api.path})가 저장되었습니다.`);
          await window.loadCustomApis(result.api.id);
        } else {
          showToast(result.error || '저장에 실패했습니다.');
        }
      } catch (err) {
        showToast('서버 통신 실패: ' + err.message);
      } finally {
        if (btnSave) btnSave.disabled = false;
      }
    }

    async function deleteApi() {
      if (!activeApiId) return;
      const api = currentApis.find(a => a.id === activeApiId);
      if (!api) return;

      const confirmed = await Pulse.ask(`API '/api/fn/${api.path}'을(를) 완전히 삭제하시겠습니까?`, { confirm: '삭제' });
      if (!confirmed) return;

      try {
        const res = await fetch(`/api/custom-apis/${activeApiId}`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
          showToast('API 엔드포인트를 삭제했습니다.');
          activeApiId = null;
          await window.loadCustomApis();
        } else {
          showToast(result.error || '삭제 실패');
        }
      } catch (err) {
        showToast('서버 통신 실패: ' + err.message);
      }
    }

    async function toggleStatus() {
      if (!activeApiId) return;
      try {
        const res = await fetch(`/api/custom-apis/${activeApiId}/toggle`, { method: 'POST' });
        const result = await res.json();
        if (result.success) {
          showToast(result.enabled ? 'API가 활성화되었습니다.' : 'API가 비활성화되었습니다.');
          const api = currentApis.find(a => a.id === activeApiId);
          if (api) api.enabled = result.enabled;
          if (statusPill) {
            statusPill.textContent = result.enabled ? '활성' : '비활성';
            statusPill.className = `api-status-pill ${result.enabled ? 'pill-active' : 'pill-inactive'}`;
          }
          renderList(searchInput ? searchInput.value.trim() : '');
        }
      } catch (err) {
        showToast('토글 실패: ' + err.message);
      }
    }

    async function runInstantTest() {
      const api = currentApis.find(a => a.id === activeApiId);
      const pathVal = inputPath ? inputPath.value.trim() : (api ? api.path : '');
      if (!pathVal) {
        showToast('엔드포인트 경로를 지정하세요.');
        return;
      }

      const methodVal = inputMethod ? inputMethod.value : (api ? api.method : 'GET');
      const httpMethod = methodVal === 'ANY' ? 'GET' : methodVal;
      const queryStr = testerQueryInput ? testerQueryInput.value.trim() : '';
      const cleanQuery = queryStr ? (queryStr.startsWith('?') ? queryStr : '?' + queryStr) : '';
      const testUrl = `/api/fn/${pathVal}${cleanQuery}`;

      const headers = {};
      const authVal = inputAuth ? inputAuth.value : (api ? api.auth : 'public');
      const apiKeyVal = inputApiKey ? inputApiKey.value.trim() : (api ? api.apiKey : '');
      if (authVal === 'key' && apiKeyVal) {
        headers['X-API-Key'] = apiKeyVal;
      }

      const options = { method: httpMethod, headers };
      if (['POST', 'PUT', 'PATCH'].includes(httpMethod) && testerBodyInput) {
        headers['Content-Type'] = 'application/json';
        options.body = testerBodyInput.value.trim() || '{}';
      }

      if (btnTesterSend) btnTesterSend.disabled = true;
      if (testerSendLabel) testerSendLabel.textContent = '전송 중...';
      if (testerResStatus) {
        testerResStatus.textContent = '요청 중...';
        testerResStatus.className = 'api-res-badge';
      }
      if (testerOutputPre) testerOutputPre.textContent = '서버 응답 대기 중...';

      const startTime = performance.now();
      try {
        const response = await fetch(testUrl, options);
        const latency = Math.round(performance.now() - startTime);

        if (testerResTime) testerResTime.textContent = `${latency} ms`;
        if (testerResStatus) {
          testerResStatus.textContent = `${response.status} ${response.statusText || ''}`;
          testerResStatus.className = `api-res-badge ${response.ok ? 'success' : 'error'}`;
        }

        const rawText = await response.text();
        let formattedOutput = rawText;
        try {
          const parsed = JSON.parse(rawText);
          formattedOutput = JSON.stringify(parsed, null, 2);
        } catch (_) {}

        if (testerOutputPre) testerOutputPre.textContent = formattedOutput;

        // Increment calls counter in memory
        if (api) {
          api.calls = (api.calls || 0) + 1;
          api.lastCalled = new Date().toISOString();
          renderList(searchInput ? searchInput.value.trim() : '');
          if (callsInfo) callsInfo.textContent = `이 API ${api.calls}회 호출됨 (방금 실행)`;
        }
      } catch (err) {
        const latency = Math.round(performance.now() - startTime);
        if (testerResTime) testerResTime.textContent = `${latency} ms`;
        if (testerResStatus) {
          testerResStatus.textContent = '요청 실패';
          testerResStatus.className = 'api-res-badge error';
        }
        if (testerOutputPre) testerOutputPre.textContent = `Error: ${err.message}`;
      } finally {
        if (btnTesterSend) btnTesterSend.disabled = false;
        if (testerSendLabel) testerSendLabel.textContent = '요청 전송';
      }
    }

    // Event Listeners
    if (searchInput) {
      searchInput.addEventListener('input', (e) => renderList(e.target.value.trim()));
    }
    if (btnNew) btnNew.addEventListener('click', createNewApi);
    if (btnEmptyCreate) btnEmptyCreate.addEventListener('click', createNewApi);
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        showToast('API 목록 갱신 중...');
        window.loadCustomApis(activeApiId);
      });
    }
    if (btnSave) btnSave.addEventListener('click', saveApi);
    if (btnDelete) btnDelete.addEventListener('click', deleteApi);
    if (statusPill) statusPill.addEventListener('click', toggleStatus);

    if (inputPath) inputPath.addEventListener('input', updateLiveUrlsAndCurl);
    if (inputMethod) inputMethod.addEventListener('change', updateLiveUrlsAndCurl);

    if (inputAuth) {
      inputAuth.addEventListener('change', () => {
        if (keyContainer) keyContainer.classList.toggle('hidden', inputAuth.value !== 'key');
        updateLiveUrlsAndCurl();
      });
    }

    if (inputApiKey) inputApiKey.addEventListener('input', updateLiveUrlsAndCurl);
    if (testerQueryInput) testerQueryInput.addEventListener('input', updateLiveUrlsAndCurl);
    if (textareaJson) textareaJson.addEventListener('input', updateLiveUrlsAndCurl);

    if (btnGenApiKey) {
      btnGenApiKey.addEventListener('click', () => {
        const rand = Array.from(crypto.getRandomValues(new Uint8Array(12)))
          .map(b => b.toString(16).padStart(2, '0')).join('');
        if (inputApiKey) inputApiKey.value = `sk_live_${rand}`;
        updateLiveUrlsAndCurl();
        showToast('새로운 API Key가 생성되었습니다.');
      });
    }

    if (btnFormatJson && textareaJson) {
      btnFormatJson.addEventListener('click', () => {
        try {
          const parsed = JSON.parse(textareaJson.value);
          textareaJson.value = JSON.stringify(parsed, null, 2);
          updateLiveUrlsAndCurl();
          showToast('JSON 정렬 완료');
        } catch (e) {
          showToast('유효하지 않은 JSON입니다: ' + e.message);
        }
      });
    }

    modeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        modeRadios.forEach(r => {
          const card = r.closest('.api-mode-card');
          if (card) card.classList.toggle('selected', r.checked);
        });
        showModeEditor(e.target.value);
        updateLiveUrlsAndCurl();
      });
    });

    // Subtabs
    subtabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.dataset.subtab;
        subtabBtns.forEach(b => b.classList.toggle('active', b === btn));
        if (paneDesign) paneDesign.classList.toggle('hidden', tabName !== 'design');
        if (paneTester) paneTester.classList.toggle('hidden', tabName !== 'tester');
      });
    });

    // Copy actions
    if (btnCopyTunnel && linkTunnelUrl) {
      btnCopyTunnel.addEventListener('click', async () => {
        if (!linkTunnelUrl.value) {
          showToast('외부 터널 주소가 아직 없습니다. termux-cloud --bg 로 실행하세요.');
          return;
        }
        if (await copyToClipboard(linkTunnelUrl.value)) {
          showToast('외부 API URL이 복사되었습니다.');
        }
      });
    }

    if (btnCopyLocal && linkLocalUrl) {
      btnCopyLocal.addEventListener('click', async () => {
        if (await copyToClipboard(linkLocalUrl.value)) {
          showToast('로컬 API URL이 복사되었습니다.');
        }
      });
    }

    if (btnCopyCurl && curlCode) {
      btnCopyCurl.addEventListener('click', async () => {
        if (await copyToClipboard(curlCode.textContent)) {
          showToast('cURL 명령어가 복사되었습니다.');
        }
      });
    }

    if (btnTesterSend) {
      btnTesterSend.addEventListener('click', runInstantTest);
    }

    if (btnDocs) {
      btnDocs.addEventListener('click', () => {
        Pulse.ask(
          '💡 Pulse API Studio 사용 팁:\n\n' +
          '1. [JSON Mock]: 고정된 데이터를 초고속으로 반환합니다.\n' +
          '2. [Python 서버리스]: handle(req) 함수 안에서 연산/파라미터 가공 후 딕셔너리를 반환합니다.\n' +
          '3. [스마트폰 디바이스]: 스마트폰 배터리/스토리지 상태를 실시간 호출합니다.\n' +
          '4. 외부에서 호출하려면 termux-cloud --bg 명령으로 Cloudflare 터널을 켜두세요.',
          { cancel: false, confirm: '확인' }
        );
      });
    }

    // Load initial list
    window.loadCustomApis();
  }

  // Start app
  document.addEventListener('DOMContentLoaded', init);
})();
