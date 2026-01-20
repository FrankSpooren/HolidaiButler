#!/bin/bash

###############################################################################
# HolidaiButler Automated Backup Script
# Purpose: Daily automated backups of all databases
# Schedule: Run daily at 3 AM via cron
# Retention: 30 days
###############################################################################

# Configuration
BACKUP_DIR="/var/backups/holidaibutler"
LOG_FILE="/var/log/holidaibutler-backup.log"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Database credentials (loaded from environment or config)
MYSQL_USER="${MYSQL_BACKUP_USER:-root}"
MYSQL_PASSWORD="${MYSQL_BACKUP_PASSWORD}"
MYSQL_HOST="${MYSQL_HOST:-localhost}"
MYSQL_PORT="${MYSQL_PORT:-3306}"

MONGODB_HOST="${MONGODB_HOST:-localhost}"
MONGODB_PORT="${MONGODB_PORT:-27017}"

# Optional: S3 bucket for off-site backups
S3_BUCKET="${BACKUP_S3_BUCKET}"
AWS_PROFILE="${AWS_PROFILE:-default}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

###############################################################################
# Functions
###############################################################################

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

check_prerequisites() {
    log "Checking prerequisites..."

    # Check if backup directory exists
    if [ ! -d "$BACKUP_DIR" ]; then
        log "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR" || {
            log_error "Failed to create backup directory"
            exit 1
        }
    fi

    # Check if MySQL is installed
    if ! command -v mysqldump &> /dev/null; then
        log_error "mysqldump not found. Please install MySQL client tools."
        exit 1
    fi

    # Check if MongoDB tools are installed
    if ! command -v mongodump &> /dev/null; then
        log_warning "mongodump not found. MongoDB backups will be skipped."
    fi

    # Check if gzip is installed
    if ! command -v gzip &> /dev/null; then
        log_error "gzip not found. Please install gzip."
        exit 1
    fi

    log_success "Prerequisites check passed"
}

backup_mysql() {
    local database=$1
    local backup_file="${BACKUP_DIR}/mysql_${database}_${DATE}.sql"

    log "Starting MySQL backup for database: $database"

    # Create backup
    if [ -n "$MYSQL_PASSWORD" ]; then
        mysqldump -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" \
            --single-transaction --routines --triggers --events \
            "$database" > "$backup_file" 2>> "$LOG_FILE"
    else
        mysqldump -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" \
            --single-transaction --routines --triggers --events \
            "$database" > "$backup_file" 2>> "$LOG_FILE"
    fi

    if [ $? -eq 0 ]; then
        # Compress backup
        gzip "$backup_file"

        if [ $? -eq 0 ]; then
            local size=$(du -h "${backup_file}.gz" | cut -f1)
            log_success "MySQL backup completed: ${database} (${size})"
            echo "${backup_file}.gz"
            return 0
        else
            log_error "Failed to compress MySQL backup: $database"
            return 1
        fi
    else
        log_error "Failed to create MySQL backup: $database"
        return 1
    fi
}

backup_mongodb() {
    local database=$1
    local backup_dir="${BACKUP_DIR}/mongodb_${database}_${DATE}"
    local backup_archive="${backup_dir}.tar.gz"

    log "Starting MongoDB backup for database: $database"

    # Create backup
    mongodump --host "$MONGODB_HOST" --port "$MONGODB_PORT" \
        --db "$database" --out "$backup_dir" &>> "$LOG_FILE"

    if [ $? -eq 0 ]; then
        # Compress backup
        tar -czf "$backup_archive" -C "$BACKUP_DIR" "mongodb_${database}_${DATE}"

        if [ $? -eq 0 ]; then
            # Remove uncompressed directory
            rm -rf "$backup_dir"

            local size=$(du -h "$backup_archive" | cut -f1)
            log_success "MongoDB backup completed: ${database} (${size})"
            echo "$backup_archive"
            return 0
        else
            log_error "Failed to compress MongoDB backup: $database"
            return 1
        fi
    else
        log_error "Failed to create MongoDB backup: $database"
        return 1
    fi
}

upload_to_s3() {
    local file=$1

    if [ -z "$S3_BUCKET" ]; then
        log_warning "S3 bucket not configured. Skipping off-site backup."
        return 0
    fi

    if ! command -v aws &> /dev/null; then
        log_warning "AWS CLI not installed. Skipping off-site backup."
        return 0
    fi

    log "Uploading to S3: $(basename $file)"

    aws s3 cp "$file" "s3://${S3_BUCKET}/backups/" \
        --profile "$AWS_PROFILE" \
        --storage-class STANDARD_IA &>> "$LOG_FILE"

    if [ $? -eq 0 ]; then
        log_success "Uploaded to S3: $(basename $file)"
        return 0
    else
        log_error "Failed to upload to S3: $(basename $file)"
        return 1
    fi
}

cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."

    # Find and delete old local backups
    find "$BACKUP_DIR" -name "*.gz" -type f -mtime +${RETENTION_DAYS} -delete

    local deleted_count=$(find "$BACKUP_DIR" -name "*.gz" -type f -mtime +${RETENTION_DAYS} | wc -l)

    if [ $deleted_count -gt 0 ]; then
        log_success "Deleted ${deleted_count} old backup(s)"
    else
        log "No old backups to delete"
    fi

    # Optional: Cleanup old S3 backups
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        aws s3 ls "s3://${S3_BUCKET}/backups/" --profile "$AWS_PROFILE" | \
            while read -r line; do
                createDate=$(echo "$line" | awk {'print $1" "$2'})
                createDate=$(date -d "$createDate" +%s)
                olderThan=$(date --date="${RETENTION_DAYS} days ago" +%s)
                if [ $createDate -lt $olderThan ]; then
                    fileName=$(echo "$line" | awk {'print $4'})
                    if [ -n "$fileName" ]; then
                        aws s3 rm "s3://${S3_BUCKET}/backups/${fileName}" \
                            --profile "$AWS_PROFILE" &>> "$LOG_FILE"
                        log "Deleted old S3 backup: $fileName"
                    fi
                fi
            done
    fi
}

send_notification() {
    local status=$1
    local message=$2

    # Optional: Send email notification (requires mail command)
    if command -v mail &> /dev/null && [ -n "$BACKUP_EMAIL" ]; then
        echo "$message" | mail -s "HolidaiButler Backup: $status" "$BACKUP_EMAIL"
    fi

    # Optional: Send Slack notification
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"HolidaiButler Backup: $status\\n$message\"}" \
            &>> "$LOG_FILE"
    fi
}

###############################################################################
# Main Execution
###############################################################################

main() {
    log "========================================"
    log "HolidaiButler Backup Script Started"
    log "========================================"

    # Check prerequisites
    check_prerequisites

    # Track success/failure
    BACKUP_SUCCESS=true
    BACKUP_FILES=()

    # Backup MySQL databases
    log "----------------------------------------"
    log "MySQL Backups"
    log "----------------------------------------"

    MYSQL_DATABASES=("pxoziy_db1")

    for db in "${MYSQL_DATABASES[@]}"; do
        backup_file=$(backup_mysql "$db")
        if [ $? -eq 0 ]; then
            BACKUP_FILES+=("$backup_file")
        else
            BACKUP_SUCCESS=false
        fi
    done

    # Backup MongoDB databases
    if command -v mongodump &> /dev/null; then
        log "----------------------------------------"
        log "MongoDB Backups"
        log "----------------------------------------"

        MONGODB_DATABASES=("holidaibutler-admin" "holidaibutler-ticketing" "holidaibutler")

        for db in "${MONGODB_DATABASES[@]}"; do
            backup_file=$(backup_mongodb "$db")
            if [ $? -eq 0 ]; then
                BACKUP_FILES+=("$backup_file")
            else
                BACKUP_SUCCESS=false
            fi
        done
    fi

    # Upload to S3 (if configured)
    if [ ${#BACKUP_FILES[@]} -gt 0 ] && [ -n "$S3_BUCKET" ]; then
        log "----------------------------------------"
        log "Off-site Backup (S3)"
        log "----------------------------------------"

        for file in "${BACKUP_FILES[@]}"; do
            upload_to_s3 "$file"
        done
    fi

    # Cleanup old backups
    log "----------------------------------------"
    log "Cleanup"
    log "----------------------------------------"
    cleanup_old_backups

    # Summary
    log "========================================"
    log "Backup Summary"
    log "========================================"
    log "Total backups created: ${#BACKUP_FILES[@]}"
    log "Backup directory: $BACKUP_DIR"
    log "Disk usage: $(du -sh $BACKUP_DIR | cut -f1)"

    # Send notification
    if [ "$BACKUP_SUCCESS" = true ]; then
        log_success "ALL BACKUPS COMPLETED SUCCESSFULLY"
        send_notification "SUCCESS" "All ${#BACKUP_FILES[@]} backups completed successfully."
        exit 0
    else
        log_error "SOME BACKUPS FAILED"
        send_notification "FAILURE" "Some backups failed. Check log: $LOG_FILE"
        exit 1
    fi
}

# Run main function
main "$@"
