#!/bin/bash
set -euo pipefail

# Full-Stack App VPS Setup Script
# Run this script on a fresh Ubuntu 22.04 or Debian 12 VPS

echo "=== Full-Stack App VPS Setup ==="
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

# Update system
echo "Updating system packages..."
apt-get update && apt-get upgrade -y

# Install essential packages
echo "Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    htop \
    vim \
    ufw \
    fail2ban \
    unzip \
    ca-certificates \
    gnupg \
    lsb-release

# Install Podman
echo "Installing Podman..."
apt-get install -y podman podman-compose

# Verify Podman installation
podman --version
podman-compose --version

# Configure firewall
echo "Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

# Configure fail2ban
echo "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# Create app user (optional, for better security)
echo "Creating app user..."
if ! id "appuser" &>/dev/null; then
    useradd -m -s /bin/bash appuser
    usermod -aG sudo appuser
    echo "Created user 'appuser'. Set password with: passwd appuser"
fi

# Create app directory
echo "Creating app directory..."
mkdir -p /opt/fullstack-app
chown -R appuser:appuser /opt/fullstack-app

# Create systemd service
echo "Creating systemd service..."
cat > /etc/systemd/system/fullstack-app.service << 'EOF'
[Unit]
Description=Full-Stack Application
After=network.target

[Service]
Type=simple
User=appuser
Group=appuser
WorkingDirectory=/opt/fullstack-app
ExecStart=/usr/bin/podman-compose -f infrastructure/podman/compose.yml -f infrastructure/podman/compose.prod.yml up
ExecStop=/usr/bin/podman-compose -f infrastructure/podman/compose.yml -f infrastructure/podman/compose.prod.yml down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable fullstack-app

# Setup log rotation
echo "Setting up log rotation..."
cat > /etc/logrotate.d/fullstack-app << 'EOF'
/opt/fullstack-app/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 appuser appuser
    sharedscripts
}
EOF

# Create logs directory
mkdir -p /opt/fullstack-app/logs
chown -R appuser:appuser /opt/fullstack-app/logs

echo ""
echo "=== VPS Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Set password for appuser: passwd appuser"
echo "2. Copy your SSH public key: ssh-copy-id appuser@your-vps-ip"
echo "3. Upload your application to /opt/fullstack-app"
echo "4. Create .env file in /opt/fullstack-app"
echo "5. Run deployment: ./infrastructure/scripts/deploy.sh"
echo ""
echo "SSL Setup:"
echo "1. Point your domain to this VPS IP"
echo "2. Run: ./infrastructure/scripts/setup-ssl.sh your-domain.com"
echo ""
