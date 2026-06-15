#!/bin/bash
# cleanup.sh — docker-volume-not-mounted
docker stop webserver 2>/dev/null || true
docker rm webserver 2>/dev/null || true
rm -rf /opt/site
