# Railway Email Setup Guide

## Problem
Email verification is working locally but failing on Railway with connection timeout errors.

## Root Cause
Railway's network environment has different restrictions and timeout policies compared to local development.

## Solutions

### 1. Environment Variables Setup

Make sure these environment variables are set in Railway:

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# Optional: Test email for debugging
TEST_EMAIL=your-test-email@gmail.com
```

### 2. Gmail App Password Setup

If using Gmail, you MUST use an App Password instead of your regular password:

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Generate an App Password for "Mail"
4. Use the generated 16-character password as `SMTP_PASS`

### 3. Alternative Email Providers

If Gmail continues to have issues on Railway, consider these alternatives:

#### Option A: SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### Option B: Mailgun
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

#### Option C: AWS SES
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
```

### 4. Testing Email Configuration

Run the Railway email test script:

```bash
npm run test-email-railway
```

This will:
- Check all environment variables
- Test DNS resolution
- Test network connectivity
- Test SMTP connection
- Send a test email

### 5. Railway-Specific Optimizations

The code has been updated with Railway-specific optimizations:

- Reduced timeout values (15s instead of 30s)
- Disabled connection pooling
- Added retry logic (2 attempts)
- Better error handling and logging

### 6. Troubleshooting

#### Connection Timeout
- Check if the SMTP port is blocked by Railway
- Try different ports (587, 465, 25)
- Verify the SMTP host is accessible

#### Authentication Failed
- Ensure you're using an App Password for Gmail
- Check if 2FA is enabled
- Verify email and password are correct

#### DNS Resolution Failed
- Check if the SMTP host is correct
- Try using IP address instead of hostname
- Verify network connectivity

### 7. Monitoring

Check Railway logs for email-related errors:

```bash
railway logs
```

Look for these log messages:
- `Email transporter initialized successfully`
- `Verification email sent successfully`
- `Failed to send verification email`
- `Connection timeout`

### 8. Fallback Strategy

If email continues to fail, consider implementing:

1. **Email Queue System**: Queue emails and retry later
2. **Alternative Email Service**: Use a different provider
3. **SMS Verification**: Add SMS as backup verification method
4. **Manual Verification**: Allow admin to manually verify users

## Quick Fix Checklist

- [ ] Set all required environment variables in Railway
- [ ] Use Gmail App Password (not regular password)
- [ ] Test email configuration with `npm run test-email-railway`
- [ ] Check Railway logs for specific error messages
- [ ] Deploy updated code with Railway optimizations
- [ ] Test super admin registration again

## Railway-Specific Troubleshooting

### 1. Test Email Functionality on Railway

After deploying, test the email functionality using the new endpoint:

```bash
curl -X POST https://your-railway-app.railway.app/health/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "your-test-email@gmail.com"}'
```

### 2. Run Railway Debug Script

If you have access to Railway's shell, run the debug script:

```bash
npm run railway-debug
```

### 3. Check Railway Environment Variables

Make sure these are set in Railway dashboard:
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- `SMTP_USER=your-email@gmail.com`
- `SMTP_PASS=your-app-password`
- `SMTP_FROM=your-email@gmail.com`

### 4. Common Railway Email Issues

#### Issue: Connection Timeout
**Solution**: The code now uses shorter timeouts (15s) and disables connection pooling

#### Issue: Port Blocked
**Solution**: Try different ports in Railway:
- Port 587 (recommended)
- Port 465 (SSL)
- Port 25 (fallback)

#### Issue: Network Restrictions
**Solution**: Railway may block certain SMTP providers. Consider:
- Using a different email service (SendGrid, Mailgun)
- Contacting Railway support about SMTP restrictions

### 5. Alternative Email Services for Railway

If Gmail continues to fail on Railway, try these alternatives:

#### SendGrid (Recommended for Railway)
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### Mailgun
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

### 6. Monitoring Railway Logs

Check Railway logs for email-related errors:
```bash
railway logs --tail
```

Look for these specific error patterns:
- `Connection timeout`
- `ETIMEDOUT`
- `ECONNREFUSED`
- `Authentication failed`
