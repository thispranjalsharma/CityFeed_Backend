# Railway Email Timeout Solution

## Problem Summary
The event cancellation OTP email is failing on Railway with `Connection timeout` (ETIMEDOUT) errors when trying to connect to Gmail's SMTP server. This works locally but fails in Railway's environment.

## Root Causes
1. **Railway Network Restrictions**: Railway's network may block or throttle SMTP connections to Gmail
2. **Gmail SMTP Blocking**: Gmail may block connections from Railway's IP ranges
3. **Timeout Configuration**: Previous timeout settings were too aggressive for Railway's network
4. **No Retry Logic**: Single attempt failures caused complete email failures

## Solutions Implemented

### 1. Enhanced Email Service Configuration ✅
- **Reduced timeouts**: 10s connection, 10s greeting, 15s socket (from 15s/15s/20s)
- **Added SSLv3 cipher**: More compatible with Railway's network
- **Disabled keep-alive**: Prevents connection reuse issues
- **Enhanced TLS settings**: Better certificate handling

### 2. Improved Retry Logic ✅
- **3 retry attempts** with exponential backoff (2s, 4s, 6s)
- **Transporter recreation** on connection errors
- **Better error handling** with specific error code detection
- **Non-blocking failures** - process continues even if email fails

### 3. Railway Email Diagnostic Tool ✅
- **Multiple configuration testing**: Current, SendGrid, Gmail alternative ports
- **DNS resolution testing**: Network connectivity verification
- **Comprehensive logging**: Detailed error reporting

## Immediate Action Items

### Option 1: Switch to SendGrid (Recommended)
1. **Sign up for SendGrid** (free tier available)
2. **Create API key** with "Mail Send" permissions
3. **Update Railway environment variables**:
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASS=your-sendgrid-api-key-here
   SMTP_FROM=your-verified-sender-email@domain.com
   ```

### Option 2: Try Gmail Alternative Port
If you want to stick with Gmail, try port 465 with SSL:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

### Option 3: Test Current Configuration
Run the diagnostic tool to test all configurations:
```bash
npm run railway-email-diagnostic
```

## Testing Steps

### 1. Deploy Updated Code
```bash
git add .
git commit -m "Fix Railway email timeout issues with enhanced retry logic"
git push origin feat/eventCancel
```

### 2. Test Email Functionality
After deployment, test the event cancellation OTP:
```bash
curl -X POST https://your-railway-app.railway.app/api/events/68b842edcabe0a691d96d7ce/cancel/request-otp \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json"
```

### 3. Monitor Logs
Check Railway logs for improved error messages:
```bash
railway logs --tail
```

Look for:
- `Attempting to send email to ... (attempt 1/3)`
- `Connection error detected, recreating transporter...`
- `Generic email sent successfully to ... (attempt X)`

## Expected Improvements

### Before (Current Issue)
```
error: Failed to send email: Connection timeout {"code":"ETIMEDOUT","command":"CONN"}
warn: Email sending failed, but process will continue
```

### After (With Fixes)
```
info: Attempting to send email to user@example.com (attempt 1/3)
error: Failed to send email to user@example.com (attempt 1/3): Connection timeout
info: Waiting 2000ms before retry...
info: Connection error detected, recreating transporter...
info: Attempting to send email to user@example.com (attempt 2/3)
info: Generic email sent successfully to user@example.com (attempt 2)
```

## Fallback Strategies

If email continues to fail, consider:

1. **Email Queue System**: Already implemented in `emailQueue.service.ts`
2. **SMS Backup**: Use Twilio SMS as primary verification method
3. **Alternative Email Providers**: Mailgun, AWS SES, Postmark
4. **Manual Verification**: Admin panel for manual OTP verification

## Monitoring and Alerts

Set up monitoring for:
- Email success/failure rates
- Connection timeout frequency
- Retry attempt patterns
- Alternative verification method usage

## Long-term Recommendations

1. **Use SendGrid or similar service** for production email delivery
2. **Implement email queue system** for better reliability
3. **Add SMS as primary verification** method
4. **Set up email delivery monitoring** and alerts
5. **Consider email service redundancy** with multiple providers

## Quick Fix Checklist

- [x] Enhanced email service with better timeout handling
- [x] Added retry logic with exponential backoff
- [x] Created Railway email diagnostic tool
- [ ] Deploy updated code to Railway
- [ ] Test event cancellation OTP functionality
- [ ] Monitor logs for improved behavior
- [ ] Consider switching to SendGrid if issues persist

## Support Commands

```bash
# Test current email configuration
npm run railway-email-diagnostic

# Test specific email functionality
npm run test-email-railway

# Debug Railway environment
npm run railway-debug

# Check Railway logs
railway logs --tail
```
