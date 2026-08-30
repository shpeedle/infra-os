SHELL := /usr/bin/env bash

.PHONY: dev

dev:
	@set -euo pipefail; \
	api_pid=""; frontend_pid=""; \
	cleanup() { \
		trap - INT TERM EXIT; \
		if [[ -n "$$api_pid" ]]; then kill "$$api_pid" 2>/dev/null || true; fi; \
		if [[ -n "$$frontend_pid" ]]; then kill "$$frontend_pid" 2>/dev/null || true; fi; \
		if [[ -n "$$api_pid" ]]; then wait "$$api_pid" 2>/dev/null || true; fi; \
		if [[ -n "$$frontend_pid" ]]; then wait "$$frontend_pid" 2>/dev/null || true; fi; \
		echo "Infra / OS stopped."; \
	}; \
	on_signal() { cleanup || true; exit 0; }; \
	trap on_signal INT TERM; \
	trap cleanup EXIT; \
	.venv/bin/python -m uvicorn backend.app.main:app --reload --port 8000 & api_pid=$$!; \
	pnpm run dev:frontend & frontend_pid=$$!; \
	echo "Infra / OS running at http://localhost:5173 (Ctrl-C to stop and clean up)."; \
	wait "$$api_pid" "$$frontend_pid"
