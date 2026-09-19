"""Identify only this checkout's Python/Node server processes, including reloaders."""
import os
from pathlib import Path
import re
import shlex
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent


def snapshot():
    result = {}
    if Path('/proc/self/cmdline').exists():
        for directory in Path('/proc').iterdir():
            if not directory.name.isdigit():
                continue
            try:
                if directory.stat().st_uid != os.getuid():
                    continue
                argv = [os.fsdecode(x) for x in (directory / 'cmdline').read_bytes().split(b'\0') if x]
                if argv:
                    result[int(directory.name)] = argv
            except (OSError, ValueError):
                continue
        return result
    output = subprocess.check_output(['ps', '-ww', '-axo', 'pid=,uid=,command='], text=True, timeout=5)
    for line in output.splitlines():
        parts = line.strip().split(None, 2)
        if len(parts) != 3 or int(parts[1]) != os.getuid():
            continue
        try:
            result[int(parts[0])] = shlex.split(parts[2])
        except ValueError:
            continue
    return result


def cwd_for(pid):
    try:
        return Path(os.readlink(f'/proc/{pid}/cwd')).resolve()
    except OSError:
        pass
    try:
        output = subprocess.check_output(['lsof', '-a', '-p', str(pid), '-d', 'cwd', '-Fn'],
                                         text=True, stderr=subprocess.DEVNULL, timeout=3)
        for line in output.splitlines():
            if line.startswith('n'):
                return Path(line[1:]).resolve()
    except (OSError, subprocess.SubprocessError):
        pass
    return None


def recorded_pid():
    pid_file = ROOT / '.server.pid'
    if pid_file.exists():
        try:
            content = pid_file.read_text().strip()
            if content.isdigit():
                return int(content)
        except OSError:
            pass
    return None


def matches(pid, argv, expected_pid=None):
    if pid in (os.getpid(), os.getppid()) or len(argv) < 2:
        return False
    runtime = Path(argv[0]).name.lower()
    if re.fullmatch(r'python(?:\d+(?:\.\d+)*)?', runtime):
        target = 'app.py'
        if any(arg in ('-c', '-m') for arg in argv[1:]):
            return False
    elif runtime in ('node', 'nodejs'):
        target = 'server.js'
        if any(arg in ('-e', '--eval', '-p', '--print') for arg in argv[1:]):
            return False
    else:
        return False
    # Launch scripts do not pass option arguments; ignore simple flags like -u.
    script = next((arg for arg in argv[1:] if not arg.startswith('-')), '')
    if Path(script).is_absolute():
        return Path(script).resolve() == ROOT / target
    if script not in (target, './' + target):
        return False
    cwd = cwd_for(pid)
    if cwd is not None:
        return cwd == ROOT
    # In environments where cwd is inaccessible (e.g. non-rooted Android Termux without lsof),
    # verify against recorded PID if available.
    if expected_pid is None:
        expected_pid = recorded_pid()
    return expected_pid is not None and pid == expected_pid


def server_pids():
    return sorted(pid for pid, argv in snapshot().items() if matches(pid, argv))


def still_alive(pid):
    try:
        os.kill(pid, 0)
        # Linux zombies cannot listen or serve requests and need their parent to reap them.
        stat = Path(f'/proc/{pid}/stat')
        if stat.exists() and stat.read_text().rsplit(')', 1)[1].split()[0] == 'Z':
            return False
        return True
    except ProcessLookupError:
        return False


def stop():
    pids = server_pids()
    pid_file = ROOT / '.server.pid'
    rec_pid = recorded_pid()
    if not pids and rec_pid is not None:
        if still_alive(rec_pid):
            current = snapshot()
            if matches(rec_pid, current.get(rec_pid, []), expected_pid=rec_pid):
                pids = [rec_pid]
            else:
                raise RuntimeError('기록된 PID의 프로젝트 소속을 확인하지 못했습니다. PID 파일을 보존합니다.')
        else:
            pid_file.unlink(missing_ok=True)
            print('실행 중인 Pulse 서버가 없습니다.')
            return

    if not pids:
        pid_file.unlink(missing_ok=True)
        print('실행 중인 Pulse 서버가 없습니다.')
        return

    # Capture reload children before signaling the parent; revalidate each PID before signaling.
    for sig, wait_seconds in ((signal.SIGTERM, 3), (signal.SIGKILL, 2)):
        current = snapshot()
        for pid in pids:
            if matches(pid, current.get(pid, []), expected_pid=pid):
                try:
                    os.kill(pid, sig)
                except ProcessLookupError:
                    pass
        deadline = time.monotonic() + wait_seconds
        while time.monotonic() < deadline and any(still_alive(pid) for pid in pids):
            time.sleep(0.1)
    remaining = server_pids()
    if remaining:
        raise RuntimeError('서버가 아직 실행 중입니다. PID: ' + ', '.join(map(str, remaining)))
    pid_file.unlink(missing_ok=True)
    print('Pulse 서버 종료 완료. PID: ' + ', '.join(map(str, pids)))


if __name__ == '__main__':
    try:
        action = sys.argv[1]
        if action == 'list':
            for pid in server_pids():
                print(pid)
        elif action == 'match':
            pid = int(sys.argv[2])
            sys.exit(0 if matches(pid, snapshot().get(pid, []), expected_pid=pid) else 1)
        elif action == 'stop':
            stop()
        else:
            raise ValueError('지원하지 않는 프로세스 명령입니다.')
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
        print(f'프로세스 확인 실패: {error}', file=sys.stderr)
        sys.exit(1)
