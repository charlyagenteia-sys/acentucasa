#!/usr/bin/env bash
set -u

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
URL_FILE="${APP_DIR}/.remote-url"
CHECK_EVERY_SEC="${CHECK_EVERY_SEC:-30}"
MAX_FAILS="${MAX_FAILS:-2}"
LOG_FILE="${APP_DIR}/.remote-watchdog.log"

fails=0

check_once() {
  local url=""
  if [[ -f "${URL_FILE}" ]]; then
    url="$(cat "${URL_FILE}")"
  fi

  if [[ -z "${url}" ]]; then
    return 1
  fi

  local public_code
  public_code="$(curl -s -o /tmp/app_watchdog_public.html -w '%{http_code}' "${url}" || true)"

  if [[ "${public_code}" != "200" ]]; then
    return 1
  fi

  if grep -Eqi 'Bad Gateway|Tunnel Unavailable' /tmp/app_watchdog_public.html; then
    return 1
  fi

  return 0
}

{
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] watchdog started"
  while true; do
    if check_once; then
      fails=0
    else
      fails=$((fails + 1))
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] check failed (${fails}/${MAX_FAILS})"
      if (( fails >= MAX_FAILS )); then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] restarting remote-up"
        if "${APP_DIR}/scripts/remote-up.sh" >>"${LOG_FILE}" 2>&1; then
          fails=0
          echo "[$(date '+%Y-%m-%d %H:%M:%S')] restart ok"
        else
          echo "[$(date '+%Y-%m-%d %H:%M:%S')] restart failed"
        fi
      fi
    fi
    sleep "${CHECK_EVERY_SEC}" || true
  done
} >>"${LOG_FILE}" 2>&1
