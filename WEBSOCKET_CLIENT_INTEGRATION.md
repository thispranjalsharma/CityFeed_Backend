# WebSocket Client Integration Guide

## Overview

This guide explains how to integrate WebSocket functionality for real-time ticket booking in your frontend application. The WebSocket system provides real-time availability updates and prevents race conditions during ticket booking.

## WebSocket Events

### Client to Server Events

#### 1. Join Event Room
```javascript
// Join a specific event room to receive real-time updates
socket.emit('joinEvent', eventId);

// Response: 'eventJoined' event
socket.on('eventJoined', (data) => {
  console.log('Joined event room:', data.eventId);
});
```

#### 2. Start Booking Session
```javascript
// Start a booking session to reserve tickets temporarily
socket.emit('startBooking', {
  eventId: 'event_id_here',
  userId: 'user_id_here',
  tierId: 'tier_id_here', // or null for general admission
  quantity: 2
});

// Response: 'bookingStarted' or 'bookingError'
socket.on('bookingStarted', (data) => {
  console.log('Booking session started:', data);
  // Store sessionId for later use
  localStorage.setItem('bookingSessionId', data.sessionId);
});

socket.on('bookingError', (data) => {
  console.error('Booking error:', data.message);
  // Handle error (show message to user)
});
```

#### 3. Cancel Booking Session
```javascript
// Cancel an active booking session
socket.emit('cancelBooking', {
  sessionId: 'session_id_here',
  userId: 'user_id_here'
});

// Response: 'bookingCancelled'
socket.on('bookingCancelled', (data) => {
  console.log('Booking cancelled:', data);
  localStorage.removeItem('bookingSessionId');
});
```

#### 4. Complete Booking
```javascript
// Complete booking after successful payment
socket.emit('completeBooking', {
  sessionId: 'session_id_here',
  userId: 'user_id_here'
});

// Response: 'bookingCompleted'
socket.on('bookingCompleted', (data) => {
  console.log('Booking completed:', data);
  localStorage.removeItem('bookingSessionId');
});
```

#### 5. Get Current Availability
```javascript
// Request current availability data
socket.emit('getAvailability', {
  eventId: 'event_id_here'
});

// Response: 'availabilityData'
socket.on('availabilityData', (data) => {
  console.log('Current availability:', data.tiers);
  // Update UI with real-time availability
});
```

### Server to Client Events

#### 1. Availability Updates
```javascript
// Real-time availability updates
socket.on('availabilityUpdate', (data) => {
  console.log('Availability updated:', data);
  // Update UI with new availability
  updateTicketAvailability(data);
});
```

#### 2. Event Seats Update
```javascript
// General event seats update
socket.on('eventSeatsUpdate', (data) => {
  console.log('Event seats updated:', data);
  // Update total available seats display
  updateEventSeats(data);
});
```

#### 3. Booking Session Events
```javascript
// Booking session expired
socket.on('bookingExpired', (data) => {
  console.log('Booking session expired:', data);
  // Clear session and show message to user
  localStorage.removeItem('bookingSessionId');
  showMessage('Your booking session has expired. Please try again.');
});
```

## Complete Client Implementation Example

```javascript
class TicketBookingWebSocket {
  constructor(eventId, userId) {
    this.eventId = eventId;
    this.userId = userId;
    this.socket = io('http://your-server-url');
    this.bookingSessionId = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Join event room
    this.socket.emit('joinEvent', this.eventId);

    // Listen for availability updates
    this.socket.on('availabilityUpdate', (data) => {
      this.updateAvailabilityUI(data);
    });

    // Listen for booking session events
    this.socket.on('bookingStarted', (data) => {
      this.bookingSessionId = data.sessionId;
      this.showBookingTimer(data.expiresAt);
    });

    this.socket.on('bookingError', (data) => {
      this.showError(data.message);
    });

    this.socket.on('bookingExpired', (data) => {
      this.bookingSessionId = null;
      this.showError('Booking session expired. Please try again.');
    });

    // Listen for general updates
    this.socket.on('eventSeatsUpdate', (data) => {
      this.updateEventSeatsUI(data);
    });
  }

  async startBooking(tierId, quantity) {
    try {
      this.socket.emit('startBooking', {
        eventId: this.eventId,
        userId: this.userId,
        tierId: tierId,
        quantity: quantity
      });
    } catch (error) {
      console.error('Error starting booking:', error);
    }
  }

  cancelBooking() {
    if (this.bookingSessionId) {
      this.socket.emit('cancelBooking', {
        sessionId: this.bookingSessionId,
        userId: this.userId
      });
      this.bookingSessionId = null;
    }
  }

  async completeBooking() {
    if (this.bookingSessionId) {
      try {
        // First, create the order via REST API
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken()}`
          },
          body: JSON.stringify({
            eventId: this.eventId,
            tickets: [{
              ticketTierId: this.currentTierId,
              quantity: this.currentQuantity
            }],
            bookingSessionId: this.bookingSessionId
          })
        });

        if (orderResponse.ok) {
          // Complete the WebSocket booking session
          this.socket.emit('completeBooking', {
            sessionId: this.bookingSessionId,
            userId: this.userId
          });
          
          // Proceed with payment
          this.proceedToPayment();
        } else {
          const error = await orderResponse.json();
          this.showError(error.message);
        }
      } catch (error) {
        console.error('Error completing booking:', error);
        this.showError('Failed to complete booking. Please try again.');
      }
    }
  }

  updateAvailabilityUI(data) {
    // Update ticket tier availability in UI
    data.availability?.forEach(tier => {
      const tierElement = document.querySelector(`[data-tier-id="${tier.tierId}"]`);
      if (tierElement) {
        const availableElement = tierElement.querySelector('.available-count');
        if (availableElement) {
          availableElement.textContent = tier.available;
          
          // Disable booking if no tickets available
          const bookButton = tierElement.querySelector('.book-button');
          if (bookButton) {
            bookButton.disabled = tier.available === 0;
          }
        }
      }
    });
  }

  showBookingTimer(expiresAt) {
    const expiryTime = new Date(expiresAt).getTime();
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const timeLeft = expiryTime - now;
      
      if (timeLeft <= 0) {
        clearInterval(timer);
        this.showError('Booking session expired');
        return;
      }
      
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      
      // Update timer UI
      document.getElementById('booking-timer').textContent = 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
  }

  showError(message) {
    // Show error message to user
    console.error(message);
    // Update UI to show error
  }

  getAuthToken() {
    // Get authentication token from storage
    return localStorage.getItem('authToken');
  }

  disconnect() {
    this.socket.disconnect();
  }
}

// Usage Example
const bookingWS = new TicketBookingWebSocket('event_id', 'user_id');

// Start booking when user clicks book button
document.querySelector('.book-button').addEventListener('click', () => {
  bookingWS.startBooking('tier_id', 2);
});

// Complete booking when payment is successful
function onPaymentSuccess() {
  bookingWS.completeBooking();
}
```

## Best Practices

### 1. Error Handling
- Always handle WebSocket connection errors
- Implement reconnection logic
- Show user-friendly error messages

### 2. Session Management
- Store booking session ID in localStorage
- Clear session on page refresh/navigation
- Handle session expiration gracefully

### 3. UI Updates
- Update availability in real-time
- Disable booking buttons when no tickets available
- Show booking timer during active sessions

### 4. Performance
- Debounce frequent updates
- Clean up event listeners on component unmount
- Use efficient DOM updates

### 5. Security
- Validate all data received from WebSocket
- Never trust client-side data
- Use authentication tokens for sensitive operations

## Testing

### 1. Connection Testing
```javascript
// Test WebSocket connection
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket server');
});
```

### 2. Event Testing
```javascript
// Test all events
socket.onAny((eventName, ...args) => {
  console.log(`Received event: ${eventName}`, args);
});
```

### 3. Error Testing
```javascript
// Test error scenarios
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check server URL and port
   - Verify CORS configuration
   - Check network connectivity

2. **Events Not Received**
   - Verify event names match server
   - Check if room is joined correctly
   - Ensure authentication is valid

3. **Booking Session Issues**
   - Check session expiration
   - Verify user permissions
   - Clear expired sessions

4. **Availability Not Updating**
   - Check if event room is joined
   - Verify WebSocket connection
   - Check server logs for errors
