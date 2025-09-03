# Event Cancellation API Documentation

## Overview
This API allows event organizers and event managers to cancel events and automatically notify ticket holders about the cancellation.

## Features
- **Event Cancellation**: Mark events as cancelled with optional description and instructions
- **Automatic Notifications**: Send email notifications to all ticket holders
- **Cancellation Visibility**: Cancelled events remain visible in listings with cancellation details
- **Ticket Holder Management**: View list of users who have booked tickets for events
- **Booking Prevention**: Prevent new ticket bookings for cancelled events

## API Endpoints

### 1. Cancel Event
**POST** `/api/events/{eventId}/cancel`

Cancels an event and sends notifications to ticket holders.

**Authorization**: 
- `event_organizer` or `event_manager` role
- Must be the event creator or assigned manager

**Request Body**:
```json
{
  "description": "Event cancelled due to unforeseen circumstances",
  "instructions": "Refunds will be processed within 5-7 business days"
}
```

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

### 2. Get Event Ticket Holders
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

## Cancellation Booking Prevention

### Overview
The system now automatically prevents users from booking tickets for cancelled events at multiple levels:

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

1. **`test-cancellation-api.ts`**: Test the cancellation endpoint
2. **`test-cancelled-events-visibility.ts`**: Test event visibility after cancellation
3. **`test-cancellation-with-notifications.ts`**: Test email notifications and ticket holders
4. **`test-cancellation-booking-prevention.ts`**: Test booking prevention for cancelled events

### Manual Testing
1. **Cancel an event** using the cancellation API
2. **Try to book tickets** for the cancelled event
3. **Verify error messages** and cancellation details
4. **Check email notifications** are sent to ticket holders

## Security Considerations

### Authorization
- Only event organizers and managers can cancel events
- Users can only cancel events they created or manage
- Cancelled events cannot be modified or reactivated

### Data Integrity
- Cancellation is permanent and cannot be undone
- All cancellation details are logged and tracked
- Ticket holder information is preserved for refund processing

### Rate Limiting
- Cancellation endpoint is rate-limited to prevent abuse
- Email notifications are queued to prevent spam

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Event booking not allowed. Event is cancelled. | User tried to book tickets for cancelled event |
| 400 | Event not found | Invalid event ID provided |
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

### For Developers
1. **Handle cancellation errors gracefully** in frontend applications
2. **Display cancellation information prominently** to users
3. **Implement proper error handling** for all cancellation scenarios
4. **Test cancellation flows thoroughly** before production deployment

## Support

For technical support or questions about the Event Cancellation API, please contact the development team or refer to the API documentation.
