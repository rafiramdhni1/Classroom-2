#!/bin/bash
# ============================================
# SMK TKJ Akademik - VPS Deployment Script
# ============================================
# Usage: bash deploy.sh
# ============================================

set -e

echo ""
echo "========================================"
echo "  SMK TKJ Akademik - VPS Deploy"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Config
APP_DIR="/opt/smk-akademik"
REPO_URL="https://github.com/YOUR_USERNAME/smk-akademik.git"

# ============================================
# 1. Install Docker
# ============================================
echo -e "${YELLOW}[1/7] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}[OK] Docker installed${NC}"
else
    echo -e "${GREEN}[OK] Docker already installed${NC}"
fi

# ============================================
# 2. Install Docker Compose
# ============================================
echo -e "${YELLOW}[2/7] Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    apt install -y docker-compose-plugin
    echo -e "${GREEN}[OK] Docker Compose installed${NC}"
else
    echo -e "${GREEN}[OK] Docker Compose already installed${NC}"
fi

# ============================================
# 3. Clone / Pull Repository
# ============================================
echo -e "${YELLOW}[3/7] Getting source code...${NC}"
if [ -d "$APP_DIR" ]; then
    cd $APP_DIR
    git pull origin main
    echo -e "${GREEN}[OK] Code updated${NC}"
else
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
    echo -e "${GREEN}[OK] Repository cloned${NC}"
fi

# ============================================
# 4. Setup Environment
# ============================================
echo -e "${YELLOW}[4/7] Setting up environment...${NC}"
if [ ! -f "$APP_DIR/backend/.env.production" ]; then
    echo -e "${RED}[WARN] .env.production not found!${NC}"
    echo "Please create $APP_DIR/backend/.env.production first."
    echo "Template: $APP_DIR/backend/.env.example"
    exit 1
fi

# Copy production env
cp $APP_DIR/backend/.env.production $APP_DIR/backend/.env
echo -e "${GREEN}[OK] Environment configured${NC}"

# ============================================
# 5. Build & Start Containers
# ============================================
echo -e "${YELLOW}[5/7] Building and starting containers...${NC}"
docker-compose down 2>/dev/null || true
docker-compose up -d --build
echo -e "${GREEN}[OK] Containers started${NC}"

# ============================================
# 6. Wait for MongoDB
# ============================================
echo -e "${YELLOW}[6/7] Waiting for MongoDB...${NC}"
sleep 10
echo -e "${GREEN}[OK] MongoDB ready${NC}"

# ============================================
# 7. Setup Telegram Webhook
# ============================================
echo -e "${YELLOW}[7/7] Setting up Telegram webhook...${NC}"
source $APP_DIR/backend/.env
DOMAIN=$(echo $FRONTEND_URL | sed 's|https://||' | sed 's|http://||')
WEBHOOK_URL="https://$DOMAIN/api/webhook/telegram"

curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook?drop_pending_updates=true" > /dev/null
curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"$WEBHOOK_URL\"}" > /dev/null
echo -e "${GREEN}[OK] Webhook set: $WEBHOOK_URL${NC}"

# ============================================
# Done
# ============================================
echo ""
echo "========================================"
echo -e "${GREEN}  Deploy selesai!${NC}"
echo "========================================"
echo ""
echo "Website: $FRONTEND_URL"
echo "API:     $FRONTEND_URL/api/health"
echo "Webhook: $WEBHOOK_URL"
echo ""
echo "Commands:"
echo "  docker-compose logs -f        # Lihat log"
echo "  docker-compose restart        # Restart"
echo "  docker-compose down           # Stop"
echo "  docker-compose up -d --build  # Rebuild"
echo ""
