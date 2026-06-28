#!/usr/bin/env python3
import os
import sys
import subprocess

# Get port from environment variable, default to 8000
port = os.environ.get('PORT', '8000')

# Start the FastAPI server with uvicorn
cmd = [
    sys.executable, 
    '-m', 
    'uvicorn', 
    'algo_dashboard_backend:app',
    '--host', '0.0.0.0',
    '--port', port
]

print(f"Starting AutomateX on port {port}...")
print(f"Command: {' '.join(cmd)}")

try:
    subprocess.run(cmd, check=True)
except KeyboardInterrupt:
    print("\nShutting down...")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
