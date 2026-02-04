#!/usr/bin/env bash
# Run Django dev server using the project's virtual environment
cd "$(dirname "$0")"
.venv/bin/python manage.py runserver
