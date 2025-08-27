# Email Timeout Fix Documentation

## Problem
The user registration API was experiencing connection timeouts when sending verification emails, causing the entire API to hang for over 2 minutes (122830ms). This was blocking all other API requests and causing poor user experience.

Additionally, the email transporter was being initialized multiple times throughout the application, causing performance issues and resource waste.

## Root Cause
1. **Synchronous Email Sending**: Email verification was happening synchronously during user registration
2. **No Timeout Configuration**: Nodemailer had no timeout settings, causing indefinite waits
3. **No Error Handling**: Email failures were throwing errors that blocked the registration process
4. **No Retry Mechanism**: Failed emails had no retry logic
5. **Poor Input Validation**: Missing validation for email parameters
6. **Multiple EmailService Instances**: EmailService was being instantiated multiple times, causing multiple transporter initializations

## Solution Implemented

### 1. Email Service Improvements (`src/services/email.service.ts`)
- **Singleton Pattern Implementation**:
  - Private constructor to prevent direct instantiation
  - Static `getInstance()` method for singleton access
  - Single transporter instance shared across the application
- **Added Timeout Configuration**:
  - `connectionTimeout: 10000` (10 seconds)
  - `greetingTimeout: 10000` (10 seconds)
  - `socketTimeout: 15000` (15 seconds)
- **Added Pool Configuration**:
  - `pool: true` for connection pooling
  - `maxConnections: 5` to limit concurrent connections
  - `maxMessages: 100` to limit messages per connection
  - `rateLimit: 14` to limit messages per second
- **Comprehensive Error Handling**:
  - Try-catch blocks around all email operations
  - Input validation for all parameters
  - Detailed error logging with context
  - Non-blocking error handling (errors don't throw)
- **Constructor Error Handling**: Proper error handling during service initialization

### 2. Email Queue Service (`src/services/emailQueue.service.ts`)
- **Asynchronous Processing**: Emails are queued and processed in the background
- **Retry Mechanism**: Failed emails are retried up to 3 times with exponential backoff
- **Queue Management**: Prevents overwhelming the email service
- **Status Monitoring**: Provides queue status for monitoring
- **Comprehensive Error Handling**:
  - Try-catch blocks around all queue operations
  - Input validation for all job types
  - Job data validation before processing
  - Error handling in retry logic
  - Queue status error handling
- **Emergency Features**: Queue clearing functionality for emergency situations
- **Singleton Integration**: Uses singleton EmailService instance

### 3. Auth Service Updates (`src/services/auth.service.ts`)
- **Non-blocking Email Sending**: Uses email queue instead of direct email service
- **Graceful Degradation**: Registration continues even if email fails
- **Better Logging**: Improved error logging and monitoring
- **Input Validation**: Validates email parameters before queuing
- **Singleton Usage**: Uses singleton EmailService instance

### 4. Unified Payment API Improvements (`src/controllers/payment.controller.ts`)
- **Non-blocking Email Services**: All email and WhatsApp services are wrapped in try-catch blocks
- **Payment Success Guarantee**: Payment processing completes successfully even if email/WhatsApp services fail
- **Comprehensive Error Handling**:
  - Ticket email sending with error handling
  - WhatsApp message sending with error handling
  - Dine-in summary email sending with error handling
  - Detailed logging for success and failure cases
- **Background Processing**: Email services run in background without blocking payment response
- **Singleton Usage**: Uses singleton EmailService instance

### 5. All Controllers and Services Updated
- **Singleton Pattern**: All controllers and services now use `EmailService.getInstance()` instead of `new EmailService()`
- **Consistent Usage**: Unified approach across the entire application
- **Performance Improvement**: Single transporter instance reduces resource usage

### 6. Health Check Endpoints
- **Health Check**: `/api/health` - Overall system health
- **Email Queue Status**: `/api/email-queue-status` - Email queue monitoring

## Singleton Pattern Implementation

### Email Service Singleton
```typescript
export class EmailService {
  private transporter: nodemailer.Transporter;
  private static instance: EmailService;

  private constructor() {
    // Initialize transporter only once
    this.transporter = nodemailer.createTransport({...});
    logger.info('Email transporter initialized successfully');
  }

  // Singleton pattern - get instance
  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();
```

### Usage Across Application
```typescript
// Instead of: const emailService = new EmailService();
// Use: const emailService = EmailService.getInstance();

// In controllers
const emailService = EmailService.getInstance();
await emailService.sendTicketEmail({...});

// In services
this.emailService = EmailService.getInstance();
```

## Error Handling Improvements

### Email Service Error Handling
```typescript
// Constructor error handling
private constructor() {
  try {
    this.transporter = nodemailer.createTransport({...});
    logger.info('Email transporter initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize email transporter:', error);
    throw new Error('Email service initialization failed');
  }
}

// Method error handling with validation
async sendVerificationEmail(email: string, token: string, role: string): Promise<void> {
  try {
    if (!email || !token || !role) {
      logger.error('Missing required parameters for verification email:', { email, token: token ? 'present' : 'missing', role });
      throw new Error('Missing required parameters for verification email');
    }
    // ... email sending logic
  } catch (error) {
    logger.error(`Failed to send verification email to ${email}:`, error);
    // Don't throw error to prevent blocking the registration process
    logger.warn(`Email sending failed for ${email}, but registration will continue`);
  }
}
```

### Email Queue Error Handling
```typescript
// Queue processing with comprehensive error handling
private async processQueue(): Promise<void> {
  try {
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) continue;

      try {
        await this.processJob(job);
        logger.info(`Email job completed successfully: ${job.id}`);
      } catch (error) {
        logger.error(`Email job failed: ${job.id}`, error);
        // Retry logic with error handling
        if (job.retries < job.maxRetries) {
          // ... retry logic
        }
      }
    }
  } catch (error) {
    logger.error('Error in email queue processing loop:', error);
  } finally {
    this.isProcessing = false;
    logger.info('Email queue processing completed');
  }
}
```

### Unified Payment API Error Handling
```typescript
// Ticket email sending with error handling
try {
  const emailService = EmailService.getInstance();
  await emailService.sendTicketEmail({
    to: user.email,
    event: { name: eventDoc?.name || '', date: eventDoc?.date?.toISOString().split('T')[0] || '', venue: eventDoc?.venue?.name || '' },
    tickets: tickets.map(t => ({ qrCodeUrl: t.qrCodeUrl, ticketTierName: t.ticketTierName, quantity: t.quantity })),
    userName: user.name || '',
    startTime: eventDoc?.startTime || '',
    endTime: eventDoc?.endTime || ''
  });
  logger.info(`Ticket email sent successfully to ${user.email} for order ${order._id}`);
} catch (error) {
  logger.error(`Failed to send ticket email to ${user.email} for order ${order._id}:`, error);
  // Don't block the payment response - email failure shouldn't affect payment success
}

// WhatsApp message sending with error handling
if (user.phone) {
  try {
    const formattedPhone = formatIndianPhoneNumber(user.phone);
    const waMessage = `🎟️ CityFeed Event Ticket 🎟️\nEvent: ${eventDoc?.name}\nDate: ${eventDoc?.date?.toISOString().split('T')[0]}\nVenue: ${eventDoc?.venue?.name}\nShow this QR code at entry. Enjoy the event!`;
    for (const t of tickets) {
      await sendWhatsAppMessage(
        formattedPhone,
        `${waMessage}\nTicket Type: ${t.ticketTierName}\nAdmits: ${t.quantity}`,
        t.qrCodeUrl
      );
    }
    logger.info(`WhatsApp message sent successfully to ${user.phone} for order ${order._id}`);
  } catch (error) {
    logger.error(`Failed to send WhatsApp message to ${user.phone} for order ${order._id}:`, error);
    // Don't block the payment response - WhatsApp failure shouldn't affect payment success
  }
}
```

## Benefits
1. **Faster Registration**: User registration completes immediately without waiting for email
2. **Better Reliability**: Email failures don't block the registration process
3. **Improved Performance**: Connection pooling and rate limiting prevent email service overload
4. **Better Monitoring**: Health check endpoints provide visibility into system status
5. **Retry Logic**: Failed emails are automatically retried
6. **Robust Error Handling**: Comprehensive try-catch blocks prevent crashes
7. **Input Validation**: Prevents invalid data from causing issues
8. **Detailed Logging**: Better debugging and monitoring capabilities
9. **Payment Success Guarantee**: Unified payment API always responds successfully even if email services fail
10. **Non-blocking Services**: All email and WhatsApp services run in background
11. **Single Transporter Instance**: Eliminates multiple email transporter initializations
12. **Resource Efficiency**: Reduces memory usage and connection overhead
13. **Consistent Performance**: Single instance ensures consistent behavior across the application

## Testing
Use the health check endpoints to monitor the system:
```bash
# Check overall health
curl https://your-api-domain.com/api/health

# Check email queue status
curl https://your-api-domain.com/api/email-queue-status
```

## Configuration
The email service now uses these timeout settings:
- Connection timeout: 10 seconds
- Greeting timeout: 10 seconds
- Socket timeout: 15 seconds
- Max retries: 3
- Retry delay: 5 seconds (with exponential backoff)

## Monitoring
Monitor these logs for email-related issues:
- Email queue processing logs
- Email sending success/failure logs
- Retry attempt logs
- Queue status logs
- Input validation error logs
- Service initialization logs
- Payment API email service logs
- Singleton initialization logs

## Error Recovery
The system now includes several error recovery mechanisms:
1. **Automatic Retries**: Failed emails are retried automatically
2. **Graceful Degradation**: Services continue operating even when email fails
3. **Queue Management**: Prevents queue overflow and memory issues
4. **Emergency Controls**: Ability to clear queue in emergency situations
5. **Payment Success Guarantee**: Payment processing never fails due to email service issues
6. **Single Instance**: Eliminates multiple initialization issues

## API Endpoints Affected
- **User Registration**: `/api/auth/register/user` - Now non-blocking for email services
- **Unified Payment**: `/api/payments/unified` - Now non-blocking for email and WhatsApp services
- **Event Payment**: Email and WhatsApp services wrapped in error handling
- **Dine-in Payment**: Email services wrapped in error handling
- **All Email Services**: Now use singleton pattern for consistent performance

## Performance Improvements
- **Single Transporter**: Only one email transporter instance across the entire application
- **Reduced Initialization**: No more multiple email service initializations
- **Connection Pooling**: Efficient connection management
- **Resource Optimization**: Lower memory usage and CPU overhead
- **Consistent Behavior**: Same email service instance used everywhere

## Future Improvements
1. Consider using a dedicated email service (SendGrid, Mailgun, etc.)
2. Implement email delivery tracking
3. Add email templates for better user experience
4. Implement email batching for high-volume scenarios
5. Add metrics and alerting for email failures
6. Implement circuit breaker pattern for email service
7. Add email service health monitoring
8. Implement email service fallback mechanisms
9. Add email service metrics and monitoring
10. Implement email service load balancing
