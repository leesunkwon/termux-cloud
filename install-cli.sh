#!/bin/bash
# Register the CLI independently of dependency installation/account provisioning.
set -eu
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PULSE_BASH=$(command -v bash)

if [ -n "${TERMUX_VERSION:-}" ] || [ -d /data/data/com.termux ]; then
    PULSE_BIN_DIR="${PREFIX:-/data/data/com.termux/files/usr}/bin"
else
    PULSE_BIN_DIR="$HOME/.local/bin"
fi
mkdir -p "$PULSE_BIN_DIR"
PULSE_CLI_PATH="$PULSE_BIN_DIR/termux-cloud"
if [ -d "$PULSE_CLI_PATH" ]; then
    echo "등록 경로가 폴더입니다: $PULSE_CLI_PATH" >&2
    exit 1
fi
PULSE_CLI_TMP=$(mktemp "$PULSE_BIN_DIR/.termux-cloud.XXXXXX")
trap 'rm -f "$PULSE_CLI_TMP"' EXIT
{
    printf '#!%s\n' "$PULSE_BASH"
    printf '# Pulse global launcher; managed by install-cli.sh\n'
    printf 'exec %q %q "$@"\n' "$PULSE_BASH" "$SCRIPT_DIR/cli.sh"
} > "$PULSE_CLI_TMP"
chmod 755 "$PULSE_CLI_TMP"
mv -f "$PULSE_CLI_TMP" "$PULSE_CLI_PATH"
printf '전역 명령어 등록 완료: %s\n' "$PULSE_CLI_PATH"
case ":$PATH:" in
    *":$PULSE_BIN_DIR:"*) ;;
    *)
        echo '현재 셸의 PATH에 등록 폴더가 없습니다. 아래 명령을 실행하고 셸 설정에도 추가하세요:'
        printf 'export PATH=%q:"$PATH"\n' "$PULSE_BIN_DIR"
        ;;
esac
cat <<'EOF'

  termux-cloud account   계정 등록
  termux-cloud --bg      서버 시작
  termux-cloud status    상태 확인
  termux-cloud stop      서버 종료
  termux-cloud restart   백그라운드 재시작
  termux-cloud update    업데이트 후 백그라운드 재시작
  termux-cloud help      전체 도움말
EOF
