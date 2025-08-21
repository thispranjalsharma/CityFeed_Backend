import { Event } from '../models/event.model';
import { TicketTier } from '../models/ticketTier.model';

/**
 * Updates sold count for both standalone TicketTier and embedded ticketTiers in Event
 * @param ticketTierId - The ticket tier ID
 * @param quantity - The quantity to increment sold count by
 * @param eventId - The event ID (optional, will be fetched from TicketTier if not provided)
 */
export const updateTicketTierSoldCount = async (
  ticketTierId: string,
  quantity: number,
  eventId?: string
): Promise<void> => {
  try {
    // Update standalone TicketTier collection
    await TicketTier.findByIdAndUpdate(
      ticketTierId,
      { $inc: { soldCount: quantity } }
    );

    // If eventId not provided, get it from the TicketTier
    if (!eventId) {
      const ticketTier = await TicketTier.findById(ticketTierId);
      if (ticketTier) {
        eventId = ticketTier.event.toString();
      }
    }

    if (eventId) {
      // Update embedded ticketTiers in Event document
      await Event.findByIdAndUpdate(
        eventId,
        {
          $inc: {
            'ticketTiers.$[tier].soldCount': quantity
          }
        },
        {
          arrayFilters: [{ 'tier._id': ticketTierId }]
        }
      );
    }
  } catch (error) {
    console.error('Error updating ticket tier sold count:', error);
    throw error;
  }
};

/**
 * Updates total sold count for events without ticket tiers
 * @param eventId - The event ID
 * @param quantity - The quantity to increment total sold count by
 */
export const updateEventTotalSoldCount = async (
  eventId: string,
  quantity: number
): Promise<void> => {
  try {
    await Event.findByIdAndUpdate(
      eventId,
      { $inc: { totalSoldCount: quantity } }
    );
  } catch (error) {
    console.error('Error updating event total sold count:', error);
    throw error;
  }
};

/**
 * Decrements sold count for both standalone TicketTier and embedded ticketTiers in Event (for refunds)
 * @param ticketTierId - The ticket tier ID
 * @param quantity - The quantity to decrement sold count by
 * @param eventId - The event ID (optional, will be fetched from TicketTier if not provided)
 */
export const decrementTicketTierSoldCount = async (
  ticketTierId: string,
  quantity: number,
  eventId?: string
): Promise<void> => {
  try {
    // Decrement standalone TicketTier collection
    await TicketTier.findByIdAndUpdate(
      ticketTierId,
      { $inc: { soldCount: -quantity } }
    );

    // If eventId not provided, get it from the TicketTier
    if (!eventId) {
      const ticketTier = await TicketTier.findById(ticketTierId);
      if (ticketTier) {
        eventId = ticketTier.event.toString();
      }
    }

    if (eventId) {
      // Decrement embedded ticketTiers in Event document
      await Event.findByIdAndUpdate(
        eventId,
        {
          $inc: {
            'ticketTiers.$[tier].soldCount': -quantity
          }
        },
        {
          arrayFilters: [{ 'tier._id': ticketTierId }]
        }
      );
    }
  } catch (error) {
    console.error('Error decrementing ticket tier sold count:', error);
    throw error;
  }
};

/**
 * Decrements total sold count for events without ticket tiers (for refunds)
 * @param eventId - The event ID
 * @param quantity - The quantity to decrement total sold count by
 */
export const decrementEventTotalSoldCount = async (
  eventId: string,
  quantity: number
): Promise<void> => {
  try {
    await Event.findByIdAndUpdate(
      eventId,
      { $inc: { totalSoldCount: -quantity } }
    );
  } catch (error) {
    console.error('Error decrementing event total sold count:', error);
    throw error;
  }
};
