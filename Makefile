.PHONY: frontend backend test test-backend smoke screenshots docker-up docker-down

frontend:
	python3 -m http.server 8766

backend:
	python3 -m backend.app.server --host 127.0.0.1 --port 8000

test-backend:
	cd backend && python3 -m unittest discover -s tests -p 'test*.py' -v

test: test-backend
	node --check app.js
	node --check sw.js

smoke:
	python3 scripts/smoke_e2e.py

screenshots:
	node scripts/capture_screenshots.mjs

docker-up:
	docker compose up --build

docker-down:
	docker compose down
