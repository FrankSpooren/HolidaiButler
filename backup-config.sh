
#!/bin/bash

# Locaties
BACKUP_DIR=~/server-config-backup
GIT_DIR=~/server-config-git

# 1. Backup uitvoeren (je bestaande backup-commando's)
mkdir -p $BACKUP_DIR/apache
mkdir -p $BACKUP_DIR/ssh
mkdir -p $BACKUP_DIR/letsencrypt
mkdir -p $BACKUP_DIR/firewall
mkdir -p $BACKUP_DIR/crontab
mkdir -p $BACKUP_DIR/scripts
mkdir -p $BACKUP_DIR/systemd

sudo cp /etc/apache2/sites-available/*.conf $BACKUP_DIR/apache/ 2>/dev/null
sudo cp /etc/ssh/sshd_config $BACKUP_DIR/ssh/ 2>/dev/null
sudo cp /etc/letsencrypt/renewal/*.conf $BACKUP_DIR/letsencrypt/ 2>/dev/null
sudo ufw status numbered > $BACKUP_DIR/firewall/ufw-status.txt 2>/dev/null
sudo cp /etc/ufw/ufw.conf $BACKUP_DIR/firewall/ 2>/dev/null
crontab -l > $BACKUP_DIR/crontab/crontab-$(whoami).txt 2>/dev/null
sudo crontab -l -u root > $BACKUP_DIR/crontab/crontab-root.txt 2>/dev/null
sudo cp /etc/hosts $BACKUP_DIR/ 2>/dev/null
dpkg --get-selections > $BACKUP_DIR/packages-list.txt

echo "Backup voltooid in $BACKUP_DIR"

# 2. Sync backup naar git-map
cp -ru $BACKUP_DIR/* $GIT_DIR/

echo "Bestanden gesynchroniseerd naar $GIT_DIR"

# 3. Voeg toe, commit en push in git-map
cd $GIT_DIR
git add .
git commit -m "Automatische backup $(date +%F)"
git push origin main

echo "Backup en git-sync voltooid!"
