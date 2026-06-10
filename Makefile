.PHONY: build run clean dev test frontend-install frontend-dev frontend-build

# Backend
build:
	go build -o bin/openclaw ./cmd/openclaw

run: build
	./bin/openclaw

dev:
	go run ./cmd/openclaw

clean:
	rm -rf bin/ openclaw.db

test:
	go test ./...

# Frontend
frontend-install:
	cd frontend && npm install --registry=https://registry.npmmirror.com

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

# Full stack
all: build frontend-build

tidy:
	go mod tidy
