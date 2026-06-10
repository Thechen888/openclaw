# ---- Backend ----
FROM golang:1.24-alpine AS backend-builder
RUN apk add --no-cache gcc musl-dev
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 go build -o /app/bin/openclaw ./cmd/openclaw

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=backend-builder /app/bin/openclaw .
COPY --from=backend-builder /app/configs ./configs
EXPOSE 8000
CMD ["./openclaw"]
