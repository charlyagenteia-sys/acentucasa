#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-4780}"
HEALTH_TIMEOUT_SEC="${HEALTH_TIMEOUT_SEC:-8}"
SERVER_LOG="${APP_DIR}/.remote-server.log"
TUNNEL_LOG="${APP_DIR}/.remote-tunnel.log"
URL_FILE="${APP_DIR}/.remote-url"
SERVER_PID_FILE="${APP_DIR}/.remote-server.pid"
TUNNEL_PID_FILE="${APP_DIR}/.remote-tunnel.pid"

start_server() {
  if [[ -f "${SERVER_PID_FILE}" ]] && kill -0 "$(cat "${SERVER_PID_FILE}")" 2>/dev/null; then
    return
  fi

  pkill -f "node server.js" 2>/dev/null || true
  nohup bash -lc "cd '${APP_DIR}' && PORT='${PORT}' node server.js" >"${SERVER_LOG}" 2>&1 &
  echo "$!" >"${SERVER_PID_FILE}"
}

start_tunnel() {
  pkill -f "ssh .* -R 80:localhost:${PORT} nokey@localhost.run" 2>/dev/null || true
  pkill -f "cloudflared tunnel --url http://localhost:${PORT}" 2>/dev/null || true
  pkill -f "localtunnel --port ${PORT}" 2>/dev/null || true
  : >"${TUNNEL_LOG}"
  nohup bash -lc "cd '${APP_DIR}' && ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes -R 80:localhost:${PORT} nokey@localhost.run" >"${TUNNEL_LOG}" 2>&1 &
  echo "$!" >"${TUNNEL_PID_FILE}"

  local url=""
  for _ in $(seq 1 40); do
    url="$(grep -E 'tunneled with tls termination, https://' "${TUNNEL_LOG}" | sed -E 's/.*(https:\/\/[a-z0-9.-]+).*/\1/' | head -n 1 || true)"
    if [[ -z "${url}" ]]; then
      url="$(grep -Eo 'https://[a-z0-9-]+\.lhr\.life' "${TUNNEL_LOG}" | head -n 1 || true)"
    fi
    if [[ -n "${url}" ]]; then
      break
    fi
    sleep 0.5
  done

  if [[ -z "${url}" ]]; then
    pkill -f "ssh .* -R 80:localhost:${PORT} nokey@localhost.run" 2>/dev/null || true
    : >"${TUNNEL_LOG}"
    nohup bash -lc "cd '${APP_DIR}' && cloudflared tunnel --url http://localhost:${PORT}" >"${TUNNEL_LOG}" 2>&1 &
    echo "$!" >"${TUNNEL_PID_FILE}"

    for _ in $(seq 1 60); do
      url="$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "${TUNNEL_LOG}" | head -n 1 || true)"
      if [[ -n "${url}" ]]; then
        break
      fi
      sleep 0.5
    done
  fi

  if [[ -z "${url}" ]]; then
    echo "No pude obtener URL del tunnel. Revisa ${TUNNEL_LOG}" >&2
    exit 1
  fi

  echo "${url}" >"${URL_FILE}"
  echo "${url}"
}

validate() {
  local url="$1"
  local local_code=""
  local public_code=""

  for _ in $(seq 1 20); do
    local_code="$(curl -sS --max-time "${HEALTH_TIMEOUT_SEC}" -o /tmp/app_remote_local.html -w '%{http_code}' "http://localhost:${PORT}/" || true)"
    if [[ "${local_code}" == "200" ]]; then
      break
    fi
    sleep 0.5
  done

  for _ in $(seq 1 40); do
    public_code="$(curl -sS --max-time "${HEALTH_TIMEOUT_SEC}" -o /tmp/app_remote_public.html -w '%{http_code}' "${url}" || true)"
    if [[ "${public_code}" == "200" ]] && ! grep -Eqi 'Bad Gateway|Tunnel Unavailable' /tmp/app_remote_public.html; then
      break
    fi
    sleep 0.5
  done

  if [[ "${local_code}" != "200" || "${public_code}" != "200" ]]; then
    echo "Validacion fallo: LOCAL=${local_code} PUBLIC=${public_code}" >&2
    exit 1
  fi

  if grep -Eqi 'Bad Gateway|Tunnel Unavailable' /tmp/app_remote_public.html; then
    echo "Validacion fallo: publico devolvio pagina de error" >&2
    exit 1
  fi

  echo "LOCAL=${local_code} PUBLIC=${public_code}"
}

start_server
URL="$(start_tunnel)"
validate "${URL}"

echo "URL=${URL}"
echo "PASSWORD_HINT=NONE"
