#!/bin/bash
while true; do
  if grep -q "built in" dist/index.html 2>/dev/null; then
    break
  fi
  sleep 1
done
