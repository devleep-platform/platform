FROM golang:1.25-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o worker ./cmd/worker

FROM alpine:latest

RUN apk add --no-cache \
    ca-certificates \
    openssl \
    curl \
    unzip \
    openssh-client \
    openssh-keygen \
    postgresql-client \
    bash

# Cloudflared for SSH/HTTP through lab tunnels
RUN curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
    -o /usr/local/bin/cloudflared \
    && chmod +x /usr/local/bin/cloudflared

# Install OpenTofu
RUN curl -fsSL https://github.com/opentofu/opentofu/releases/download/v1.8.8/tofu_1.8.8_linux_amd64.zip -o /tmp/tofu.zip \
    && unzip /tmp/tofu.zip -d /usr/local/bin \
    && chmod +x /usr/local/bin/tofu \
    && rm /tmp/tofu.zip

WORKDIR /app

COPY --from=builder /app/worker .
COPY --from=builder /app/app/terraform/modules ./terraform/modules
COPY --from=builder /app/scenarios ./scenarios

# Pre-cache AWS + TLS providers at build time to avoid runtime downloads
RUN mkdir -p /root/.terraform.d/plugin-cache /tmp/provider-init \
    && printf 'terraform {\n  required_version = ">= 1.0"\n  required_providers {\n    aws = {\n      source  = "hashicorp/aws"\n      version = "~> 5.0"\n    }\n    tls = {\n      source  = "hashicorp/tls"\n      version = "~> 4.0"\n    }\n  }\n}\n\nprovider "aws" {\n  region = "us-east-1"\n}\n' > /tmp/provider-init/main.tf \
    && cd /tmp/provider-init \
    && TF_PLUGIN_CACHE_DIR=/root/.terraform.d/plugin-cache tofu init -no-color \
    && rm -rf /tmp/provider-init

ENV TF_PLUGIN_CACHE_DIR=/root/.terraform.d/plugin-cache

RUN mkdir -p /tmp/labs

EXPOSE 8080

ENV PORT=8080 \
    LOG_LEVEL=info \
    AWS_REGION=ap-south-1

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

CMD ["./worker"]
