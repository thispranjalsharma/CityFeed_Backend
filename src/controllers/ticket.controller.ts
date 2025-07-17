import { Request, Response } from 'express';
import { Ticket } from '../models/ticket.model';
import { EventStaff } from '../models/eventStaff.model';
import { AuthRequest } from '../interfaces/auth.interface';
import mongoose from 'mongoose';
import { io } from '../server';

// GET /api/tickets/:ticketId (public)
export const getTicketInfo = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findById(ticketId)
      .populate('eventId')
      .populate('ticketTierId')
      .populate({ path: 'scannedBy', select: 'name email' });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({
      event: ticket.eventId,
      ticketType: ticket.ticketTierId,
      admits: ticket.quantity,
      status: ticket.status,
      scannedAt: ticket.scannedAt,
      scannedBy: ticket.scannedBy,
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
    const ticket = await Ticket.findById(ticketId);
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
    res.json({ success: true, message: 'Entry allowed', ticket });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/tickets/my (user's tickets)
export const getMyTickets = async (req: AuthRequest, res: Response) => {
  const userId = req.user?._id;
  if (!userId) {
    console.error('No userId in request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    let objectUserId;
    try {
      objectUserId = new mongoose.Types.ObjectId(userId);
    } catch (e) {
      console.error('Invalid userId for ObjectId:', userId, e);
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const tickets = await Ticket.find({ userId: objectUserId })
      .populate('eventId')
      .populate('ticketTierId')
      .lean();
    return res.json({ success: true, tickets });
  } catch (queryErr: any) {
    console.error('Error querying tickets:', queryErr, 'userId:', userId);
    return res.status(500).json({
      error: 'Query error',
      details: queryErr?.message,
      stack: queryErr?.stack,
      query: { userId }
    });
  }
}; 