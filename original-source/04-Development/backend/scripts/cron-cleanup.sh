#!/bin/bash
# Cron Wrapper for Chat Session Cleanup
# =======================================
# Runs the cleanup script with proper environment and logging
#
# Usage: Add to crontab:
#   0 3 * * * /path/to/backend/scripts/cron-cleanup.sh
#
# This runs daily at 3 AM server time

# Set working directory to backend root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
cd "$BACKEND_DIR"

# Create logs directory if it doesn't exist
mkdir -p logs

# Log file with date
LOG_FILE="logs/cleanup-$(date +%Y-%m-%d).log"

# Log start time
echo "========================================" >> "$LOG_FILE"
echo "Chat Session Cleanup Started" >> "$LOG_FILE"
echo "Time: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded" >> "$LOG_FILE"
else
    echo "❌ ERROR: .env file not found!" >> "$LOG_FILE"
    exit 1
fi

# Run cleanup script
/usr/bin/node scripts/cleanup-chat-sessions.js >> "$LOG_FILE" 2>&1

# Check exit code
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
    echo "" >> "$LOG_FILE"
    echo "✅ Cleanup completed successfully" >> "$LOG_FILE"
else
    echo "" >> "$LOG_FILE"
    echo "❌ Cleanup failed with exit code $EXIT_CODE" >> "$LOG_FILE"
fi

# Log end time
echo "Time: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Keep only last 30 days of logs
find logs/cleanup-*.log -mtime +30 -delete 2>/dev/null

# Optional: Send alert email on failure (uncomment if needed)
# if [ $EXIT_CODE -ne 0 ]; then
#     echo "Chat session cleanup failed on $(hostname)" | mail -s "HoliBot Cleanup Failed" admin@example.com
# fi

exit $EXIT_CODE
