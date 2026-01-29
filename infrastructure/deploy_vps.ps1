
# Deploy Pixy Voice Runtime to Hostinger VPS
$VPS_USER = "root"
$VPS_IP = "31.97.142.27"
$TARGET_DIR = "/opt/pixy-voice-runtime"

Write-Host "🚀 Deploying to $VPS_USER@$VPS_IP..." -ForegroundColor Cyan

# 0. Configuration (HARDCODED SECRET FOR SIMPLICITY)
# 0. Configuration
$API_SECRET = "pixy_v2_secret_reset_correct_encoding_887766"

# 1. Prepare Local .env (Force ASCII/UTF8)
Write-Host "1. Creating local temp .env..."
$EnvContent = "API_SECRET=$API_SECRET"
[System.IO.File]::WriteAllText("infrastructure/voice-gateway/.env.temp", $EnvContent)

# 2. Create Remote Directory
Write-Host "2. Creating remote directory..."
ssh $VPS_USER@$VPS_IP "mkdir -p $TARGET_DIR/voice-gateway"

# 3. Copy Files (Including .env)
Write-Host "3. Uploading files..."
scp infrastructure/docker-compose.yml "$($VPS_USER)@$($VPS_IP):$($TARGET_DIR)/"
scp infrastructure/voice-gateway/Dockerfile "$($VPS_USER)@$($VPS_IP):$($TARGET_DIR)/voice-gateway/"
scp infrastructure/voice-gateway/index.js "$($VPS_USER)@$($VPS_IP):$($TARGET_DIR)/voice-gateway/"
scp infrastructure/voice-gateway/package.json "$($VPS_USER)@$($VPS_IP):$($TARGET_DIR)/voice-gateway/"
# Copy the temp .env to the destination as .env
scp infrastructure/voice-gateway/.env.temp "$($VPS_USER)@$($VPS_IP):$($TARGET_DIR)/.env"

# 4. Cleanup Local
Remove-Item "infrastructure/voice-gateway/.env.temp"

# 3. Build and Run
Write-Host "3. Building and Starting Service..."
ssh $VPS_USER@$VPS_IP "cd $TARGET_DIR && docker compose up -d --build"

Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "Verifying Logs (Check Secret Length)..."
ssh $VPS_USER@$VPS_IP "docker logs pixy-voice-runtime --tail 5"
