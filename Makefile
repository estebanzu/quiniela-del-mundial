HOST ?= 127.0.0.1
PORT ?= 3000
PIDFILE=.next/next.pid
LOGFILE=.next/next.log

.PHONY: start stop clean clean-all

start:
	@mkdir -p .next
	@if [ -f "$(PIDFILE)" ] && kill -0 $$(cat "$(PIDFILE)") >/dev/null 2>&1; then \
		echo "Next.js is already running with PID $$(cat $(PIDFILE))"; \
		exit 1; \
	fi
	@echo "Starting Next.js dev server at http://$(HOST):$(PORT) ..."
	@nohup HOST="$(HOST)" PORT="$(PORT)" npm run dev > "$(LOGFILE)" 2>&1 &
	@echo $$! > "$(PIDFILE)"
	@echo "Started dev server at http://$(HOST):$(PORT) (PID $$(cat $(PIDFILE))). Logs: $(LOGFILE)"

stop:
	@if [ -f "$(PIDFILE)" ]; then \
		pid=$$(cat "$(PIDFILE)"); \
		if kill -0 $$pid >/dev/null 2>&1; then \
			echo "Stopping Next.js process $$pid..."; \
			kill $$pid; \
			echo "Stopped."; \
		else \
			echo "No running process found for PID $$pid."; \
		fi; \
		rm -f "$(PIDFILE)"; \
	else \
		echo "No PID file found. Is the dev server running?"; \
	fi

clean:
	rm -rf .next
	@echo "Removed .next build output."

clean-all: clean
	rm -rf node_modules
	@echo "Removed node_modules."
