# WebSocket API Documentation for Real-time Ticket Booking

## Overview

This document describes the WebSocket API implementation for real-time ticket booking in the CityFeed event management system. The WebSocket system prevents race conditions and provides real-time availability updates during the ticket booking process.

## WebSocket Connection

### Connection URL
```
ws://your-server-url:3001
```

### Connection Setup
```javascript
import { io } from 'socket.io-client';

const socket = io('http://your-server-url:3001', {
  transports: ['websocket'],
  autoConnect: true
});
```

## WebSocket Events

### Client to Server Events

#### 1. Join Event Room
**Event:** `joinEvent`  
**Description:** Join a specific event room to receive real-time updates for that event.

**Payload:**
```javascript
{
  eventId: string // The event ID to join
}
```

**Response:** `eventJoined`
```javascript
{
  eventId: string,
  timestamp: string
}
```

**Example:**
```javascript
socket.emit('joinEvent', '64f1a2b3c4d5e6f7a8b9c0d1');

socket.on('eventJoined', (data) => {
  console.log('Joined event room:', data.eventId);
});
```

#### 2. Start Booking Session
**Event:** `startBooking`  
**Description:** Start a booking session to temporarily reserve tickets.

**Payload:**
```javascript
{
  eventId: string,    // Event ID
  userId: string,     // User ID
  tierId: string,     // Ticket tier ID (or null for general admission)
  quantity: number    // Number of tickets to reserve
}
```

**Responses:**
- **Success:** `bookingStarted`
- **Error:** `bookingError`

**Success Response:**
```javascript
{
  sessionId: string,      // Unique session ID
  eventId: string,
  tierId: string,
  quantity: number,
  expiresAt: string,      // ISO date string
  message: string
}
```

**Error Response:**
```javascript
{
  message: string,        // Error message
  available?: number      // Available tickets (if applicable)
}
```

**Example:**
```javascript
socket.emit('startBooking', {
  eventId: '64f1a2b3c4d5e6f7a8b9c0d1',
  userId: 'user123',
  tierId: 'tier456',
  quantity: 2
});

socket.on('bookingStarted', (data) => {
  console.log('Booking session started:', data.sessionId);
  localStorage.setItem('bookingSessionId', data.sessionId);
});

socket.on('bookingError', (data) => {
  console.error('Booking error:', data.message);
});
```

#### 3. Cancel Booking Session
**Event:** `cancelBooking`  
**Description:** Cancel an active booking session.

**Payload:**
```javascript
{
  sessionId: string,  // Session ID to cancel
  userId: string      // User ID (for validation)
}
```

**Response:** `bookingCancelled`
```javascript
{
  sessionId: string,
  message: string,
  timestamp: string
}
```

**Example:**
```javascript
socket.emit('cancelBooking', {
  sessionId: 'user123_event456_tier789',
  userId: 'user123'
});

socket.on('bookingCancelled', (data) => {
  console.log('Booking cancelled:', data.sessionId);
  localStorage.removeItem('bookingSessionId');
});
```

#### 4. Complete Booking
**Event:** `completeBooking`  
**Description:** Complete a booking session after successful payment.

**Payload:**
```javascript
{
  sessionId: string,  // Session ID to complete
  userId: string      // User ID (for validation)
}
```

**Response:** `bookingCompleted`
```javascript
{
  sessionId: string,
  message: string,
  timestamp: string
}
```

**Example:**
```javascript
socket.emit('completeBooking', {
  sessionId: 'user123_event456_tier789',
  userId: 'user123'
});

socket.on('bookingCompleted', (data) => {
  console.log('Booking completed:', data.sessionId);
  localStorage.removeItem('bookingSessionId');
});
```

#### 5. Get Current Availability
**Event:** `getAvailability`  
**Description:** Request current availability data for an event.

**Payload:**
```javascript
{
  eventId: string  // Event ID
}
```

**Response:** `availabilityData`
```javascript
{
  eventId: string,
  tiers: [
    {
      tierId: string,
      name: string,
      price: number,
      totalQuantity: number,
      soldCount: number,
      reservedCount: number,
      available: number
    }
  ],
  timestamp: string
}
```

**Example:**
```javascript
socket.emit('getAvailability', {
  eventId: '64f1a2b3c4d5e6f7a8b9c0d1'
});

socket.on('availabilityData', (data) => {
  console.log('Current availability:', data.tiers);
  updateAvailabilityUI(data.tiers);
});
```

### Server to Client Events

#### 1. Availability Updates
**Event:** `availabilityUpdate`  
**Description:** Real-time availability updates for ticket tiers.

**Payload:**
```javascript
{
  eventId: string,
  tierId?: string,        // Optional: specific tier ID
  availability: [
    {
      tierId: string,
      name: string,
      price: number,
      totalQuantity: number,
      soldCount: number,
      reservedCount: number,
      available: number
    }
  ],
  timestamp: string
}
```

**Example:**
```javascript
socket.on('availabilityUpdate', (data) => {
  console.log('Availability updated:', data);
  updateTicketAvailability(data.availability);
});
```

#### 2. Event Seats Update
**Event:** `eventSeatsUpdate`  
**Description:** General event seats update with comprehensive data.

**Payload:**
```javascript
{
  eventId: string,
  availableSeats: number,
  tiersAvailable: [
    {
      tierId: string,
      name: string,
      available: number,
      reserved: number
    }
  ],
  message: string,
  timestamp: string
}
```

**Example:**
```javascript
socket.on('eventSeatsUpdate', (data) => {
  console.log('Event seats updated:', data);
  updateEventSeatsDisplay(data);
});
```

#### 3. Booking Session Events

**Event:** `bookingExpired`  
**Description:** Notification when a booking session expires.

**Payload:**
```javascript
{
  sessionId: string,
  message: string,
  timestamp: string
}
```

**Example:**
```javascript
socket.on('bookingExpired', (data) => {
  console.log('Booking session expired:', data.sessionId);
  localStorage.removeItem('bookingSessionId');
  showExpiredMessage(data.message);
});
```

## REST API Integration

### Enhanced Order Creation

The REST API for order creation now supports WebSocket booking sessions:

**Endpoint:** `POST /api/orders`

**Request Body:**
```javascript
{
  eventId: string,
  tickets: [
    {
      ticketTierId: string,
      quantity: number
    }
  ],
  bookingSessionId?: string  // Optional: WebSocket session ID
}
```

**Response:**
```javascript
{
  success: true,
  message: "Order created successfully",
  order: {
    _id: string,
    event: string,
    user: string,
    tickets: [...],
    status: "pending",
    expiresAt: string
  }
}
```

### Enhanced Event Details

The event details endpoint now includes real-time availability data:

**Endpoint:** `GET /api/events/{id}`

**Response:**
```javascript
{
  success: true,
  data: {
    _id: string,
    name: string,
    // ... other event fields
    totalSeats: number,
    availableSeats: number,
    reservedSeats: number,
    ticketTiers: [
      {
        _id: string,
        name: string,
        price: number,
        quantity: number,
        soldCount: number,
        available: number,
        reserved: number,
        realTimeAvailable: boolean
      }
    ],
    realTimeData: {
      hasActiveBookings: boolean,
      lastUpdated: string,
      websocketEnabled: boolean
    }
  }
}
```

## Booking Session Management

### Session Lifecycle

1. **Start Session:** User initiates booking → tickets reserved for 15 minutes
2. **Active Session:** User completes payment process
3. **Complete Session:** Payment successful → session cleared, tickets confirmed
4. **Expire Session:** 15 minutes elapsed → session cleared, tickets released

### Session ID Format
```
{userId}_{eventId}_{tierId}
```

### Session Cleanup
- Automatic cleanup every 30 seconds
- Sessions expire after 15 minutes
- Cleanup on user disconnect
- Cleanup on successful payment

## Error Handling

### Common Error Scenarios

1. **Insufficient Tickets**
```javascript
{
  message: "Only 5 tickets available for VIP",
  available: 5
}
```

2. **Session Already Exists**
```javascript
{
  message: "You already have an active booking session for this tier"
}
```

3. **Invalid Session**
```javascript
{
  message: "Invalid or expired booking session"
}
```

4. **Event Not Found**
```javascript
{
  message: "Ticket tier not found"
}
```

### Connection Error Handling

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  // Implement reconnection logic
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  if (reason === 'io server disconnect') {
    // Server disconnected, reconnect manually
    socket.connect();
  }
});
```

## Security Considerations

### Authentication
- WebSocket connections should be authenticated
- User ID validation for all booking operations
- Session ownership verification

### Rate Limiting
- Limit booking session creation per user
- Prevent rapid session creation/deletion
- Implement cooldown periods

### Data Validation
- Validate all incoming WebSocket data
- Sanitize user inputs
- Verify ticket availability before operations

## Performance Optimization

### Connection Management
- Reuse WebSocket connections
- Implement connection pooling
- Handle connection failures gracefully

### Data Efficiency
- Send only necessary data in updates
- Implement data compression
- Use efficient data structures

### Scalability
- Room-based updates (event-specific)
- Selective broadcasting
- Load balancing for WebSocket servers

## Testing

### Unit Tests
```javascript
// Test booking session creation
test('should create booking session', async () => {
  const sessionData = {
    eventId: 'test-event',
    userId: 'test-user',
    tierId: 'test-tier',
    quantity: 2
  };
  
  socket.emit('startBooking', sessionData);
  
  await new Promise(resolve => {
    socket.on('bookingStarted', (data) => {
      expect(data.sessionId).toBeDefined();
      expect(data.quantity).toBe(2);
      resolve();
    });
  });
});
```

### Integration Tests
```javascript
// Test complete booking flow
test('should complete booking flow', async () => {
  // 1. Start booking session
  socket.emit('startBooking', bookingData);
  
  // 2. Create order via REST API
  const orderResponse = await createOrder(orderData);
  
  // 3. Complete booking session
  socket.emit('completeBooking', { sessionId, userId });
  
  // 4. Verify session cleared
  expect(activeBookingSessions.has(sessionId)).toBe(false);
});
```

## Monitoring and Logging

### Key Metrics
- Active booking sessions count
- Session completion rate
- Average session duration
- Failed booking attempts

### Logging
```javascript
// Server-side logging
logger.info(`Booking session started: ${sessionId} for ${quantity} tickets`);
logger.info(`Booking session completed: ${sessionId}`);
logger.info(`Cleaned up ${cleanedCount} expired booking sessions`);
```

### Health Checks
```javascript
// WebSocket health check
socket.emit('ping');
socket.on('pong', () => {
  console.log('WebSocket connection healthy');
});
```

## Best Practices

### Client-Side
1. Always handle connection errors
2. Implement reconnection logic
3. Store session IDs securely
4. Clear sessions on page unload
5. Show user-friendly error messages

### Server-Side
1. Validate all incoming data
2. Implement proper error handling
3. Use efficient data structures
4. Monitor session cleanup
5. Log important events

### General
1. Test thoroughly with multiple users
2. Monitor performance metrics
3. Implement proper security measures
4. Document all events and payloads
5. Version your WebSocket API
