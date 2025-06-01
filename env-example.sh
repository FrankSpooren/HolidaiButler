# HolidAIButler Environment Configuration
# Copy this file to .env and fill in your actual values

# ==============================================
# APPLICATION SETTINGS
# ==============================================
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# ==============================================
# DATABASE CONFIGURATION
# ==============================================
# MongoDB Connection String
# Local: mongodb://localhost:27017/holidaibutler
# MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/holidaibutler
MONGODB_URI=mongodb://localhost:27017/holidaibutler

# Redis Connection (for caching and sessions)
# Local: redis://localhost:6379
# Redis Cloud: redis://username:password@host:port
REDIS_URL=redis://localhost:6379

# ==============================================
# AI SERVICES
# ==============================================
# Claude AI API Key (Required)
# Get from: https://console.anthropic.com/
CLAUDE_API_KEY=your_claude_api_key_here

# OpenAI API Key (Optional - for fallback)
OPENAI_API_KEY=your_openai_api_key_here

# ==============================================
# AUTHENTICATION SERVICES
# ==============================================
# JWT Secret for token signing (Generate a strong random string)
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random

# JWT Refresh Secret
JWT_REFRESH_SECRET=your_refresh_token_secret_here

# Google OAuth Configuration
# Get from: https://console.developers.google.com/
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Facebook OAuth Configuration
# Get from: https://developers.facebook.com/
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here

# Apple OAuth Configuration (iOS)
APPLE_CLIENT_ID=your_apple_client_id_here
APPLE_TEAM_ID=your_apple_team_id_here
APPLE_KEY_ID=your_apple_key_id_here
APPLE_PRIVATE_KEY=your_apple_private_key_here

# ==============================================
# EXTERNAL APIS
# ==============================================
# Weather API (OpenWeatherMap)
# Get from: https://openweathermap.org/api
WEATHER_API_KEY=your_weather_api_key_here

# Google Maps API (for geocoding and places)
# Get from: https://console.cloud.google.com/
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Stripe Payment Processing (for subscriptions)
# Get from: https://dashboard.stripe.com/
STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# ==============================================
# EMAIL SERVICES
# ==============================================
# SMTP Configuration for sending emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here

# SendGrid (Alternative email service)
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=noreply@holidaibutler.com

# ==============================================
# FILE STORAGE
# ==============================================
# AWS S3 Configuration (for image uploads)
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=eu-west-1
AWS_S3_BUCKET=holidaibutler-uploads

# Cloudinary (Alternative image storage)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# ==============================================
# MONITORING & ANALYTICS
# ==============================================
# Sentry for error tracking
SENTRY_DSN=your_sentry_dsn_here

# Google Analytics
GA_TRACKING_ID=UA-your-tracking-id-here

# Mixpanel Analytics
MIXPANEL_TOKEN=your_mixpanel_token_here

# ==============================================
# DEVELOPMENT SETTINGS
# ==============================================
# Enable/disable features for development
DEBUG_MODE=true
ENABLE_SWAGGER=true
ENABLE_CORS=true
LOG_LEVEL=debug

# API Rate Limiting (requests per window)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ==============================================
# PRODUCTION SETTINGS
# ==============================================
# SSL Configuration (for production)
SSL_CERT_PATH=/path/to/ssl/cert.pem
SSL_KEY_PATH=/path/to/ssl/private.key

# Domain Configuration
DOMAIN=holidaibutler.com
API_DOMAIN=api.holidaibutler.com

# ==============================================
# COSTA BLANCA SPECIFIC
# ==============================================
# DMO Partnership Configuration
DMO_API_KEY=your_dmo_api_key_here
DMO_PARTNER_ID=your_dmo_partner_id_here

# Local Business APIs
BOOKING_PARTNER_API_KEY=your_booking_partner_key_here
RESTAURANT_PARTNER_API_KEY=your_restaurant_partner_key_here

# ==============================================
# MOBILE APP CONFIGURATION
# ==============================================
# Push Notifications
FCM_SERVER_KEY=your_fcm_server_key_here
FCM_SENDER_ID=your_fcm_sender_id_here

# App Store Configuration
IOS_APP_ID=your_ios_app_id_here
ANDROID_PACKAGE_NAME=com.holidaibutler.app

# ==============================================
# SECURITY SETTINGS
# ==============================================
# Session Configuration
SESSION_SECRET=your_session_secret_here
SESSION_NAME=holidaibutler_session
SESSION_MAX_AGE=86400000

# CSRF Protection
CSRF_SECRET=your_csrf_secret_here

# ==============================================
# FEATURE FLAGS
# ==============================================
# Enable/disable features
ENABLE_VOICE_CHAT=true
ENABLE_IMAGE_RECOGNITION=true
ENABLE_BOOKING_INTEGRATION=true
ENABLE_OFFLINE_MODE=true
ENABLE_PUSH_NOTIFICATIONS=true

# ==============================================
# BACKUP & MAINTENANCE
# ==============================================
# Database Backup
BACKUP_FREQUENCY=daily
BACKUP_RETENTION_DAYS=30
BACKUP_S3_BUCKET=holidaibutler-backups

# Maintenance Mode
MAINTENANCE_MODE=false
MAINTENANCE_MESSAGE="We'll be back soon! HolidAIButler is undergoing scheduled maintenance."

# ==============================================
# TESTING ENVIRONMENT
# ==============================================
# Test Database
TEST_MONGODB_URI=mongodb://localhost:27017/holidaibutler_test
TEST_REDIS_URL=redis://localhost:6379/1

# Mock API Keys for Testing
TEST_CLAUDE_API_KEY=test_claude_key
TEST_WEATHER_API_KEY=test_weather_key