import { Request, Response } from 'express';
import { Event } from '../models/event.model';
import { TicketTier } from '../models/ticketTier.model';
import { Order } from '../models/order.model';
import { Ticket } from '../models/ticket.model';
import { EmailService } from '../services/email.service';
import QRCode from 'qrcode';
import cloudinary from '../config/cloudinary';
import mongoose from 'mongoose';
import { io } from '../server';

export class OrderController {
  async createOrder(req: Request & { user?: any }, res: Response) {
    try {
      const { eventId, tickets } = req.body;
      const user = req.user;
      if (!eventId || !Array.isArray(tickets) || tickets.length === 0) {
        return res.status(400).json({ success: false, message: 'Event ID and at least one ticket are required.' });
      }
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Check event exists
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }

      // Validate each ticket tier and quantity
      const ticketTierIds = tickets.map(t => t.ticketTierId);
      // Ensure eventId is an ObjectId for the query
      const eventObjectId = typeof eventId === 'string' ? new mongoose.Types.ObjectId(eventId) : eventId;
      const tiers = await TicketTier.find({ _id: { $in: ticketTierIds }, event: eventObjectId });
      if (tiers.length === 0) {
        // No ticket tiers: use event.ticketPrice
        if (typeof event.ticketPrice !== 'number' || event.ticketPrice <= 0) {
          return res.status(400).json({ success: false, message: 'No ticket tiers exist and event.ticketPrice is not set or invalid.' });
        }
        // Accept a single ticket object with quantity
        const totalQuantity = tickets.reduce((sum, t) => sum + (t.quantity || 0), 0);
        if (totalQuantity < 1) {
          return res.status(400).json({ success: false, message: 'At least one ticket must be purchased.' });
        }
        if (totalQuantity > (event.venue?.capacity || 0)) {
          return res.status(400).json({ success: false, message: 'Not enough tickets available.' });
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
          status: 'pending'
        });
        await order.save();
        // Emit availableSeats update via websocket
        let availableSeats = (event.venue?.capacity || 0) - totalQuantity;
        io.to(`event_${eventId}`).emit('eventSeatsUpdate', { eventId, availableSeats, tiersAvailable: [] });
        return res.status(201).json({
          success: true,
          message: 'Order created successfully',
          order
        });
      }
      if (tiers.length !== tickets.length) {
        return res.status(404).json({ success: false, message: 'One or more ticket tiers not found for this event.' });
      }

      // Check availability and prepare order tickets
      const orderTickets = [];
      for (const t of tickets) {
        const tier = tiers.find(tt => tt._id.toString() === t.ticketTierId);
        if (!tier) continue;
        const available = tier.quantity - (tier.soldCount || 0);
        if (t.quantity > available) {
          return res.status(400).json({ success: false, message: `Not enough tickets available for ${tier.name}.` });
        }
        orderTickets.push({
          ticketTierId: tier._id,
          quantity: t.quantity,
          priceAtPurchase: tier.price
        });
      }

      // Save the order
      const order = new Order({
        event: eventId,
        user: user._id,
        tickets: orderTickets,
        status: 'pending'
      });
      await order.save();

      // Emit availableSeats update via websocket
      let availableSeats = 0;
      const allTiers = await TicketTier.find({ event: eventId });
      if (allTiers.length > 0) {
        availableSeats = allTiers.reduce((sum, tier) => sum + ((tier.quantity || 0) - (tier.soldCount || 0)), 0);
      } else if (event.venue && event.venue.capacity) {
        availableSeats = event.venue.capacity;
      }
      io.to(`event_${eventId}`).emit('eventSeatsUpdate', { eventId, availableSeats });

      return res.status(201).json({
        success: true,
        message: 'Order created successfully',
        order
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

      // Calculate total amount
      const totalAmount = order.tickets.reduce((sum, t) => sum + t.priceAtPurchase * t.quantity, 0);

      // Check user coins
      if (user.coins < totalAmount) {
        return res.status(402).json({
          success: false,
          message: 'Insufficient coins in wallet',
          requiredCoins: totalAmount,
          currentCoins: user.coins
        });
      }

      // Deduct coins and mark order as paid
      user.coins -= totalAmount;
      await user.save();
      order.status = 'paid';
      await order.save();

      // Optionally: Add reward points here

      return res.status(200).json({
        success: true,
        message: 'Payment successful. Order is now paid.',
        order
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
      // Return coins to the user
      const User = require('../models/user.model').User;
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
      const ticketTier = await TicketTier.findById(ticket.ticketTierId);
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
    const emailService = new EmailService();
    await emailService.sendTicketEmail({
      to: user.email,
      event: {
        name: eventDoc?.name || '',
        date: eventDoc?.date ? eventDoc.date.toISOString().split('T')[0] : '',
        venue: eventDoc?.venue?.name || ''
      },
      tickets: tickets.map(t => ({ qrCodeUrl: t.qrCodeUrl, ticketTierName: t.ticketTierName, quantity: t.quantity }))
    });
    return res.status(200).json({ success: true, message: 'Tickets resent successfully', tickets });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}; 