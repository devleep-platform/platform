#!/bin/bash
# cleanup.sh — docker-missing-env
docker stop api-app 2>/dev/null || true
docker rm api-app 2>/dev/null || true
docker rmi api-app:latest 2>/dev/null || true
rm -rf /opt/lab/api-app
