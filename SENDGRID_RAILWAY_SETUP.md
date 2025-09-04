# SendGrid + Railway Setup Guide

## Overview
This guide will help you set up SendGrid as your email provider for Railway deployment to resolve the Gmail SMTP timeout issues.

## Prerequisites
- SendGrid account (free tier available)
- Railway deployment access
- Your SendGrid API key: `SG.b_b41xtvRu20c7ZSl_VunA.Rv1d7o7IrrWbzskrfFvrQhFxaiQ_ZYbyNBuKQbHMCw`

## Step 1: Configure Railway Environment Variables

Add these environment variables to your Railway project:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.b_b41xtvRu20c7ZSl_VunA.Rv1d7o7IrrWbzskrfFvrQhFxaiQ_ZYbyNBuKQbHMCw

# Keep existing SMTP config as fallback (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# Test email for debugging
TEST_EMAIL=your-test-email@gmail.com
```

## Step 2: Verify SendGrid Sender Identity

1. **Go to SendGrid Dashboard** → Settings → Sender Authentication
2. **Verify Single Sender** (recommended for testing):
   - Add your email address (e.g., `noreply@yourdomain.com`)
   - Check your email and click the verification link
3. **Or verify Domain** (for production):
   - Add your domain
   - Add the required DNS records

## Step 3: Test SendGrid Locally

Before deploying to Railway, test SendGrid locally:

```bash
# Set environment variable
export SENDGRID_API_KEY="SG.b_b41xtvRu20c7ZSl_VunA.Rv1d7o7IrrWbzskrfFvrQhFxaiQ_ZYbyNBuKQbHMCw"
export TEST_EMAIL="your-test-email@gmail.com"

# Test SendGrid
npm run test-sendgrid
```

Expected output:
```
✅ SendGrid API key found
✅ SendGrid service initialized successfully
✅ SendGrid test email sent successfully
✅ SendGrid OTP email sent successfully
```

## Step 4: Deploy to Railway

1. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Add SendGrid email service with fallback support"
   git push origin feat/eventCancel
   ```

2. **Railway will automatically deploy** the updated code

## Step 5: Test on Railway

After deployment, test the email functionality:

### Test 1: SendGrid Direct Test
```bash
# SSH into Railway (if available) or use Railway CLI
railway run npm run test-sendgrid
```

### Test 2: Event Cancellation OTP
```bash
curl -X POST https://your-railway-app.railway.app/api/events/68b842edcabe0a691d96d7ce/cancel/request-otp \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json"
```

### Test 3: Monitor Logs
```bash
railway logs --tail
```

Look for these success messages:
```
✅ SendGrid service initialized for OTP service
✅ Event cancellation OTP sent successfully via SendGrid to email: user@example.com
```

## How It Works

### Email Service Priority
1. **Primary**: Nodemailer (Gmail SMTP) - tries first
2. **Fallback**: SendGrid - automatically used if nodemailer fails
3. **Error Handling**: Comprehensive retry logic with both services

### Event Cancellation Flow
1. User requests event cancellation OTP
2. System tries to send email via nodemailer
3. If nodemailer fails (timeout/connection error):
   - System automatically switches to SendGrid
   - Sends the same OTP email via SendGrid
   - Logs the fallback usage
4. User receives OTP email successfully

## Monitoring and Troubleshooting

### Success Indicators
```
info: SendGrid service initialized for OTP service
info: Event cancellation OTP sent successfully via SendGrid to email: user@example.com
```

### Error Indicators
```
error: Both nodemailer and SendGrid failed
error: SendGrid service not available, nodemailer failed
```

### Common Issues

#### Issue: SendGrid API Key Invalid
**Solution**: Verify the API key in SendGrid dashboard and ensure it has "Mail Send" permissions

#### Issue: Sender Not Verified
**Solution**: Verify your sender email/domain in SendGrid dashboard

#### Issue: Rate Limiting
**Solution**: SendGrid free tier has limits. Consider upgrading or implementing email queuing

## SendGrid Free Tier Limits
- **100 emails/day** for free accounts
- **40,000 emails/month** for verified accounts
- **Rate limit**: 100 emails/hour

## Production Recommendations

### 1. Upgrade SendGrid Plan
- **Essentials**: $19.95/month for 50,000 emails
- **Pro**: $89.95/month for 100,000 emails

### 2. Implement Email Queuing
- Use the existing `EmailQueueService` for better reliability
- Queue emails during high traffic periods

### 3. Add Email Analytics
- Monitor delivery rates
- Track bounce rates
- Set up alerts for failures

### 4. Domain Authentication
- Verify your domain in SendGrid
- Set up SPF, DKIM, and DMARC records
- Improves deliverability and reduces spam folder placement

## Testing Commands

```bash
# Test SendGrid locally
npm run test-sendgrid

# Test all email configurations
npm run railway-email-diagnostic

# Test Railway deployment
railway run npm run test-sendgrid

# Monitor Railway logs
railway logs --tail
```

## Expected Results

After successful setup, you should see:

1. **Local Testing**: SendGrid emails sent successfully
2. **Railway Deployment**: Event cancellation OTP emails working
3. **Logs**: Clear indication of which email service was used
4. **User Experience**: Reliable OTP delivery for event cancellation

## Support

If you encounter issues:

1. **Check SendGrid Dashboard**: Monitor email delivery and bounces
2. **Verify Environment Variables**: Ensure all variables are set in Railway
3. **Test Locally First**: Use `npm run test-sendgrid` before deploying
4. **Monitor Logs**: Use `railway logs --tail` to see real-time issues

## Next Steps

1. ✅ Set up SendGrid environment variables in Railway
2. ✅ Deploy the updated code
3. ✅ Test event cancellation OTP functionality
4. ✅ Monitor email delivery success rates
5. 🔄 Consider upgrading SendGrid plan for production
6. 🔄 Implement email analytics and monitoring
