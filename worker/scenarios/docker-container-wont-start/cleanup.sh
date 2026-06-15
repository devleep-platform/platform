#!/bin/bash
# cleanup.sh — docker-container-wont-start
docker stop broken-app fixed-app 2>/dev/null || true
docker rm broken-app fixed-app 2>/dev/null || true
docker rmi broken-app:latest 2>/dev/null || true
rm -rf /opt/lab/broken-app
