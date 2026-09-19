#!/bin/bash
# Shared process identity check; never signal an unrelated reused PID.
pulse_pid_matches() {
    local pulse_pid="$1"
    [[ "$pulse_pid" =~ ^[0-9]+$ ]] || return 1
    local pulse_cmd
    pulse_cmd=$(ps -p "$pulse_pid" -o args= 2>/dev/null) || return 1
    if [[ "$pulse_cmd" == *"$SCRIPT_DIR/app.py"* ]]; then
        return 0
    fi
    # Supports migration from older Termux launches using a relative app.py path.
    if [ -e "/proc/$pulse_pid/cwd" ] && [ "$(readlink "/proc/$pulse_pid/cwd")" = "$SCRIPT_DIR" ]; then
        [[ "$pulse_cmd" =~ python[^[:space:]]*[[:space:]]+app\.py([[:space:]]|$) ]]
        return $?
    fi
    return 1
}
