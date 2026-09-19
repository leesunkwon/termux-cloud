#!/bin/bash
# Read process arguments and cwd on Termux/Linux and macOS through the same helper.
pulse_process_command() {
    local pulse_python
    pulse_python=$(command -v python3 || command -v python) || {
        echo "서버 프로세스 확인에 Python이 필요합니다." >&2
        return 1
    }
    "$pulse_python" "$SCRIPT_DIR/processctl.py" "$@"
}
pulse_pid_matches() {
    pulse_process_command match "$1"
}
pulse_server_pids() {
    pulse_process_command list
}
