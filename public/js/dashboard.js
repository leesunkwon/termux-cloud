/* Dashboard diagnostics: bounded server snapshots, accessible tables and trends. */
window.PulseDashboard = (() => {
  let lastData = null;
  let lastLatency = null;
  let paused = false;
  let lastError = null;
  const $ = id => document.getElementById(id);
  const number = (value, suffix = '') => Number.isFinite(value) ? `${value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${suffix}` : '측정 불가';
  const bytes = value => {
    if (!Number.isFinite(value)) return '측정 불가';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = value, index = 0;
    while (size >= 1024 && index < units.length - 1) { size /= 1024; index++; }
    return number(size, ` ${units[index]}`);
  };
  const duration = value => Number.isFinite(value) ? `${Math.floor(value / 86400)}일 ${Math.floor(value % 86400 / 3600)}시간 ${Math.floor(value % 3600 / 60)}분` : '측정 불가';
  const localTime = value => value ? new Date(value).toLocaleString('ko-KR') : '미수집';
  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function card(title, rows, note) {
    const section = node('section', undefined, 'dash-card diagnostic-card');
    section.appendChild(node('h3', title));
    const list = node('dl', undefined, 'diagnostic-kv');
    rows.forEach(([key, value]) => {
      const row = node('div');
      row.append(node('dt', key), node('dd', value ?? '측정 불가'));
      list.appendChild(row);
    });
    section.appendChild(list);
    if (note) section.appendChild(node('p', note, 'diagnostic-note'));
    $('dash-diagnostics').appendChild(section);
    return section;
  }
  function alertMessage(message, severity = 'info') {
    $('dash-alerts').appendChild(node('p', message, 'diagnostic-alert ' + severity));
  }
  function chart(title, history, key, formatter, percent = false, scopeAware = false) {
    const wrapper = node('figure', undefined, 'diagnostic-chart');
    wrapper.appendChild(node('figcaption', title));
    const values = history.map(p => p[key]).filter(Number.isFinite);
    if (!values.length) {
      wrapper.appendChild(node('p', '측정 가능한 샘플이 없습니다.'));
      return wrapper;
    }
    const width = 500, height = 100;
    const start = Date.parse(history[0].at);
    const end = Date.parse(history[history.length - 1].at);
    const maximum = percent ? 100 : Math.max(1, ...values);
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${title}. 최근 값 ${formatter(values[values.length - 1])}.`);
    let segment = [];
    const draw = () => {
      if (!segment.length) return;
      const line = document.createElementNS(ns, 'polyline');
      line.setAttribute('points', segment.join(' '));
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', 'currentColor');
      line.setAttribute('stroke-width', '2');
      svg.appendChild(line);
      const [x, y] = segment[segment.length - 1].split(',');
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', '3');
      dot.setAttribute('fill', 'currentColor'); svg.appendChild(dot);
      segment = [];
    };
    history.forEach((sample, index) => {
      const previous = history[index - 1];
      if (!Number.isFinite(sample[key])) { draw(); return; }
      if (previous && (Date.parse(sample.at) - Date.parse(previous.at) > 90000 || (scopeAware && previous.scope !== sample.scope))) draw();
      const x = 4 + (Date.parse(sample.at) - start) / Math.max(1, end - start) * (width - 8);
      const y = height - 4 - sample[key] / maximum * (height - 8);
      segment.push(`${x},${y}`);
    });
    draw();
    wrapper.append(svg, node('p', `최근 ${formatter(values[values.length - 1])} · 최대 ${formatter(Math.max(...values))} · 축 상한 ${formatter(maximum)}`));
    return wrapper;
  }
  function configure(callbacks) {
    $('dash-poll-interval').addEventListener('change', event => callbacks.interval(Number(event.target.value)));
    $('dash-pause').addEventListener('click', () => {
      paused = !paused;
      callbacks.pause(paused);
      $('dash-pause').textContent = paused ? '자동 갱신 재개' : '일시 정지';
      $('dash-pause').setAttribute('aria-pressed', String(paused));
      if (!paused) callbacks.refresh();
      if (lastData && !lastError) {
        $('dash-connection').textContent = paused ? '자동 갱신 일시 정지' : '서버 응답 정상';
      }
    });
    $('dash-export').addEventListener('click', () => {
      if (!lastData) return;
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), browserRoundTripMs: lastLatency, ...lastData }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = node('a');
      link.href = url;
      link.download = `pulse-diagnostics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  function render(data, latency) {
    lastError = null;
    lastData = data;
    lastLatency = latency;
    const diag = data.diagnostics;
    if (!diag) {
      failed('서버를 최신 버전으로 재시작해야 상세 진단을 표시할 수 있습니다.');
      return;
    }
    $('dash-export').disabled = false;
    $('dash-connection').textContent = paused ? '자동 갱신 일시 정지' : '서버 응답 정상';
    $('dash-connection').className = 'badge-status online';
    $('dash-sampled-at').textContent = `수집 ${localTime(diag.sampledAt)} · 왕복 ${number(latency, 'ms')} · 서버 캐시 ${diag.cacheSeconds}초${paused ? ' · 자동 갱신 정지' : ''}`;
    $('dash-alerts').replaceChildren();
    if (data.cpu.reason) alertMessage(data.cpu.reason);
    if (data.disk.percent >= 90) alertMessage('디스크 사용률이 90% 이상입니다. 휴지통과 보관함의 여유 공간을 확인하세요.', 'warning');
    if (data.memory.percent >= 90) alertMessage('메모리 사용률이 90% 이상입니다. 실행 중인 앱과 작업을 확인하세요.', 'warning');
    if (data.cpu.scope === 'system' && data.cpu.percent >= 90) alertMessage('기기 전체 CPU 사용률이 90% 이상입니다.', 'warning');
    if (diag.requests.serverErrorsInWindow) alertMessage(`최근 요청 ${diag.requests.sampleCount}건 중 서버 오류 ${diag.requests.serverErrorsInWindow}건이 있습니다. termux-cloud logs로 확인하세요.`, 'warning');
    if (data.services.debug) alertMessage('개발용 디버그 모드가 활성화되어 있습니다.', 'warning');
    if (!diag.storageDetails.writable) alertMessage('서버 사용자에게 보관함 쓰기 권한이 없습니다.', 'warning');
    if (!data.battery.supported) alertMessage('배터리 조회 불가: Termux:API 앱, termux-api 패키지 및 Android 권한을 확인하세요.');
    $('dash-diagnostics').replaceChildren();
    card('CPU 측정 범위와 코어', [
      ['표시 대상', data.cpu.label], ['수집 경로', data.cpu.source], ['샘플 간격', number(data.cpu.sampleSeconds, '초')],
      ['1 / 5 / 15분 부하 평균', [data.cpu.load1, data.cpu.load5, data.cpu.load15].map(x => number(x)).join(' / ')],
      ['기기 I/O 대기 비율', number(data.cpu.ioWaitPercent, '%')],
      ['코어별 사용률', data.cpu.perCore.length ? data.cpu.perCore.map(x => `${x.name} ${x.percent}%`).join(' · ') : '운영체제 접근 제한 또는 샘플 부족'],
      ['CPU 주파수', diag.frequencies.length ? diag.frequencies.map(x => `${x.name} ${x.mhz}MHz`).join(' · ') : '센서 접근 불가']
    ], '부하 평균은 CPU 사용률(%)과 다른 지표입니다. 코어 전체 용량 기준으로 정규화한 사용률을 상단에 표시합니다.');
    const proc = diag.process;
    card('Pulse 서버 프로세스', [
      ['PID / UID', `${proc.pid} / ${proc.uid}`], ['프로세스 CPU', number(proc.cpuPercent, '%')],
      ['현재 실제 메모리 (RSS)', bytes(proc.rssBytes)], ['최대 RSS (시작 이후)', bytes(proc.peakRssBytes)],
      ['스레드', `${proc.threads}개 (${proc.threadSource})`], ['열린 파일 / 제한', `${number(proc.openFiles)} / ${number(proc.openFileLimit)}`],
      ['누적 사용자 / 커널 CPU 시간', `${number(proc.userSeconds, '초')} / ${number(proc.systemSeconds, '초')}`],
      ['디스크 읽기 / 쓰기', `${bytes(proc.read_bytes_per_second)}/s · ${bytes(proc.write_bytes_per_second)}/s`]
    ], `${proc.cpuConvention}. 프로세스 값에는 터미널 명령 등 자식 프로세스가 포함되지 않습니다.`);
    const mem = diag.memoryDetails;
    card('메모리와 스왑', [
      ['기기 전체', bytes(mem.MemTotal)], ['즉시 사용 가능', bytes(mem.MemAvailable)], ['미사용', bytes(mem.MemFree)],
      ['파일 캐시 / 버퍼', `${bytes(mem.Cached)} / ${bytes(mem.Buffers)}`], ['회수 가능 커널 캐시', bytes(mem.SReclaimable)],
      ['스왑 전체 / 여유', `${bytes(mem.SwapTotal)} / ${bytes(mem.SwapFree)}`]
    ], '/proc/meminfo 기준. Android 접근 제한 시 기기 메모리를 표시할 수 없으며 프로세스 RSS는 별도로 확인할 수 있습니다.');
    const disk = diag.storageDetails;
    card('보관함과 파일시스템', [
      ['실제 저장 경로', disk.path], ['서버 쓰기 권한', disk.writable ? '있음' : '없음'],
      ['전체 / 사용 / 여유', `${data.disk.totalFormatted} / ${data.disk.usedFormatted} / ${data.disk.freeFormatted}`],
      ['서버 사용자 가용 공간', bytes(disk.availableBytes)], ['예약 공간', bytes(disk.reservedBytes)],
      ['아이노드 전체 / 여유', `${number(disk.inodesTotal)} / ${number(disk.inodesFree)}`],
      ['활성 파일', `${data.disk.cloudFilesCount}개 · ${data.disk.cloudUsedFormatted}`],
      ['종류별 파일', Object.entries(data.disk.fileCounts || {}).filter(([key]) => key !== 'total').map(([key, count]) => `${({image:'사진',video:'영상',audio:'음악',document:'문서',other:'기타'})[key] || key} ${count}`).join(' · ')],
      ['휴지통 사용량', `${diag.trashPartial ? '최소 ' : ''}${bytes(diag.trashBytes)}`], ['서버 로그 크기', bytes(diag.logBytes)]
    ], `휴지통·로그 통계: ${localTime(diag.collectedAt)} (최대 60초 캐시). 휴지통은 최대 5,000개 항목까지 조사하며 부분 수집 시 ‘최소’로 표시합니다.`);
    const net = card('네트워크 트래픽', [
      ['브라우저 → 서버 응답 왕복', number(latency, 'ms')], ['기기 IP / 서비스 포트', `${data.network.localIp}:${data.network.port}`],
      ['현재 접속 주소', location.origin]
    ], diag.networkDetails.reason || '기기 인터페이스 전체 통계이며 Pulse 전용 트래픽이 아닙니다. VPN과 물리 인터페이스의 트래픽은 중복될 수 있습니다.');
    for (const iface of diag.networkDetails.interfaces) {
      net.appendChild(node('p', `${iface.name} · 수신 ${bytes(iface.rxPerSecond)}/s · 송신 ${bytes(iface.txPerSecond)}/s\n누적 수신 ${bytes(iface.rx)} / 송신 ${bytes(iface.tx)}\n오류 RX/TX ${iface.rxErrors}/${iface.txErrors} · 드롭 ${iface.rxDropped}/${iface.txDropped}`, 'diagnostic-interface'));
    }
    const req = diag.requests;
    card('HTTP 처리 성능', [
      ['처리한 요청 / 활성 요청', `${req.total} / ${req.active}`], ['누적 서버 오류 (5xx)', req.serverErrors],
      ['최근 요청 표본', `${req.sampleCount} / ${req.sampleLimit}건`], ['평균 / P95 처리 시간', `${number(req.averageMs, 'ms')} / ${number(req.p95Ms, 'ms')}`],
      ['최근 1분 요청/초', `${req.rateIsLowerBound ? '최소 ' : ''}${number(req.requestsPerSecond)}`],
      ['표본 내 4xx / 5xx', `${req.clientErrorsInWindow} / ${req.serverErrorsInWindow}`]
    ], '단일 Pulse 프로세스 기준. 상태 조회·정적 파일 요청도 포함합니다. 처리 시간은 응답 헤더 생성까지이며 스트리밍 전송 시간은 제외합니다.');
    card('배터리와 온도', [
      ['잔량', number(data.battery.percentage, '%')], ['충전 상태 / 연결', `${data.battery.status} / ${data.battery.plugged}`],
      ['배터리 온도', number(data.battery.temperature, '°C')], ['배터리 상태', data.battery.supported ? data.battery.health : '측정 불가'],
      ['기기 온도 센서', diag.thermal.length ? diag.thermal.map(x => `${x.name} ${x.celsius}°C`).join(' · ') : diag.thermalReason]
    ], `온도·주파수 센서는 60초 캐시. 센서 명칭과 노출 여부는 기기에 따라 다릅니다.`);
    const services = data.services;
    card('실행 환경과 작업 상태', [
      ['기기 부팅 후 경과', duration(diag.device.uptimeSeconds)], ['Pulse 시작 시간', data.uptime.startedAt], ['Pulse 가동 시간', data.uptime.formatted],
      ['커널 / 아키텍처', `${diag.device.kernel} / ${diag.device.architecture}`], ['런타임', data.runtime],
      ['터미널 / 파일 작업 / 업데이트', [services.terminalBusy, services.fileOperationBusy, services.updateBusy].map(x => x ? '진행 중' : '대기').join(' / ')],
      ['관리 실행 / 웹 재시작', services.managedRestart ? '지원' : '수동 재시작 필요'],
      ['인증 / Secure 쿠키', `로그인 필수 / ${services.secureCookie ? 'HTTPS 전용' : 'HTTP 호환'}`],
      ['설정된 noVNC 포트', services.vncPort], ['로컬 noVNC TCP 연결', diag.vncTcpOpen ? '포트 연결 가능' : diag.vncReason], ['업데이트 조회 경과', number(services.updateCheckedSecondsAgo, '초')]
    ], 'noVNC TCP 결과는 최대 60초 캐시이며 VNC 로그인·화면 연결 성공을 뜻하지 않습니다. Secure 쿠키 설정은 HTTPS 전용 환경에서 사용합니다.');
    $('dash-history').replaceChildren(
      chart('CPU 사용률 · 기기 전체 / 제한 시 Pulse 프로세스 (전체 코어 기준)', diag.history, 'cpu', x => number(x, '%'), true, true),
      chart('Pulse 프로세스 메모리 · RSS', diag.history, 'rssBytes', bytes)
    );
  }
  function failed(reason) {
    lastError = reason;
    $('dash-connection').textContent = '연결 확인 필요';
    $('dash-connection').className = 'badge-status diagnostic-offline';
    $('dash-alerts').replaceChildren();
    alertMessage(`${reason}. ${lastData ? '아래 수치는 마지막 성공 조회 결과입니다.' : '수집된 데이터가 없습니다.'}`, 'warning');
  }
  return { configure, render, failed };
})();
