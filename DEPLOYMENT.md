# Deployment Guide

This guide covers deploying the Healthcare Reminder Chatbot system to production.

## Prerequisites

- Domain name
- SSL certificate
- Server with Node.js 18+
- Supabase project
- Twilio account with approved WhatsApp Business API (for production)

## Environment Setup

### 1. Production Environment Variables

Create a production `.env` file:

```env
# Production Configuration
NODE_ENV=production
PORT=3001

# Twilio Configuration (Production)
TWILIO_ACCOUNT_SID=your_production_twilio_sid
TWILIO_AUTH_TOKEN=your_production_twilio_token
TWILIO_PHONE_NUMBER=your_verified_twilio_number
TWILIO_WHATSAPP_NUMBER=whatsapp:your_approved_whatsapp_number

# Supabase Configuration (Production)
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_supabase_anon_key
SUPABASE_SERVICE_KEY=your_production_supabase_service_key

# Reminder Configuration
DEFAULT_REMINDER_DAYS_BEFORE=3
MAX_REMINDER_ATTEMPTS=3
REMINDER_INTERVAL_HOURS=24

# Clinic Information
CLINIC_NAME=Your Healthcare Clinic
CLINIC_ADDRESS=123 Health Street, City, State
CLINIC_PHONE=+1234567890
```

## Deployment Options

### Option 1: VPS/Dedicated Server

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx -y
```

#### 2. Application Deployment

```bash
# Clone repository
git clone <your-repository-url>
cd healthcare-reminder-chatbot

# Install dependencies
npm run setup

# Build applications
npm run build:all

# Start with PM2
pm2 start server/dist/server.js --name "healthcare-reminder"
pm2 startup
pm2 save
```

#### 3. Nginx Configuration

Create `/etc/nginx/sites-available/healthcare-reminder`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # Frontend (React app)
    location / {
        root /path/to/healthcare-reminder-chatbot/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/healthcare-reminder /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile

```dockerfile
# Multi-stage build
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci
RUN cd server && npm ci

# Copy source code
COPY . .

# Build applications
RUN npm run build:all

# Production stage
FROM node:18-alpine as production

WORKDIR /app

# Copy built applications
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/package.json ./server/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3001

CMD ["node", "server/dist/server.js"]
```

#### 2. Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - ./dist:/usr/share/nginx/html
    depends_on:
      - app
    restart: unless-stopped
```

#### 3. Deploy with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Update deployment
docker-compose pull
docker-compose up -d --build
```

### Option 3: Cloud Platforms

#### Heroku Deployment

1. Create `Procfile`:
```
web: node server/dist/server.js
```

2. Deploy:
```bash
heroku create your-app-name
heroku config:set NODE_ENV=production
# Set all environment variables
heroku config:set TWILIO_ACCOUNT_SID=your_sid
# ... other variables

git push heroku main
```

#### DigitalOcean App Platform

Create `app.yaml`:
```yaml
name: healthcare-reminder
services:
- name: api
  source_dir: /
  github:
    repo: your-username/healthcare-reminder-chatbot
    branch: main
  run_command: node server/dist/server.js
  build_command: npm run build:all
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  # Add other environment variables
```

## Database Migration

### Production Database Setup

1. **Supabase Production Project**:
   - Create a new Supabase project for production
   - Apply the database migration
   - Set up Row Level Security (RLS) policies

2. **Migration Command**:
```bash
# Using Supabase CLI
supabase db push --db-url "your-production-database-url"
```

## WhatsApp Business API Setup

### For Production Use

1. **Apply for WhatsApp Business API**:
   - Submit application through Twilio
   - Provide business verification documents
   - Wait for approval (can take several weeks)

2. **Configure Webhooks**:
   - Set delivery status webhook URL
   - Configure message webhook for two-way communication

3. **Message Templates**:
   - Submit message templates for approval
   - Use only approved templates in production

## Monitoring and Logging

### 1. Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs healthcare-reminder

# Application metrics
pm2 install pm2-server-monit
```

### 2. Error Tracking

Add error tracking service (e.g., Sentry):

```javascript
// In server.js
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "your-sentry-dsn",
});
```

### 3. Health Checks

Create health check endpoint:
```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## Security Considerations

### 1. Environment Security
- Use strong passwords for all services
- Rotate API keys regularly
- Use secrets management (AWS Secrets Manager, etc.)

### 2. Network Security
- Configure firewall rules
- Use HTTPS only
- Implement rate limiting

### 3. Application Security
- Validate all inputs
- Use CORS appropriately
- Implement authentication for admin features

## Backup and Recovery

### 1. Database Backups
- Enable automatic backups in Supabase
- Regular export of critical data
- Test restore procedures

### 2. Application Backups
- Version control for code
- Configuration backups
- Log retention policies

## Performance Optimization

### 1. Caching
- Implement Redis for session storage
- Cache frequently accessed data
- Use CDN for static assets

### 2. Database Optimization
- Index frequently queried columns
- Optimize database queries
- Monitor query performance

### 3. Scaling
- Horizontal scaling with load balancers
- Database read replicas
- Queue system for high-volume messaging

## Troubleshooting

### Common Issues

1. **Messages not sending**:
   - Check Twilio credentials
   - Verify phone number formats
   - Check account balance

2. **Database connection issues**:
   - Verify Supabase credentials
   - Check network connectivity
   - Review connection limits

3. **Scheduler not running**:
   - Check cron job configuration
   - Verify system timezone
   - Review error logs

### Logs Location
- Application logs: `/var/log/healthcare-reminder/`
- PM2 logs: `~/.pm2/logs/`
- Nginx logs: `/var/log/nginx/`

## Maintenance

### Regular Tasks
- Update dependencies monthly
- Review and rotate API keys quarterly
- Monitor system performance weekly
- Backup verification monthly

### Updates
```bash
# Update application
git pull origin main
npm run build:all
pm2 restart healthcare-reminder

# Update dependencies
npm audit fix
```

This deployment guide ensures a robust, secure, and scalable production environment for the Healthcare Reminder Chatbot system.