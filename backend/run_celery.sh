#!/usr/bin/env bash
# Run Celery worker using the project's virtual environment
cd "$(dirname "$0")"
.venv/bin/celery -A pow_demo worker -l info
