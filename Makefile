HOST ?= 127.0.0.1
PORT ?= 3000
PIDFILE=.next-dev.pid
LOGFILE=.next-dev.log

# Tools and Binaries
NX        ?= npx
TRIVY     ?= trivy
GITLEAKS  ?= gitleaks

.PHONY: help dev-app start stop clean clean-all build lint start-prod db-sync test-coverage check-security check-secrets typecheck check

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

dev-app: ## Start dev server in the foreground
	npm run dev

build: ## Build optimized production bundle
	npm run build

lint: ## Run code linter
	npm run lint

start-prod: ## Run production build server locally
	npm run start

start: ## Start dev server in the background (PID log)
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

stop: ## Stop dev server running in background
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

cron-sync: ## Trigger manual cron sync (requires CRON_SECRET in .env.local)
	@if [ -z "$(CRON_SECRET)" ]; then \
		CRON_SECRET=$$(grep '^CRON_SECRET=' .env.local | cut -d= -f2); \
	else \
		true; \
	fi; \
	if [ -z "$$CRON_SECRET" ]; then \
		echo "❌ CRON_SECRET not set. Add it to .env.local"; \
		exit 1; \
	fi; \
	curl -s "http://$(HOST):$(PORT)/api/cron-sync-matches?secret=$$CRON_SECRET" | python3 -m json.tool 2>/dev/null || curl -s "http://$(HOST):$(PORT)/api/cron-sync-matches?secret=$$CRON_SECRET"

clean: stop ## Stop server and remove build files/logs
	rm -rf .next
	rm -f "$(LOGFILE)"
	@echo "🧹 Cleaned .next and logs."

clean-all: clean ## Clean files and remove node_modules
	rm -rf node_modules
	@echo "🧹 Removed node_modules."

db-sync: ## Sync SQL files to Supabase (requires DATABASE_URL or SUPABASE_DB_PASSWORD in .env.local)
	@DB_URL=$$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- | sed 's/"//g' | sed "s/'//g" 2>/dev/null); \
	if [ -z "$$DB_URL" ]; then \
		PASSWORD=$$(grep '^SUPABASE_DB_PASSWORD=' .env.local | cut -d= -f2 | sed 's/"//g' | sed "s/'//g" 2>/dev/null); \
		if [ -n "$$PASSWORD" ]; then \
			DB_URL="postgresql://postgres:$$PASSWORD@db.qlhclawprfqebawuqawk.supabase.co:5432/postgres"; \
		fi; \
	fi; \
	if [ -z "$$DB_URL" ]; then \
		echo "❌ Neither DATABASE_URL nor SUPABASE_DB_PASSWORD is set in .env.local"; \
		echo "   Please add DATABASE_URL=postgresql://... or SUPABASE_DB_PASSWORD=your_password to .env.local"; \
		exit 1; \
	fi; \
	if [ -z "$(FILE)" ]; then \
		node scripts/db-sync.js "$$DB_URL" supabase/quiniela_schema.sql || exit 1; \
		node scripts/db-sync.js "$$DB_URL" supabase/setup_and_seed.sql || exit 1; \
		node scripts/db-sync.js "$$DB_URL" supabase/add_penalties_support.sql || exit 1; \
	else \
		node scripts/db-sync.js "$$DB_URL" "$(FILE)" || exit 1; \
	fi

test-coverage: ## Run tests and enforce an 80% coverage floor
	@echo "\033[34m🧪 Running unit tests with strict coverage thresholds...\033[0m"
	npm run test -- --coverage --coverage.thresholds.global.statements=80

check-security: ## Verify dependencies against CVE databases (Trivy + npm audit)
	@echo "\033[34m🛡️  Scanning project dependencies for vulnerabilities...\033[0m"
	@if command -v $(TRIVY) >/dev/null 2>&1; then \
		$(TRIVY) fs --skip-version-check --severity HIGH,CRITICAL --exit-code 1 .; \
	else \
		echo "⚠️  Trivy is not installed, skipping Trivy container/fs scan."; \
	fi
	@echo "\033[34m📦 Verifying package-lock integrity via npm audit...\033[0m"
	npm audit --audit-level=high

check-secrets: ## Scan the repository to prevent accidental credential/token leaks
	@echo "\033[34m🔑 Scanning codebase for hardcoded secrets or API keys...\033[0m"
	@if command -v $(GITLEAKS) >/dev/null 2>&1; then \
		$(GITLEAKS) detect --verbose --redact --config .gitleaks.toml; \
	else \
		echo "❌ Gitleaks is not installed. Please install gitleaks to run secret detection."; \
		exit 1; \
	fi

typecheck: ## Validate TypeScript compilation structures
	@echo "\033[34m🔷 Running TypeScript compilation check...\033[0m"
	$(NX) tsc --noEmit

check: check-secrets lint typecheck check-security test-coverage build ## Full quality gate execution
	@echo "\033[32m\n✅ All static analysis, security gates, tests, and builds passed successfully!\033[0m"

