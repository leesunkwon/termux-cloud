#!/bin/bash
# Stop only this project's server and Flask reloader processes.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1
source "$SCRIPT_DIR/process.sh"
echo "[*] Pulse 서버 프로세스를 확인합니다..."
pulse_process_command stop

# Cloudflare Tunnel이 켜져 있는 경우 함께 종료
if [ -f "$SCRIPT_DIR/.tunnel.pid" ]; then
    bash "$SCRIPT_DIR/tunnel.sh" stop
fi
