#!/bin/bash
# cleanup.sh — docker-wrong-port
docker stop webserver 2>/dev/null || true
docker rm webserver 2>/dev/null || true
