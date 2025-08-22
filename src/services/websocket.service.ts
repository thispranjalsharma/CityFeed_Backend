import { io, activeBookingSessions } from '../server';
import { logger } from '../utils/logger.util';

export interface BookingSession {
  userId: string;
  eventId: string;
  tierId: string;
  quantity: number;
  expiresAt: Date;
  socketId: string;
}

export interface AvailabilityData {
  tierId: string;
  name: string;
  price: number;
  totalQuantity: number;
  soldCount: number;
  reservedCount: number;
  available: number;
}

export class WebSocketService {
  /**
   * Get current availability for an event
   */
  static async getEventAvailability(eventId: string): Promise<AvailabilityData[]> {
    try {
      const { TicketTier } = await import('../models/ticketTier.model');
      const tiers = await TicketTier.find({ event: eventId });
      
      return tiers.map(tier => {
        const activeSessionsForTier = Array.from(activeBookingSessions.values())
          .filter(session => session.tierId === tier._id.toString() && session.eventId === eventId);
        
        const reservedQuantity = activeSessionsForTier.reduce((sum, session) => sum + session.quantity, 0);
        const actuallyAvailable = tier.quantity - tier.soldCount - reservedQuantity;
        
        return {
          tierId: tier._id.toString(),
          name: tier.name,
          price: tier.price,
          totalQuantity: tier.quantity,
          soldCount: tier.soldCount,
          reservedCount: reservedQuantity,
          available: Math.max(0, actuallyAvailable)
        };
      });
    } catch (error) {
      logger.error('Error getting event availability:', error);
      throw error;
    }
  }

  /**
   * Check if a booking session is valid
   */
  static isBookingSessionValid(sessionId: string, userId: string): boolean {
    const session = activeBookingSessions.get(sessionId);
    if (!session) return false;
    
    // Check if session belongs to user and hasn't expired
    return session.userId === userId && session.expiresAt > new Date();
  }

  /**
   * Get user's active booking sessions
   */
  static getUserActiveSessions(userId: string): BookingSession[] {
    return Array.from(activeBookingSessions.values())
      .filter(session => session.userId === userId);
  }

  /**
   * Emit availability update to all clients in an event room
   */
  static emitAvailabilityUpdate(eventId: string, tierId?: string): void {
    try {
      this.getEventAvailability(eventId).then(availability => {
        io.to(`event_${eventId}`).emit('availabilityUpdate', {
          eventId,
          tierId,
          availability,
          timestamp: new Date().toISOString()
        });
      });
    } catch (error) {
      logger.error('Error emitting availability update:', error);
    }
  }

  /**
   * Emit booking session update
   */
  static emitBookingSessionUpdate(sessionId: string, action: 'started' | 'cancelled' | 'completed', data: any): void {
    const session = activeBookingSessions.get(sessionId);
    if (session) {
      io.to(session.socketId).emit(`booking${action.charAt(0).toUpperCase() + action.slice(1)}`, {
        sessionId,
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Clean up expired sessions
   */
  static cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of activeBookingSessions.entries()) {
      if (session.expiresAt < now) {
        activeBookingSessions.delete(sessionId);
        cleanedCount++;
        
        // Notify client about expired session
        io.to(session.socketId).emit('bookingExpired', {
          sessionId,
          message: 'Booking session expired'
        });
      }
    }
    
    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired booking sessions`);
    }
  }

  /**
   * Get booking session statistics
   */
  static getBookingStats(): {
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
    sessionsByEvent: Record<string, number>;
  } {
    const now = new Date();
    const sessions = Array.from(activeBookingSessions.values());
    
    const stats = {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.expiresAt > now).length,
      expiredSessions: sessions.filter(s => s.expiresAt <= now).length,
      sessionsByEvent: {} as Record<string, number>
    };

    // Group sessions by event
    sessions.forEach(session => {
      stats.sessionsByEvent[session.eventId] = (stats.sessionsByEvent[session.eventId] || 0) + 1;
    });

    return stats;
  }
}

// Set up periodic cleanup
setInterval(() => {
  WebSocketService.cleanupExpiredSessions();
}, 30000); // Every 30 seconds

export default WebSocketService;
