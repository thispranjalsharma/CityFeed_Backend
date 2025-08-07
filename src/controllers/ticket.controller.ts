import { Request, Response } from 'express';
import { Ticket } from '../models/ticket.model';
import { AuthRequest } from '../interfaces/auth.interface';
import mongoose from 'mongoose';
import { io } from '../server';

// GET /api/tickets/:ticketId (public)
export const getTicketInfo = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findById(ticketId)
      .populate({ path: 'eventId' })
      .populate({ path: 'ticketTierId' })
      .populate({ path: 'userId', select: 'name email phone' })
      .populate({ path: 'scannedBy', select: 'name email' });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const event = ticket.eventId as any;
    const user = ticket.userId as any;
    res.json({
      ticketId: ticket._id,
      status: ticket.status,
      quantity: ticket.quantity,
      issuedAt: ticket.issuedAt,
      scannedAt: ticket.scannedAt,
      qrCodeUrl: ticket.qrCodeUrl,
      event: event ? {
        id: event._id,
        name: event.name,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        venue: event.venue,
        description: event.description,
        coverImages: event.coverImages,
        type: event.type,
        refundPolicy: event.refundPolicy,
        specialInstructions: event.specialInstructions
      } : null,
      ticketTier: (ticket.ticketTierId && typeof ticket.ticketTierId === 'object' && 'name' in ticket.ticketTierId) ? {
        id: (ticket.ticketTierId as any)._id,
        name: (ticket.ticketTierId as any).name,
        price: (ticket.ticketTierId as any).price,
        description: (ticket.ticketTierId as any).description
      } : null,
      user: user ? {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      } : null,
      scannedBy: ticket.scannedBy,
      orderId: ticket.orderId
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/tickets/scan (staff only)
export const scanTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.body;
    const staffId = req.user?._id; // Assumes auth middleware sets req.user
    const ticket = await Ticket.findById(ticketId)
      .populate('eventId')
      .populate('ticketTierId');
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.status === 'used') {
      return res.status(400).json({
        success: false,
        message: `Ticket already used at ${ticket.scannedAt}`,
        scannedAt: ticket.scannedAt,
      });
    }
    ticket.status = 'used';
    ticket.scannedAt = new Date();
    ticket.scannedBy = staffId ? new mongoose.Types.ObjectId(staffId) : null;
    await ticket.save();
    // Emit real-time update to event room
    if (ticket.eventId) {
      io.to(`event_${ticket.eventId}`).emit('ticketUpdate', {
        ticketId: ticket._id,
        eventId: ticket.eventId,
        status: ticket.status,
        scannedAt: ticket.scannedAt,
        scannedBy: ticket.scannedBy,
      });
    }
    // Prepare response without status, with startTime and endTime
    const event = ticket.eventId as any;
    res.json({
      success: true,
      message: 'Entry allowed',
      ticket: {
        _id: ticket._id,
        event: {
          _id: event?._id,
          name: event?.name,
          date: event?.date,
          venue: event?.venue?.name,
          startTime: event?.startTime,
          endTime: event?.endTime
        },
        user: ticket.userId,
        ticketTier: (ticket.ticketTierId && typeof ticket.ticketTierId === 'object' && 'name' in ticket.ticketTierId) ? {
          _id: (ticket.ticketTierId as any)._id,
          name: (ticket.ticketTierId as any).name
        } : null,
        quantity: ticket.quantity,
        issuedAt: ticket.issuedAt,
        scannedAt: ticket.scannedAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/tickets/my (user's tickets)
export const getMyTickets = async (req: AuthRequest, res: Response) => {
  const userId = req.user?._id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    let objectUserId;
    try {
      objectUserId = new mongoose.Types.ObjectId(userId);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const tickets = await Ticket.find({ userId: objectUserId })
      .populate('eventId')
      .populate('ticketTierId')
      .lean();
    return res.json({ success: true, tickets });
  } catch (queryErr: any) {
    return res.status(500).json({
      error: 'Query error',
      details: queryErr?.message,
      stack: queryErr?.stack,
      query: { userId }
    });
  }
}; 