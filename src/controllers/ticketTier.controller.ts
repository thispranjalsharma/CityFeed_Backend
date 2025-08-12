import { Request, Response } from 'express';
import { TicketTier } from '../models/ticketTier.model';
import { Event } from '../models/event.model';

export class TicketTierController {
  async createTicketTier(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const user = req.user;
      if (!user || !['event_organizer', 'event_manager'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Only event organizers or managers can create ticket tiers.' });
      }

      // Accepts: { eventId: string, tiers: Array<{ name, price, quantity, description, order, isActive? }> }
      const { eventId, tiers } = req.body;
      if (!eventId || !Array.isArray(tiers) || tiers.length === 0) {
        return res.status(400).json({ success: false, message: 'Event ID and at least one ticket tier are required.' });
      }

      // Check if event exists and user has permission
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }
      const isCreator = event.createdBy.toString() === user._id;
      const isManager = event.managerId && event.managerId.toString() === user._id;
      if (!isCreator && !isManager) {
        return res.status(403).json({ success: false, message: 'Forbidden: Not allowed to manage ticket tiers for this event.' });
      }

      // Validate and create each tier
      // Capacity enforcement setup: current allocated quantity
      const currentAgg = await TicketTier.aggregate([
        { $match: { event: eventId } },
        { $group: { _id: null, totalQty: { $sum: '$quantity' } } }
      ]);
      let runningAllocatedQty = currentAgg[0]?.totalQty || 0;
      const eventCapacity = event.venue?.capacity || 0;

      const createdTiers = [];
      for (const tier of tiers) {
        const { name, price, quantity, description, order, isActive } = tier;
        if (!name || price === undefined || quantity === undefined || order === undefined) {
          return res.status(400).json({ success: false, message: 'Each tier must have name, price, quantity, and order.' });
        }
        if (price < 0) {
          return res.status(400).json({ success: false, message: 'Price must be non-negative.' });
        }
        if (quantity < 1) {
          return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
        }
        if (order < 1) {
          return res.status(400).json({ success: false, message: 'Order must be at least 1.' });
        }
        // Check if order already exists for this event
        const existingOrder = await TicketTier.findOne({ event: eventId, order });
        if (existingOrder) {
          // If the existing TicketTier is not embedded in the Event anymore, treat it as stale and remove it
          const eventDoc = await Event.findById(eventId).lean();
          const isEmbedded = Array.isArray(eventDoc?.ticketTiers)
            ? eventDoc!.ticketTiers.some((t: any) => t && t._id && t._id.toString() === existingOrder._id.toString())
            : false;
          const hasOrderInEmbedded = Array.isArray(eventDoc?.ticketTiers)
            ? eventDoc!.ticketTiers.some((t: any) => t && t.order === order)
            : false;
          if (!isEmbedded && !hasOrderInEmbedded) {
            // Stale doc: remove it and proceed
            await TicketTier.findByIdAndDelete(existingOrder._id);
          } else {
            return res.status(409).json({ success: false, message: `A ticket tier with order ${order} already exists for this event.` });
          }
        }
        // Capacity enforcement: ensure not exceeding event capacity
        if (runningAllocatedQty + quantity > eventCapacity) {
          return res.status(400).json({ success: false, message: `Total ticket quantities (${runningAllocatedQty + quantity}) exceed event capacity (${eventCapacity}).` });
        }

        const ticketTier = new TicketTier({
          event: eventId,
          name,
          price,
          quantity,
          description,
          order,
          isActive: isActive !== undefined ? isActive : true
        });
        await ticketTier.save();
        createdTiers.push(ticketTier);
        // Embed the ticket tier in the event document as well
        await Event.findByIdAndUpdate(
          eventId,
          { $push: { ticketTiers: ticketTier.toObject() } }
        );
        runningAllocatedQty += quantity;
      }
      return res.status(201).json({ success: true, data: createdTiers });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async getTicketTiers(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const user = req.user;
      if (!user || !['event_organizer', 'event_manager'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Only event organizers or managers can view ticket tiers.' });
      }

      const { eventId } = req.params;
      
      if (!eventId) {
        return res.status(400).json({ success: false, message: 'Event ID is required.' });
      }

      // Check if event exists and user has permission
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }

      // Check authorization: only creator or assigned manager can view ticket tiers
      const isCreator = event.createdBy.toString() === user._id;
      const isManager = event.managerId && event.managerId.toString() === user._id;

      if (!isCreator && !isManager) {
        return res.status(403).json({ success: false, message: 'Forbidden: Not allowed to view ticket tiers for this event.' });
      }

      const ticketTiers = await TicketTier.find({ event: eventId }).sort({ order: 1 });
      return res.status(200).json({ success: true, data: ticketTiers });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async updateTicketTier(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const user = req.user;
      if (!user || !['event_organizer', 'event_manager'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Only event organizers or managers can update ticket tiers.' });
      }

      const { ticketTierId } = req.params;
      const { name, price, quantity, description, order, isActive } = req.body;

      if (!ticketTierId) {
        return res.status(400).json({ success: false, message: 'Ticket tier ID is required.' });
      }

      const ticketTier = await TicketTier.findById(ticketTierId);
      if (!ticketTier) {
        return res.status(404).json({ success: false, message: 'Ticket tier not found.' });
      }

      // Check if event exists and user has permission
      const event = await Event.findById(ticketTier.event);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }

      // Check authorization: only creator or assigned manager can update ticket tiers
      const isCreator = event.createdBy.toString() === user._id;
      const isManager = event.managerId && event.managerId.toString() === user._id;

      if (!isCreator && !isManager) {
        return res.status(403).json({ success: false, message: 'Forbidden: Not allowed to update ticket tiers for this event.' });
      }

      // Validate price and quantity if provided
      if (price !== undefined && price < 0) {
        return res.status(400).json({ success: false, message: 'Price must be non-negative.' });
      }
      if (quantity !== undefined && quantity < 1) {
        return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
      }
      if (order !== undefined && order < 1) {
        return res.status(400).json({ success: false, message: 'Order must be at least 1.' });
      }

      // Check if new order conflicts with existing order (if order is being updated)
      if (order !== undefined && order !== ticketTier.order) {
        const existingOrder = await TicketTier.findOne({ 
          event: ticketTier.event, 
          order, 
          _id: { $ne: ticketTierId } 
        });
        if (existingOrder) {
          return res.status(409).json({ success: false, message: 'A ticket tier with this order already exists for this event.' });
        }
      }

      // Capacity enforcement if quantity is updated
      const newQuantity = quantity !== undefined ? quantity : ticketTier.quantity;
      const capEvent = await Event.findById(ticketTier.event);
      const eventCapacity = capEvent?.venue?.capacity || 0;
      const otherAgg = await TicketTier.aggregate([
        { $match: { event: ticketTier.event, _id: { $ne: ticketTier._id } } },
        { $group: { _id: null, totalQty: { $sum: '$quantity' } } }
      ]);
      const otherTotal = otherAgg[0]?.totalQty || 0;
      if (otherTotal + newQuantity > eventCapacity) {
        return res.status(400).json({ success: false, message: `Total ticket quantities (${otherTotal + newQuantity}) exceed event capacity (${eventCapacity}).` });
      }

      // Update ticket tier
      Object.assign(ticketTier, req.body);
      await ticketTier.save();

      return res.status(200).json({ success: true, data: ticketTier });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async deleteTicketTier(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const user = req.user;
      if (!user || !['event_organizer', 'event_manager'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Only event organizers or managers can delete ticket tiers.' });
      }

      const { ticketTierId } = req.params;

      if (!ticketTierId) {
        return res.status(400).json({ success: false, message: 'Ticket tier ID is required.' });
      }

      const ticketTier = await TicketTier.findById(ticketTierId);
      if (!ticketTier) {
        return res.status(404).json({ success: false, message: 'Ticket tier not found.' });
      }

      // Check if event exists and user has permission
      const event = await Event.findById(ticketTier.event);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }

      // Check authorization: only creator or assigned manager can delete ticket tiers
      const isCreator = event.createdBy.toString() === user._id;
      const isManager = event.managerId && event.managerId.toString() === user._id;

      if (!isCreator && !isManager) {
        return res.status(403).json({ success: false, message: 'Forbidden: Not allowed to delete ticket tiers for this event.' });
      }

      // Check if tickets have been sold
      if (ticketTier.soldCount > 0) {
        return res.status(400).json({ success: false, message: 'Cannot delete ticket tier that has sold tickets.' });
      }

      // Remove the tier from the embedded array on the Event document as well
      await Event.findByIdAndUpdate(ticketTier.event, {
        $pull: { ticketTiers: { _id: ticketTier._id } }
      });

      await TicketTier.findByIdAndDelete(ticketTierId);
      return res.status(200).json({ success: true, message: 'Ticket tier deleted successfully.' });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async bulkCreateTicketTiers(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const user = req.user;
      const { eventId, tiers } = req.body;
      if (!user || !['event_organizer', 'event_manager'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Only event organizers or managers can create ticket tiers.' });
      }
      if (!eventId || !Array.isArray(tiers) || tiers.length === 0) {
        return res.status(400).json({ success: false, message: 'Event ID and at least one ticket tier are required.' });
      }
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }
      const isCreator = event.createdBy.toString() === user._id;
      const isManager = event.managerId && event.managerId.toString() === user._id;
      if (!isCreator && !isManager) {
        return res.status(403).json({ success: false, message: 'Forbidden: Not allowed to manage ticket tiers for this event.' });
      }
      // Validate and check for duplicate orders
      const eventDoc = await Event.findById(eventId).lean();
      const eventCapacity = eventDoc?.venue?.capacity || 0;
      const currentAgg = await TicketTier.aggregate([
        { $match: { event: eventId } },
        { $group: { _id: null, totalQty: { $sum: '$quantity' } } }
      ]);
      const currentTotalQty = currentAgg[0]?.totalQty || 0;
      const incomingOrders = new Set<number>();
      let incomingQtySum = 0;
      for (const tier of tiers) {
        const { name, price, quantity, order } = tier;
        if (!name || price === undefined || quantity === undefined || order === undefined) {
          return res.status(400).json({ success: false, message: 'Each tier must have name, price, quantity, and order.' });
        }
        if (price < 0) {
          return res.status(400).json({ success: false, message: 'Price must be non-negative.' });
        }
        if (quantity < 1) {
          return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
        }
        if (order < 1) {
          return res.status(400).json({ success: false, message: 'Order must be at least 1.' });
        }
        if (incomingOrders.has(order)) {
          return res.status(409).json({ success: false, message: `Duplicate order ${order} in request payload.` });
        }
        incomingOrders.add(order);
        incomingQtySum += quantity;
        const existingOrder = await TicketTier.findOne({ event: eventId, order });
        if (existingOrder) {
          const isEmbedded = Array.isArray(eventDoc?.ticketTiers)
            ? eventDoc!.ticketTiers.some((t: any) => t && t._id && t._id.toString() === existingOrder._id.toString())
            : false;
          const hasOrderInEmbedded = Array.isArray(eventDoc?.ticketTiers)
            ? eventDoc!.ticketTiers.some((t: any) => t && t.order === order)
            : false;
          if (!isEmbedded && !hasOrderInEmbedded) {
            await TicketTier.findByIdAndDelete(existingOrder._id);
          } else {
            return res.status(409).json({ success: false, message: `A ticket tier with order ${order} already exists for this event.` });
          }
        }
      }
      if (currentTotalQty + incomingQtySum > eventCapacity) {
        return res.status(400).json({ success: false, message: `Total ticket quantities (${currentTotalQty + incomingQtySum}) exceed event capacity (${eventCapacity}).` });
      }
      // Add eventId to each tier
      const tiersToInsert = tiers.map(tier => ({ ...tier, event: eventId }));
      const createdTiers = await TicketTier.insertMany(tiersToInsert);
      return res.status(201).json({ success: true, data: createdTiers });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async getEventWithTiers(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const user = req.user;
      const { eventId } = req.params;
      if (!user || !['event_organizer', 'event_manager'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Only event organizers or managers can view event tiers.' });
      }
      if (!eventId) {
        return res.status(400).json({ success: false, message: 'Event ID is required.' });
      }
      const event = await Event.findById(eventId).populate('tiers');
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }
      // Check permission
      const isCreator = event.createdBy.toString() === user._id;
      const isManager = event.managerId && event.managerId.toString() === user._id;
      if (!isCreator && !isManager) {
        return res.status(403).json({ success: false, message: 'Forbidden: Not allowed to view ticket tiers for this event.' });
      }
      // Or fetch tiers directly if you want to return as a separate array
      // const tiers = await TicketTier.find({ event: eventId }).sort({ order: 1 });
      // return res.status(200).json({ success: true, event, tiers });
      return res.status(200).json({ success: true, event });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
} 