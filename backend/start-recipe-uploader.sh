#!/bin/bash

# Activate conda environment if needed (optional)
# source ~/miniconda3/bin/activate your_env_name

# Navigate to backend directory
cd "$(dirname "$0")"

# Start FastAPI server with live reloading
uvicorn main:app --reload
