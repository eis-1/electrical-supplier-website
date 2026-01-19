#!/bin/bash

# Production Secrets Generator
# Generates strong random secrets for production deployment

echo "=== Production Secrets Generator ==="
echo ""
echo "Copy these values to your production .env file"
echo "NEVER commit these secrets to version control!"
echo ""
echo "-------------------------------------------"
echo ""

echo "# JWT Secrets (Keep these private!)"
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
echo "JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
echo "COOKIE_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
echo ""

echo "# Admin Password (CHANGE DEFAULT IMMEDIATELY)"
echo "# Set SEED_ADMIN_PASSWORD to a strong value (do not commit it)"
echo "# Generate bcrypt hash: node -e \"const bcrypt = require('bcryptjs'); bcrypt.hash('YOUR_PASSWORD', 12).then(console.log)\""
echo ""

echo "# Database Password (if using PostgreSQL)"
echo "DB_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")"
echo ""

echo "-------------------------------------------"
echo ""
echo "⚠️  SECURITY CHECKLIST:"
echo "1. Store secrets in secure password manager"
echo "2. Use different secrets for each environment"
echo "3. Rotate secrets regularly (every 90 days)"
echo "4. Never share secrets via email/chat"
echo "5. Use environment variables or secret management service"
echo ""
echo "📚 See PRODUCTION_SETUP.md for complete deployment guide"
