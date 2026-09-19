"""Bounded, demand-driven server diagnostics; no privileged commands or agents."""
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
import os
import platform
import resource
import socket
import threading
import time


def read_text(path):
    try:
        return Path(path).read_text().strip()
    except (OSError, UnicodeError):
        return None


def numbers_file(path):
    values = {}
    for line in (read_text(path) or '').splitlines():
        parts = line.replace(':', ' ').split()
        if len(parts) >= 2:
            try:
                values[parts[0]] = int(parts[1])
            except ValueError:
                continue
    return values


def cpu_ticks():
    lines = (read_text('/proc/stat') or '').splitlines()
    result = {}
    for line in lines:
        parts = line.split()
        if not parts or not (parts[0] == 'cpu' or parts[0][3:].isdigit()):
            continue
        try:
            ticks = [int(x) for x in parts[1:9]]
            if len(ticks) >= 5:
                result[parts[0]] = (sum(ticks), ticks[3] + ticks[4], ticks[4])
        except ValueError:
            continue
    return result


def network_counters():
    content = read_text('/proc/net/dev')
    if content is None:
        return None
    result = {}
    for line in content.splitlines()[2:]:
        if ':' not in line:
            continue
        name, raw = line.split(':', 1)
        values = raw.split()
        try:
            if name.strip() != 'lo':
                result[name.strip()] = dict(rx=int(values[0]), tx=int(values[8]),
                                           rxErrors=int(values[2]), txErrors=int(values[10]),
                                           rxDropped=int(values[3]), txDropped=int(values[11]))
        except (ValueError, IndexError):
            continue
    return result


class Metrics:
    def __init__(self):
        self.lock = threading.Lock()
        self.request_lock = threading.Lock()
        self.start = time.monotonic()
        self.previous_time = self.start
        self.previous_cpu = time.process_time()
        self.previous_ticks = cpu_ticks()
        self.previous_network = network_counters()
        self.previous_io = numbers_file('/proc/self/io')
        self.history = deque(maxlen=60)
        self.requests = deque(maxlen=300)
        self.request_total = 0
        self.error_total = 0
        self.active_requests = 0
        self.details_at = 0
        self.details = {}

    def begin_request(self):
        with self.request_lock:
            self.active_requests += 1

    def finish_request(self, duration_ms, status):
        with self.request_lock:
            self.active_requests = max(0, self.active_requests - 1)
            self.request_total += 1
            self.error_total += int(status >= 500)
            self.requests.append((time.monotonic(), duration_ms, status))

    def request_metrics(self):
        with self.request_lock:
            samples = list(self.requests)
            latency = sorted(item[1] for item in samples)
            return dict(total=self.request_total, serverErrors=self.error_total, active=self.active_requests,
                        sampleCount=len(samples), sampleLimit=300,
                        averageMs=round(sum(latency) / len(latency), 1) if latency else None,
                        p95Ms=round(latency[max(0, (95 * len(latency) + 99) // 100 - 1)], 1) if latency else None,
                        clientErrorsInWindow=sum(400 <= x[2] < 500 for x in samples),
                        serverErrorsInWindow=sum(x[2] >= 500 for x in samples),
                        requestsPerSecond=round(sum(x[0] >= time.monotonic() - 60 for x in samples) / min(60, max(1, time.monotonic() - self.start)), 2),
                        rateIsLowerBound=len(samples) == 300 and samples[0][0] > time.monotonic() - 60)

    def slow_details(self, storage, base):
        if self.details and time.monotonic() - self.details_at < 60:
            return self.details
        sensors = []
        try:
            for directory in sorted(Path('/sys/class/thermal').glob('thermal_zone*'))[:16]:
                raw = read_text(directory / 'temp')
                if raw is None:
                    continue
                value = float(raw) / 1000
                if -20 <= value <= 150:
                    sensors.append(dict(name=read_text(directory / 'type') or directory.name, celsius=round(value, 1)))
        except (OSError, ValueError):
            pass
        frequencies = []
        try:
            for cpu in sorted(Path('/sys/devices/system/cpu').glob('cpu[0-9]*'))[:64]:
                raw = read_text(cpu / 'cpufreq/scaling_cur_freq')
                if raw and raw.isdigit():
                    frequencies.append(dict(name=cpu.name, mhz=round(int(raw) / 1000)))
        except OSError:
            pass
        trash_size = 0
        visited = 0
        truncated = False
        trash = Path(storage) / '.pulse-trash'
        if trash.exists() and not trash.is_symlink():
            def walk_error(_):
                nonlocal truncated
                truncated = True
            for folder, dirs, files in os.walk(trash, onerror=walk_error, followlinks=False):
                dirs[:] = [name for name in dirs if not (Path(folder) / name).is_symlink()]
                visited += len(dirs)
                for name in files:
                    visited += 1
                    if visited > 5000:
                        truncated = True
                        break
                    p = Path(folder) / name
                    try:
                        if not p.is_symlink():
                            trash_size += p.stat().st_size
                    except OSError:
                        truncated = True
                if truncated:
                    break
        try:
            log_bytes = (Path(base) / 'server.log').stat().st_size
        except OSError:
            log_bytes = None
        vnc_open = False
        vnc_reason = None
        try:
            port = int(os.environ.get('VNC_PORT', '6080'))
            with socket.create_connection(('127.0.0.1', port), timeout=0.2):
                vnc_open = True
        except (OSError, ValueError, OverflowError):
            vnc_reason = '연결되지 않음 또는 포트 설정 오류'
        self.details_at = time.monotonic()
        self.details = dict(thermal=sensors, thermalReason=None if sensors else '온도 센서가 없거나 Android 접근 권한이 제한됩니다.',
                            frequencies=frequencies, vncTcpOpen=vnc_open, vncReason=vnc_reason, trashBytes=trash_size, trashPartial=truncated,
                            logBytes=log_bytes, collectedAt=datetime.now(timezone.utc).isoformat())
        return self.details

    def collect(self, storage, base):
        with self.lock:
            now = time.monotonic()
            elapsed = max(0.001, now - self.previous_time)
            cores = os.cpu_count() or 1
            current_cpu = time.process_time()
            process_percent = round(max(0, (current_cpu - self.previous_cpu) / elapsed * 100), 2)
            ticks = cpu_ticks()
            host_percent = None
            iowait = None
            per_core = []
            for name, value in ticks.items():
                old = self.previous_ticks.get(name)
                if not old or value[0] <= old[0]:
                    continue
                delta = value[0] - old[0]
                percent = round(min(100, max(0, 100 * (1 - (value[1] - old[1]) / delta))), 1)
                if name == 'cpu':
                    host_percent = percent
                    iowait = round(min(100, max(0, 100 * (value[2] - old[2]) / delta)), 1)
                else:
                    per_core.append(dict(name=name, percent=percent))
            try:
                loads = os.getloadavg()
            except (AttributeError, OSError):
                loads = (None, None, None)
            fallback = host_percent is None
            cpu = dict(cores=cores, percent=round(min(100, process_percent / cores), 2) if fallback else host_percent,
                       measurement='measured', scope='process' if fallback else 'system',
                       label='Pulse CPU (전체 코어 기준)' if fallback else '기기 전체 CPU 사용률',
                       source='process_time / monotonic' if fallback else '/proc/stat 샘플 간 차이',
                       reason=('기기 전체 CPU는 Android/운영체제 접근 제한 또는 샘플 부족으로 측정할 수 없어 Pulse 프로세스 사용률을 표시합니다.' if fallback else None),
                       load1=loads[0], load5=loads[1], load15=loads[2], perCore=per_core, ioWaitPercent=iowait,
                       sampleSeconds=round(elapsed, 2))
            usage = resource.getrusage(resource.RUSAGE_SELF)
            status = numbers_file('/proc/self/status')
            rss = status.get('VmRSS')
            peak = usage.ru_maxrss * (1 if platform.system() == 'Darwin' else 1024)
            try:
                fds = len(os.listdir('/proc/self/fd'))
            except OSError:
                fds = None
            soft, _ = resource.getrlimit(resource.RLIMIT_NOFILE)
            process = dict(pid=os.getpid(), uid=os.getuid(), cpuPercent=process_percent,
                           cpuConvention='1코어 = 100%; 여러 코어 사용 시 100%를 넘을 수 있음',
                           rssBytes=rss * 1024 if rss is not None else None, peakRssBytes=peak,
                           threads=status.get('Threads', threading.active_count()),
                           threadSource='OS' if 'Threads' in status else 'Python',
                           openFiles=fds, openFileLimit=None if soft == resource.RLIM_INFINITY else soft,
                           userSeconds=round(usage.ru_utime, 2), systemSeconds=round(usage.ru_stime, 2))
            io = numbers_file('/proc/self/io')
            for name in ('read_bytes', 'write_bytes'):
                value, old = io.get(name), self.previous_io.get(name)
                process[name] = value
                process[name + '_per_second'] = round((value - old) / elapsed, 1) if value is not None and old is not None and value >= old else None
            network = network_counters()
            interfaces = []
            for name, values in (network or {}).items():
                previous = (self.previous_network or {}).get(name)
                rates = {key + 'PerSecond': round((values[key] - previous[key]) / elapsed, 1)
                         if previous and values[key] >= previous[key] else None for key in ('rx', 'tx')}
                interfaces.append(dict(name=name, **values, **rates))
            mem = numbers_file('/proc/meminfo')
            memory = {name: mem[name] * 1024 if name in mem else None for name in
                      ('MemTotal', 'MemAvailable', 'MemFree', 'Cached', 'Buffers', 'SwapTotal', 'SwapFree', 'SReclaimable')}
            uptime = read_text('/proc/uptime')
            try:
                device_uptime = float(uptime.split()[0]) if uptime else None
            except (ValueError, IndexError):
                device_uptime = None
            if device_uptime is None and hasattr(time, 'CLOCK_BOOTTIME'):
                try:
                    device_uptime = time.clock_gettime(time.CLOCK_BOOTTIME)
                except OSError:
                    pass
            fs = os.statvfs(storage)
            storage_data = dict(path=str(Path(storage).resolve()), writable=os.access(storage, os.W_OK),
                                availableBytes=fs.f_bavail * fs.f_frsize,
                                reservedBytes=max(0, (fs.f_bfree - fs.f_bavail) * fs.f_frsize),
                                inodesTotal=fs.f_files or None, inodesFree=fs.f_favail if fs.f_files else None)
            timestamp = datetime.now(timezone.utc).isoformat()
            # Keep a time series only while observed, max 60 points, at least 10s apart.
            if not self.history or now - self.history[-1]['monotonic'] >= 10:
                self.history.append(dict(monotonic=now, at=timestamp, cpu=cpu['percent'], scope=cpu['scope'],
                                         rssBytes=process['rssBytes'], processCpu=process_percent))
            self.previous_cpu, self.previous_time = current_cpu, now
            self.previous_ticks, self.previous_network, self.previous_io = ticks, network, io
            return dict(cpu=cpu, process=process, memoryDetails=memory, storageDetails=storage_data,
                        networkDetails=dict(interfaces=interfaces, reason=None if network is not None else '/proc/net/dev 접근 제한으로 기기 네트워크 통계를 읽을 수 없습니다.'),
                        device=dict(uptimeSeconds=device_uptime, kernel=platform.release(), architecture=platform.machine()),
                        requests=self.request_metrics(), sampledAt=timestamp, cacheSeconds=5,
                        history=[{k: v for k, v in point.items() if k != 'monotonic'} for point in self.history],
                        **self.slow_details(storage, base))
