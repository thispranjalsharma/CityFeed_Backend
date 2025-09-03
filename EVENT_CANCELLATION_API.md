# Event Cancellation API Documentation

## Overview
This API allows event organizers and event managers to cancel events with **OTP verification** and automatically notify ticket holders about the cancellation.

## Features
- **Secure OTP Verification**: Two-step cancellation process with email verification
- **Event Cancellation**: Mark events as cancelled with optional description and instructions
- **Automatic Notifications**: Send email notifications to all ticket holders
- **Cancellation Visibility**: Cancelled events remain visible in listings with cancellation details
- **Ticket Holder Management**: View list of users who have booked tickets for events
- **Booking Prevention**: Prevent new ticket bookings for cancelled events

## Security Features
- **OTP Verification Required**: All cancellations require email verification code
- **5-Minute Expiry**: OTP expires quickly for security
- **Email-Only Delivery**: OTP sent only to authenticated user's registered email
- **Two-Step Process**: Request OTP first, then verify and cancel
- **Rate Limiting**: Prevents abuse of OTP requests

## API Endpoints

### 1. Request OTP for Event Cancellation
**POST** `/api/events/{eventId}/cancel/request-otp`

**Step 1**: Request a verification code to be sent to your email.

**Authorization**: 
- `event_organizer` or `event_manager` role
- Must be the event creator or assigned manager

**Request Body**: None required

**Response**:
```json
{
  "success": true,
  "message": "OTP sent to your registered email for verification",
  "data": {
    "otpSent": true,
    "otpType": "email",
    "email": "user@example.com",
    "message": "Please check your email and enter the OTP to confirm event cancellation",
    "expiresIn": "5 minutes"
  }
}
```

### 2. Cancel Event (with OTP Verification)
**POST** `/api/events/{eventId}/cancel`

**Step 2**: Use the OTP received via email to complete the cancellation.

**Authorization**: 
- `event_organizer` or `event_manager` role
- Must be the event creator or assigned manager

**Request Body**:
```json
{
  "otp": "123456",
  "description": "Event cancelled due to unforeseen circumstances",
  "instructions": "Refunds will be processed within 5-7 business days"
}
```

**Required Fields**:
- `otp`: The verification code received via email

**Optional Fields**:
- `description`: Reason for cancellation
- `instructions`: Instructions for attendees

**Response**:
```json
{
  "success": true,
  "message": "Event cancelled successfully. 25 ticket holders will be notified via email.",
  "data": {
    "eventId": "68a71166fbbe748719b2120b",
    "isCancelled": true,
    "cancelledBy": "68a5a6b939fc3d7c3d7b1a71",
    "cancelledAt": "2025-09-03T10:30:00.000Z",
    "cancellationDescription": "Event cancelled due to unforeseen circumstances",
    "cancellationInstructions": "Refunds will be processed within 5-7 business days",
    "notificationsSent": 25
  }
}
```

### 3. Get Event Ticket Holders
**GET** `/api/events/{eventId}/ticket-holders?page=1&limit=20`

Retrieves a paginated list of users who have booked tickets for an event.

**Authorization**: 
- `event_organizer` or `event_manager` role
- Must be the event creator or assigned manager

**Response**:
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "68a71166fbbe748719b2120b",
      "name": "Tech Conference 2025",
      "date": "2025-10-15",
      "isCancelled": false
    },
    "ticketHolders": [
      {
        "ticketId": "68a71166fbbe748719b2120c",
        "orderId": "68a71166fbbe748719b2120d",
        "user": {
          "id": "68a5a6b939fc3d7c3d7b1a72",
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "+919876543210"
        },
        "ticketTier": {
          "id": "68a71166fbbe748719b2120e",
          "name": "Early Bird",
          "price": 500
        },
        "quantity": 2,
        "status": "active",
        "issuedAt": "2025-09-01T10:00:00.000Z",
        "qrCodeUrl": "https://example.com/qr.png"
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 20,
      "totalPages": 2
    }
  }
}
```

## Complete Cancellation Workflow

### Step-by-Step Process

1. **Authenticate User**
   ```bash
   # Ensure user is logged in with event_organizer or event_manager role
   Authorization: Bearer YOUR_JWT_TOKEN
   ```

2. **Request OTP**
   ```bash
   POST /api/events/{eventId}/cancel/request-otp
   # OTP sent to user's registered email
   ```

3. **Check Email**
   - Look for email with subject: "CityFeed Event Cancellation Verification Code"
   - Note the 6-digit verification code
   - **Important**: Code expires in 5 minutes

4. **Complete Cancellation**
   ```bash
   POST /api/events/{eventId}/cancel
   {
     "otp": "123456",
     "description": "Event cancelled due to unforeseen circumstances",
     "instructions": "Refunds will be processed within 5-7 business days"
   }
   ```

5. **Verification**
   - Event is marked as cancelled
   - All ticket holders receive email notifications
   - Cancellation details are recorded

### Example cURL Commands

#### Request OTP
```bash
curl -X POST \
  'http://localhost:3001/api/events/68a71166fbbe748719b2120b/cancel/request-otp' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'
```

#### Cancel Event with OTP
```bash
curl -X POST \
  'http://localhost:3001/api/events/68a71166fbbe748719b2120b/cancel' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "otp": "123456",
    "description": "Event cancelled due to unforeseen circumstances",
    "instructions": "Refunds will be processed within 5-7 business days"
  }'
```

## Cancellation Booking Prevention

### Overview
The system automatically prevents users from booking tickets for cancelled events at multiple levels:

1. **Order Creation**: Blocked when creating new orders
2. **WebSocket Booking Sessions**: Blocked when starting real-time booking sessions
3. **Payment Processing**: Blocked when processing payments for existing orders

### Implementation Details

#### 1. Order Creation Prevention
When a user tries to create an order for a cancelled event:

```json
{
  "success": false,
  "message": "Event booking not allowed. Event is cancelled.",
  "data": {
    "eventId": "68a71166fbbe748719b2120b",
    "eventName": "Tech Conference 2025",
    "isCancelled": true,
    "cancellationReason": "Event cancelled due to unforeseen circumstances",
    "cancellationInstructions": "Refunds will be processed within 5-7 business days"
  }
}
```

#### 2. WebSocket Booking Prevention
When a user tries to start a booking session for a cancelled event:

```json
{
  "message": "Event booking not allowed. Event is cancelled.",
  "data": {
    "eventId": "68a71166fbbe748719b2120b",
    "eventName": "Tech Conference 2025",
    "isCancelled": true,
    "cancellationReason": "Event cancelled due to unforeseen circumstances",
    "cancellationInstructions": "Refunds will be processed within 5-7 business days"
  }
}
```

#### 3. Payment Processing Prevention
When a user tries to pay for an order of a cancelled event:

```json
{
  "success": false,
  "message": "Event booking not allowed. Event is cancelled.",
  "data": {
    "eventId": "68a71166fbbe748719b2120b",
    "eventName": "Tech Conference 2025",
    "isCancelled": true,
    "cancellationReason": "Event cancelled due to unforeseen circumstances",
    "cancellationInstructions": "Refunds will be processed within 5-7 business days"
  }
}
```

### Error Handling
- **Status Code**: 400 Bad Request
- **Message**: Clear indication that booking is not allowed
- **Data**: Complete cancellation information for user reference

## Event Visibility After Cancellation

### Public Listings
Cancelled events remain visible in public listings with cancellation information:

```json
{
  "success": true,
  "data": [
    {
      "id": "68a71166fbbe748719b2120b",
      "name": "Tech Conference 2025",
      "date": "2025-10-15",
      "venue": "Convention Center",
      "isCancelled": true,
      "cancellationInfo": {
        "cancelledBy": "68a5a6b939fc3d7c3d7b1a71",
        "cancelledAt": "2025-09-03T10:30:00.000Z",
        "cancellationDescription": "Event cancelled due to unforeseen circumstances",
        "cancellationInstructions": "Refunds will be processed within 5-7 business days"
      }
    }
  ]
}
```

### Individual Event Details
Cancelled events return 200 status with cancellation information:

```json
{
  "success": true,
  "data": {
    "id": "68a71166fbbe748719b2120b",
    "name": "Tech Conference 2025",
    "date": "2025-10-15",
    "venue": "Convention Center",
    "isCancelled": true,
    "cancellationInfo": {
      "cancelledBy": "68a5a6b939fc3d7c3d7b1a71",
      "cancelledAt": "2025-09-03T10:30:00.000Z",
      "cancellationDescription": "Event cancelled due to unforeseen circumstances",
      "cancellationInstructions": "Refunds will be processed within 5-7 business days"
    }
  }
}
```

## Email Notifications

### Automatic Notification
When an event is cancelled, the system automatically:

1. **Finds all ticket holders** for the event
2. **Sends email notifications** to each ticket holder
3. **Includes cancellation details** and refund information
4. **Processes notifications asynchronously** to avoid blocking the API response

### Email Content
The cancellation email includes:
- Event name and date
- Cancellation reason
- Cancellation instructions
- Refund information
- Contact details for support

### Notification Count
The API response includes the number of notifications sent:

```json
{
  "notificationsSent": 25,
  "message": "Event cancelled successfully. 25 ticket holders will be notified via email."
}
```

## Testing

### Test Scripts
Use the provided test scripts to verify functionality:

1. **`test-otp-cancellation.ts`**: **NEW** - Test the complete OTP-based cancellation system
2. **`test-cancellation-api.ts`**: Test the cancellation endpoint
3. **`test-cancelled-events-visibility.ts`**: Test event visibility after cancellation
4. **`test-cancellation-with-notifications.ts`**: Test email notifications and ticket holders
5. **`test-cancellation-booking-prevention.ts`**: Test booking prevention for cancelled events

### Manual Testing
1. **Request OTP** using `/api/events/{eventId}/cancel/request-otp`
2. **Check email** for verification code
3. **Complete cancellation** with OTP using `/api/events/{eventId}/cancel`
4. **Verify notifications** are sent to ticket holders
5. **Test booking prevention** for cancelled events

## Security Considerations

### Authorization
- Only event organizers and managers can cancel events
- Users can only cancel events they created or manage
- Cancelled events cannot be modified or reactivated

### OTP Security
- **5-minute expiry** for quick expiration
- **Email-only delivery** to registered user email
- **Purpose-specific keys** to prevent reuse
- **Rate limiting** to prevent abuse
- **Clear error messages** for security guidance

### Data Integrity
- Cancellation is permanent and cannot be undone
- All cancellation details are logged and tracked
- Ticket holder information is preserved for refund processing

### Rate Limiting
- Cancellation endpoints are rate-limited to prevent abuse
- Email notifications are queued to prevent spam
- OTP requests are limited to prevent flooding

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | OTP is required for event cancellation. Please request an OTP first. | Missing OTP in cancellation request |
| 400 | Invalid or expired OTP. Please request a new one. | Invalid or expired OTP provided |
| 400 | Event booking not allowed. Event is cancelled. | User tried to book tickets for cancelled event |
| 400 | Event not found | Invalid event ID provided |
| 400 | User email not found. Cannot send verification code. | User has no registered email |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | User lacks permission to perform action |
| 404 | Event not found | Event doesn't exist |
| 500 | Internal server error | Server-side error occurred |

## Best Practices

### For Event Organizers
1. **Provide clear cancellation reasons** to help users understand
2. **Include specific instructions** for refunds or rescheduling
3. **Cancel events promptly** to minimize user inconvenience
4. **Monitor notification delivery** to ensure users are informed
5. **Keep OTP secure** and don't share verification codes

### For Developers
1. **Handle OTP requirements gracefully** in frontend applications
2. **Display cancellation information prominently** to users
3. **Implement proper error handling** for all cancellation scenarios
4. **Test cancellation flows thoroughly** before production deployment
5. **Guide users through the two-step process** clearly

### For Security
1. **Never store OTPs** in client-side storage
2. **Implement proper rate limiting** for OTP requests
3. **Monitor for suspicious activity** around cancellation endpoints
4. **Log all cancellation attempts** for audit purposes
5. **Use HTTPS** for all API communications

## Support

For technical support or questions about the Event Cancellation API, please contact the development team or refer to the API documentation.

## Migration Notes

### From Previous Version
If you're upgrading from the previous cancellation API:

1. **OTP is now required** for all cancellations
2. **Two-step process** instead of single endpoint
3. **Enhanced security** with email verification
4. **Same booking prevention** features maintained
5. **Backward compatibility** for existing cancelled events

### Breaking Changes
- `POST /api/events/{eventId}/cancel` now requires `otp` field
- New endpoint: `POST /api/events/{eventId}/cancel/request-otp`
- OTP verification is mandatory for all cancellations
