import { Request, Response } from 'express';
import { Event } from '../models/event.model';
// Remove the deprecated TicketTier import since we're using embedded tiers
// import { TicketTier } from '../models/ticketTier.model';
import { Order } from '../models/order.model';
import { Ticket } from '../models/ticket.model';
import { User } from '../models/user.model';
import { EmailService } from '../services/email.service';
import QRCode from 'qrcode';
import cloudinary from '../config/cloudinary';
import mongoose from 'mongoose';
import { io, activeBookingSessions } from '../server';
import { objectIdsToStrings, datesToISOString } from '../utils/email.util';
import { updateTicketTierSoldCount, updateEventTotalSoldCount, decrementTicketTierSoldCount, decrementEventTotalSoldCount } from '../utils/ticketTier.util';

export class OrderController {
  async createOrder(req: Request & { user?: any }, res: Response) {
    try {
      const { eventId, tickets, bookingSessionId } = req.body;
      const user = req.user;
      
      if (!eventId || !Array.isArray(tickets) || tickets.length === 0) {
        return res.status(400).json({ success: false, message: 'Event ID and at least one ticket are required.' });
      }
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Validate booking session if provided
      if (bookingSessionId) {
        const session = activeBookingSessions.get(bookingSessionId);
        if (!session || session.userId !== user._id) {
          return res.status(400).json({ success: false, message: 'Invalid or expired booking session.' });
        }
      }

      // Check event exists
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }

      // Check if event is cancelled
      if (event.isCancelled) {
        return res.status(400).json({ 
          success: false, 
          message: 'Event booking not allowed. Event is cancelled.',
          data: {
            eventId: event._id,
            eventName: event.name,
            isCancelled: true,
            cancellationReason: event.cancellationDescription || 'No reason provided',
            cancellationInstructions: event.cancellationInstructions || 'No instructions provided'
          }
        });
      }

      // Validate sale dates - check if booking is currently allowed
      const now = new Date();
      
      if (event.saleStart && now < event.saleStart) {
        const saleStartDate = new Date(event.saleStart);
        const formattedDate = saleStartDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        return res.status(400).json({ 
          success: false, 
          message: `Booking has not started yet. You can book tickets starting from ${formattedDate}.` 
        });
      }
      
      if (event.saleEnd && now > event.saleEnd) {
        const saleEndDate = new Date(event.saleEnd);
        const formattedDate = saleEndDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        return res.status(400).json({ 
          success: false, 
          message: `Booking has ended. Ticket sales closed on ${saleEndDate}.` 
        });
      }

      // Validate each ticket tier and quantity with real-time availability check
      // Use embedded ticket tiers from the event instead of deprecated TicketTier collection
      const ticketTierIds = tickets.map(t => t.ticketTierId);
      const eventObjectId = typeof eventId === 'string' ? new mongoose.Types.ObjectId(eventId) : eventId;
      
      // Get tiers from the event's embedded ticketTiers array
      const tiers = event.ticketTiers.filter(tier => 
        ticketTierIds.some(id => id.toString() === tier._id?.toString())
      );
      
      if (tiers.length === 0) {
        // No ticket tiers: use event.ticketPrice
        if (typeof event.ticketPrice !== 'number' || event.ticketPrice <= 0) {
          return res.status(400).json({ success: false, message: 'No ticket tiers exist and event.ticketPrice is not set or invalid.' });
        }
        
        const totalQuantity = tickets.reduce((sum, t) => sum + (t.quantity || 0), 0);
        if (totalQuantity < 1) {
          return res.status(400).json({ success: false, message: 'At least one ticket must be purchased.' });
        }

        // Check real-time availability including active booking sessions
        const activeSessionsForEvent = Array.from(activeBookingSessions.values())
          .filter(session => session.eventId === eventId && !session.tierId);
        
        const reservedQuantity = activeSessionsForEvent.reduce((sum, session) => sum + session.quantity, 0);
        const actuallyAvailable = (event.venue?.capacity || 0) - (event.totalSoldCount || 0) - reservedQuantity;
        
        if (totalQuantity > actuallyAvailable) {
          return res.status(400).json({ 
            success: false, 
            message: `Only ${actuallyAvailable} tickets available. Please refresh and try again.` 
          });
        }

        const orderTickets = [{
          ticketTierId: null,
          quantity: totalQuantity,
          priceAtPurchase: event.ticketPrice
        }];
        
        const order = new Order({
          event: eventId,
          user: user._id,
          tickets: orderTickets,
          status: 'pending',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });
        await order.save();

        // Complete booking session if provided
        if (bookingSessionId) {
          activeBookingSessions.delete(bookingSessionId);
        }

        // Emit real-time availability update
        const newAvailableSeats = actuallyAvailable - totalQuantity;
        io.to(`event_${eventId}`).emit('eventSeatsUpdate', { 
          eventId, 
          availableSeats: newAvailableSeats,
          tiersAvailable: [],
          message: `${totalQuantity} tickets booked successfully`
        });

        return res.status(201).json({
          success: true,
          message: 'Order created successfully',
          order: datesToISOString(objectIdsToStrings(order.toObject()))
        });
      }

      if (tiers.length !== tickets.length) {
        return res.status(404).json({ success: false, message: 'One or more ticket tiers not found for this event.' });
      }

      // Check availability and prepare order tickets with real-time validation
      const orderTickets = [];
      const availabilityUpdates = [];
      
      for (const t of tickets) {
        const tier = tiers.find(tt => tt._id?.toString() === t.ticketTierId.toString());
        if (!tier) continue;
        
        // Calculate real-time availability including active booking sessions
        const activeSessionsForTier = Array.from(activeBookingSessions.values())
          .filter(session => session.tierId === t.ticketTierId && session.eventId === eventId);
        
        const reservedQuantity = activeSessionsForTier.reduce((sum, session) => sum + session.quantity, 0);
        const actuallyAvailable = tier.quantity - (tier.soldCount || 0) - reservedQuantity;
        
        if (t.quantity > actuallyAvailable) {
          return res.status(400).json({ 
            success: false, 
            message: `Only ${actuallyAvailable} tickets available for ${tier.name}. Please refresh and try again.` 
          });
        }
        
        orderTickets.push({
          ticketTierId: tier._id,
          quantity: t.quantity,
          priceAtPurchase: tier.price
        });

        availabilityUpdates.push({
          tierId: tier._id,
          name: tier.name,
          available: actuallyAvailable - t.quantity,
          reserved: reservedQuantity
        });
      }

      // Save the order
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const order = new Order({
        event: eventId,
        user: user._id,
        tickets: orderTickets,
        status: 'pending',
        expiresAt
      });
      await order.save();

      // Complete booking session if provided
      if (bookingSessionId) {
        activeBookingSessions.delete(bookingSessionId);
      }

      // Emit comprehensive real-time updates
      // Use embedded tiers from event instead of querying deprecated collection
      const allTiers = event.ticketTiers;
      let totalAvailableSeats = 0;
      if (allTiers.length > 0) {
        totalAvailableSeats = allTiers.reduce((sum, tier) => {
          const activeSessionsForTier = Array.from(activeBookingSessions.values())
            .filter(session => session.tierId === tier._id?.toString() && session.eventId === eventId);
          const reservedQuantity = activeSessionsForTier.reduce((sum, session) => sum + session.quantity, 0);
          return sum + ((tier.quantity || 0) - (tier.soldCount || 0) - reservedQuantity);
        }, 0);
      } else if (event.venue && event.venue.capacity) {
        const activeSessionsForEvent = Array.from(activeBookingSessions.values())
          .filter(session => session.eventId === eventId && !session.tierId);
        const reservedQuantity = activeSessionsForEvent.reduce((sum, session) => sum + session.quantity, 0);
        totalAvailableSeats = event.venue.capacity - (event.totalSoldCount || 0) - reservedQuantity;
      }

      io.to(`event_${eventId}`).emit('eventSeatsUpdate', { 
        eventId, 
        availableSeats: totalAvailableSeats,
        tiersAvailable: availabilityUpdates,
        message: 'Order created successfully'
      });

      return res.status(201).json({
        success: true,
        message: 'Order created successfully',
        order: datesToISOString(objectIdsToStrings(order.toObject()))
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async payWithCoins(req: Request & { user?: any }, res: Response) {
    try {
      const { orderId } = req.body;
      const user = req.user;
      if (!orderId) {
        return res.status(400).json({ success: false, message: 'Order ID is required.' });
      }
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
      }
      if (order.user.toString() !== user._id.toString()) {
        return res.status(403).json({ success: false, message: 'You do not have access to this order.' });
      }
      if (order.status === 'paid') {
        return res.status(400).json({ success: false, message: 'Order is already paid.' });
      }

      // Validate sale dates - check if booking is currently allowed
      const event = await Event.findById(order.event);
      if (event) {
        const now = new Date();
        
        if (event.saleStart && now < event.saleStart) {
          const saleStartDate = new Date(event.saleStart);
          const formattedDate = saleStartDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          return res.status(400).json({ 
            success: false, 
            message: `Booking has not started yet. You can book tickets starting from ${formattedDate}.` 
          });
        }
        
        if (event.saleEnd && now > event.saleEnd) {
          const saleEndDate = new Date(event.saleEnd);
          const formattedDate = saleEndDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          return res.status(400).json({ 
            success: false, 
            message: `Booking has ended. Ticket sales closed on ${formattedDate}.` 
          });
        }
      }

      // Validate ticket availability before processing payment
      if (order.tickets && Array.isArray(order.tickets) && order.tickets.length > 0) {
        // Check if any tickets have ticketTierId
        const hasTicketTiers = order.tickets.some(t => t.ticketTierId);
        
        if (hasTicketTiers) {
          const ticketTierIds = order.tickets.map(t => t.ticketTierId).filter(id => id);
          const tiers = await Event.findById(order.event).select('ticketTiers');
          
          for (const ticket of order.tickets) {
            if (ticket.ticketTierId) {
              const tier = tiers?.ticketTiers.find(tt => tt._id.toString() === ticket.ticketTierId.toString());
              if (tier) {
                const available = tier.quantity - (tier.soldCount || 0);
                if (available <= 0) {
                  return res.status(400).json({ success: false, message: `Tickets are no longer available for ${tier.name}. Please try a different ticket type or contact support.` });
                }
                if (ticket.quantity > available) {
                  return res.status(400).json({ success: false, message: `Only ${available} tickets available for ${tier.name}, but you ordered ${ticket.quantity}. Please reduce quantity or try a different ticket type.` });
                }
              }
            }
          }
        } else {
          // For general admission (no ticket tiers), check event capacity
          const event = await Event.findById(order.event);
          if (event && event.venue && event.venue.capacity) {
            const totalSoldCount = event.totalSoldCount || 0;
            const totalOrderedQuantity = order.tickets.reduce((sum, t) => sum + (t.quantity || 0), 0);
            const available = event.venue.capacity - totalSoldCount;
            
            if (available <= 0) {
              return res.status(400).json({ success: false, message: 'Event is sold out. No tickets available.' });
            }
            if (totalOrderedQuantity > available) {
              return res.status(400).json({ success: false, message: `Only ${available} tickets available, but you ordered ${totalOrderedQuantity}. Please reduce quantity or contact support.` });
            }
          }
        }
      }

      // Calculate total amount and apply membership discount using centralized logic
      const totalAmount = order.tickets.reduce((sum, t) => sum + t.priceAtPurchase * t.quantity, 0);
      
      // Use the same discount calculation as payment controller for consistency
      const { PaymentService } = await import('../services/payment.service');
      const { UserRepository } = await import('../repositories/user.repository');
      const { PaymentRepository } = await import('../repositories/payment.repository');
      const { DineInSessionRepository } = await import('../repositories/dineInSession.repository');
      const { OutletRepository } = await import('../repositories/outlet.repository');
      const { EventRepository } = await import('../repositories/event.repository');
      
      const paymentService = new PaymentService(
        new PaymentRepository(),
        new UserRepository(),
        new DineInSessionRepository(),
        new OutletRepository(),
        new EventRepository()
      );
      
      const discountResult = await paymentService.calculateDiscount(
        user._id.toString(),
        totalAmount,
        undefined,
        order.event?.toString()
      );
      const finalAmount = Math.max(0, Math.round(totalAmount - (discountResult?.discountAmount || 0)));

      // Check user coins
      if (user.coins < finalAmount) {
        return res.status(402).json({
          success: false,
          message: 'Insufficient coins in wallet',
          requiredCoins: finalAmount,
          currentCoins: user.coins
        });
      }

      // Deduct coins and mark order as paid
      user.coins -= finalAmount;
      await user.save();
      order.status = 'paid';
      order.expiresAt = undefined; // Remove expiration so paid orders are not deleted
      await order.save();
      // Update soldCount for each ticket tier
      let hasTiers = false;
      for (const ticket of order.tickets) {
        if (ticket.ticketTierId) {
          hasTiers = true;
          await updateTicketTierSoldCount(ticket.ticketTierId.toString(), ticket.quantity, order.event.toString());
        }
      }
      // If no ticket tiers, update totalSoldCount on Event separately
      if (!hasTiers) {
        await updateEventTotalSoldCount(order.event.toString(), order.tickets.reduce((sum, t) => sum + t.quantity, 0));
      }
      // Emit availableSeats update via websocket
      const allTiers = await Event.findById(order.event).select('ticketTiers');
      let availableSeats = 0;
      if (allTiers?.ticketTiers.length > 0) {
        availableSeats = allTiers.ticketTiers.reduce((sum, tier) => sum + ((tier.quantity || 0) - (tier.soldCount || 0)), 0);
      } else {
        const eventDoc = await Event.findById(order.event);
        availableSeats = eventDoc?.venue?.capacity || 0;
      }
      io.to(`event_${order.event}`).emit('eventSeatsUpdate', { eventId: order.event, availableSeats });

      // Optionally: Add reward points here

      // Send ticket email
      const emailService = EmailService.getInstance();
      const eventDoc = await Event.findById(order.event);
      await emailService.sendTicketEmail({
        to: user.email,
        event: {
          name: eventDoc?.name || '',
          date: eventDoc?.date ? eventDoc.date.toISOString().split('T')[0] : '',
          venue: eventDoc?.venue?.name || ''
        },
        tickets: order.tickets.map(t => ({
          qrCodeUrl: '', // You may want to generate or fetch QR codes here if needed
          ticketTierName: '', // You may want to fetch ticket tier names here if needed
          quantity: t.quantity
        })),
        userName: user.name || '',
        startTime: eventDoc?.startTime || '',
        endTime: eventDoc?.endTime || ''
      });

      return res.status(200).json({
        success: true,
        message: 'Payment successful. Order is now paid.',
        order: datesToISOString(objectIdsToStrings(order.toObject()))
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getMyOrders(req: Request & { user?: any }, res: Response) {
    try {
      const userId = req.user._id;
      // Fetch orders for this user, including ticket info
      const orders = await Order.find({ user: userId })
        .populate('tickets') // adjust as per your schema
        .sort({ createdAt: -1 });
      res.json({ success: true, orders });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch orders', error: err.message });
    }
  }

  async requestOrderCancellation(req: Request & { user?: any }, res: Response) {
    try {
      const userId = req.user._id;
      const { orderId } = req.params;
      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
      if (order.user.toString() !== userId.toString()) return res.status(403).json({ success: false, message: 'Unauthorized.' });
      if (order.status === 'cancelled' || order.status === 'refunded') return res.status(400).json({ success: false, message: 'Order already cancelled or refunded.' });
      // Instantly process refund
      order.status = 'refunded';
      await order.save();
      await Ticket.updateMany({ orderId: order._id }, { status: 'refunded' });
      
      // Decrement sold counts for ticket tiers
      let hasTiers = false;
      for (const ticket of order.tickets) {
        if (ticket.ticketTierId) {
          hasTiers = true;
          await decrementTicketTierSoldCount(ticket.ticketTierId.toString(), ticket.quantity, order.event.toString());
        }
      }
      // If no ticket tiers, decrement totalSoldCount on Event separately
      if (!hasTiers) {
        await decrementEventTotalSoldCount(order.event.toString(), order.tickets.reduce((sum, t) => sum + t.quantity, 0));
      }
      
      // Return coins to the user
      const user = await User.findById(order.user);
      if (user) {
        let refundAmount = 0;
        if (order.tickets && Array.isArray(order.tickets)) {
          refundAmount = order.tickets.reduce((sum, t) => sum + (t.priceAtPurchase * t.quantity), 0);
        }
        user.coins = (user.coins || 0) + refundAmount;
        await user.save();
      }
      return res.json({ success: true, message: 'Order refunded, tickets cancelled, and coins returned to user.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

// Place this OUTSIDE the class and export as named export
export const resendOrderTickets = async (req: Request & { user?: any }, res: Response) => {
  try {
    const { orderId } = req.params;
    const user = req.user;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    if (order.user.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You do not have access to this order.' });
    }
    if (order.status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Order is not paid.' });
    }
    // Invalidate old tickets
    await Ticket.updateMany({ orderId: order._id, status: 'active' }, { $set: { status: 'invalidated' } });
    // Get event and ticket tier info
    const eventDoc = await Event.findById(order.event);
    const tickets = [];
    for (const ticket of order.tickets) {
      const ticketTier = await Event.findById(order.event).select('ticketTiers').then(event => event?.ticketTiers.find(tt => tt._id.toString() === ticket.ticketTierId.toString()));
      // Generate a new ObjectId for the ticket
      const tempTicketId = new mongoose.Types.ObjectId();
      // Build a user-friendly, formatted QR code payload (no ticketId)
      const qrPayload =
        '==============================\n' +
        '  🎟️  CityFeed Event Ticket  🎟️\n' +
        '==============================\n' +
        `Event: ${eventDoc?.name || ''}\n` +
        `Date: ${eventDoc?.date ? eventDoc.date.toISOString().split('T')[0] : ''}\n` +
        `Venue: ${eventDoc?.venue?.name || ''}\n` +
        `Ticket Type: ${ticketTier ? ticketTier.name : ''}\n` +
        `Admits: ${ticket.quantity}\n` +
        `Ticket ID: ${tempTicketId}\n` +
        `Status: Active\n` +
        '------------------------------\n' +
        'Show this QR code at entry.\n' +
        'Enjoy the event!\n' +
        '==============================';
      const qrBuffer = await QRCode.toBuffer(qrPayload);
      // Upload to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'image', folder: 'tickets' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(qrBuffer);
      });
      const qrCodeUrl = (uploadResult as any).secure_url;
      // Create the new ticket document
      const ticketDoc = await Ticket.create({
        _id: tempTicketId,
        orderId: order._id,
        userId: user._id,
        eventId: order.event,
        ticketTierId: ticket.ticketTierId,
        qrCodeUrl,
        quantity: ticket.quantity,
        status: 'active',
        issuedAt: new Date()
      });
      tickets.push({
        _id: ticketDoc._id,
        ticketTierId: ticket.ticketTierId,
        ticketTierName: ticketTier ? ticketTier.name : '',
        qrCodeUrl,
        quantity: ticket.quantity,
        status: ticketDoc.status,
        issuedAt: ticketDoc.issuedAt
      });
    }
    // Send ticket email
    const emailService = EmailService.getInstance();
    await emailService.sendTicketEmail({
      to: user.email,
      event: {
        name: eventDoc?.name || '',
        date: eventDoc?.date ? eventDoc.date.toISOString().split('T')[0] : '',
        venue: eventDoc?.venue?.name || ''
      },
      tickets: tickets.map(t => ({ qrCodeUrl: t.qrCodeUrl, ticketTierName: t.ticketTierName, quantity: t.quantity })),
      userName: user.name || '',
      startTime: eventDoc?.startTime || '',
      endTime: eventDoc?.endTime || ''
    });
    return res.status(200).json({ success: true, message: 'Tickets resent successfully', tickets });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}; 