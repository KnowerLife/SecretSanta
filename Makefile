.PHONY: dev dev-api test verify verify-quick build deps docker-up docker-down

dev:
	npm run dev

dev-api:
	npm run dev:api

test:
	npm run typecheck
	npm test
	npm run check:i18n-unused

verify:
	npm run verify:frontend:v69

verify-quick:
	npm run verify:frontend:v69:quick

build:
	npm run build

deps:
	npm ci --ignore-scripts
	npx playwright install --with-deps chromium

docker-up:
	docker compose -f docker-compose.v69.yml up --build

docker-down:
	docker compose -f docker-compose.v69.yml down
