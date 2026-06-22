HOST ?= 127.0.0.1
PORT ?= 3000
PIDFILE=.next-dev.pid
LOGFILE=.next-dev.log

.PHONY: start stop clean clean-all dev-app

dev-app:
	npm run dev

start:
	@if [ -f "$(PIDFILE)" ] && kill -0 $$(cat "$(PIDFILE)") >/dev/null 2>&1; then \
		echo "⚡ Next.js is already running (PID $$(cat $(PIDFILE)))"; \
		echo "   http://$(HOST):$(PORT)"; \
		exit 1; \
	fi
	@echo "🚀 Starting Next.js dev server at http://$(HOST):$(PORT) ..."
	@npx next dev --hostname "$(HOST)" --port "$(PORT)" > "$(LOGFILE)" 2>&1 & \
		echo $$! > "$(PIDFILE)"
	@sleep 1
	@if [ -f "$(PIDFILE)" ] && kill -0 $$(cat "$(PIDFILE)") >/dev/null 2>&1; then \
		echo "✅ Dev server started (PID $$(cat $(PIDFILE))). Logs: $(LOGFILE)"; \
	else \
		echo "❌ Failed to start. Check $(LOGFILE)"; \
		rm -f "$(PIDFILE)"; \
		exit 1; \
	fi

stop:
	@if [ -f "$(PIDFILE)" ]; then \
		pid=$$(cat "$(PIDFILE)"); \
		if kill -0 $$pid >/dev/null 2>&1; then \
			echo "🛑 Stopping Next.js (PID $$pid) and children..."; \
			kill -- -$$pid >/dev/null 2>&1 || kill $$pid >/dev/null 2>&1; \
			sleep 1; \
			if kill -0 $$pid >/dev/null 2>&1; then \
				kill -9 $$pid >/dev/null 2>&1; \
			fi; \
			echo "✅ Stopped."; \
		else \
			echo "⚠️  PID $$pid is not running."; \
		fi; \
		rm -f "$(PIDFILE)"; \
	else \
		echo "⚠️  No PID file found. Checking for stray next processes..."; \
		pids=$$(lsof -ti :$(PORT) 2>/dev/null); \
		if [ -n "$$pids" ]; then \
			echo "🛑 Killing processes on port $(PORT): $$pids"; \
			echo "$$pids" | xargs kill 2>/dev/null; \
			echo "✅ Stopped."; \
		else \
			echo "✅ Nothing running on port $(PORT)."; \
		fi; \
	fi

clean: stop
	rm -rf .next
	rm -f "$(LOGFILE)"
	@echo "🧹 Cleaned .next and logs."

clean-all: clean
	rm -rf node_modules
	@echo "🧹 Removed node_modules."
