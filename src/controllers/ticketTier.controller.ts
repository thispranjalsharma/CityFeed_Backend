import { Request, Response } from "express";
import { injectable } from "inversify";
import { Event } from "../models/event.model";

@injectable()
export class TicketTierController {
  async createTicketTier(
    req: Request & { user?: { _id: string; role: string } },
    res: Response
  ) {
    try {
      const user = req.user;
      if (!user || !["event_organizer", "event_manager"].includes(user.role)) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Only event organizers or managers can create ticket tiers.",
          });
      }

      const { eventId, tiers } = req.body;
      if (!eventId || !Array.isArray(tiers) || tiers.length === 0) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Event ID and at least one ticket tier are required.",
          });
      }

      const event = await Event.findById(eventId);
      if (!event) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found." });
      }
      const isCreator = event.createdBy.toString() === user._id;
      const isManager =
        event.managerId && event.managerId.toString() === user._id;
      if (!isCreator && !isManager) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Forbidden: Not allowed to manage ticket tiers for this event.",
          });
      }

      const eventCapacity = event.venue?.capacity || 0;

      const existingTotalQty = event.ticketTiers.reduce(
        (sum, tier) => sum + tier.quantity,
        0
      );
      let incomingQtySum = 0;
      const incomingOrders = new Set<number>();

      for (const tier of tiers) {
        const { name, price, quantity, order } = tier;
        if (!name || !price || !quantity || !order) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "All ticket tier fields (name, price, quantity, order) are required.",
            });
        }
        if (price < 0 || quantity < 1 || order < 1) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Price must be non-negative, quantity must be at least 1, and order must be at least 1.",
            });
        }
        if (incomingOrders.has(order)) {
          return res
            .status(409)
            .json({
              success: false,
              message: `Order ${order} already exists for this event.`,
            });
        }
        incomingOrders.add(order);
        if (
          event.ticketTiers.some((existingTier) => existingTier.order === order)
        ) {
          return res
            .status(409)
            .json({
              success: false,
              message: `Order ${order} already exists for this event.`,
            });
        }
        incomingQtySum += quantity;
      }

      if (existingTotalQty + incomingQtySum > eventCapacity) {
        return res
          .status(400)
          .json({
            success: false,
            message: `Total ticket quantities (${
              existingTotalQty + incomingQtySum
            }) exceed event capacity (${eventCapacity}).`,
          });
      }

      const newTicketTiers = tiers.map((tier: any) => ({
        name: tier.name,
        price: tier.price,
        quantity: tier.quantity,
        description: tier.description,
        order: tier.order,
        isActive: tier.isActive !== undefined ? tier.isActive : true,
        soldCount: 0,
      }));

      event.ticketTiers.push(...newTicketTiers);
      await event.save();

      return res.status(201).json({ success: true, data: newTicketTiers });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async getTicketTiers(
    req: Request & { user?: { _id: string; role: string } },
    res: Response
  ) {
    try {
      const user = req.user;
      if (!user || !["event_organizer", "event_manager"].includes(user.role)) {
        return res
          .status(403)
          .json({
            success: false,
            message: "Only event organizers or managers can view ticket tiers.",
          });
      }

      const { eventId } = req.params;

      if (!eventId) {
        return res
          .status(400)
          .json({ success: false, message: "Event ID is required." });
      }

      const event = await Event.findById(eventId);
      if (!event) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found." });
      }

      const isCreator = event.createdBy.toString() === user._id;
      const isManager =
        event.managerId && event.managerId.toString() === user._id;

      if (!isCreator && !isManager) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Forbidden: Not allowed to view ticket tiers for this event.",
          });
      }

      const ticketTiers = event.ticketTiers.sort((a, b) => a.order - b.order);
      return res.status(200).json({ success: true, data: ticketTiers });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Implement other methods similarly...

  async updateTicketTier(
    req: Request & { user?: { _id: string; role: string } },
    res: Response
  ) {
    try {
      const user = req.user;
      if (!user || !["event_organizer", "event_manager"].includes(user.role)) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Only event organizers or managers can update ticket tiers.",
          });
      }

      const { ticketTierId } = req.params;
      const { name, price, quantity, description, order, isActive } = req.body;

      if (!ticketTierId) {
        return res
          .status(400)
          .json({ success: false, message: "Ticket tier ID is required." });
      }

      // Find the event that contains this ticket tier
      const event = await Event.findOne({ "ticketTiers._id": ticketTierId });
      if (!event) {
        return res
          .status(404)
          .json({ success: false, message: "Ticket tier not found." });
      }

      // Check authorization: only creator or assigned manager can update ticket tiers
      const isCreator = event.createdBy.toString() === user._id;
      const isManager =
        event.managerId && event.managerId.toString() === user._id;

      if (!isCreator && !isManager) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Forbidden: Not allowed to update ticket tiers for this event.",
          });
      }

      // Find the specific ticket tier in the embedded array
      const ticketTierIndex = event.ticketTiers.findIndex(
        (tier) => tier._id.toString() === ticketTierId
      );
      if (ticketTierIndex === -1) {
        return res
          .status(404)
          .json({ success: false, message: "Ticket tier not found." });
      }

      const ticketTier = event.ticketTiers[ticketTierIndex];

      // Validate price and quantity if provided
      if (price !== undefined && price < 0) {
        return res
          .status(400)
          .json({ success: false, message: "Price must be non-negative." });
      }
      if (quantity !== undefined && quantity < 1) {
        return res
          .status(400)
          .json({ success: false, message: "Quantity must be at least 1." });
      }
      if (order !== undefined && order < 1) {
        return res
          .status(400)
          .json({ success: false, message: "Order must be at least 1." });
      }

      // Check if new order conflicts with existing order (if order is being updated)
      if (order !== undefined && order !== ticketTier.order) {
        const existingOrder = event.ticketTiers.some(
          (tier) => tier._id.toString() !== ticketTierId && tier.order === order
        );
        if (existingOrder) {
          return res
            .status(409)
            .json({
              success: false,
              message:
                "A ticket tier with this order already exists for this event.",
            });
        }
      }

      // Capacity enforcement if quantity is updated
      const newQuantity =
        quantity !== undefined ? quantity : ticketTier.quantity;
      const eventCapacity = event.venue?.capacity || 0;

      // Calculate total quantity from other ticket tiers
      const otherTotal = event.ticketTiers.reduce((sum, tier) => {
        if (tier._id.toString() !== ticketTierId) {
          return sum + tier.quantity;
        }
        return sum;
      }, 0);

      if (otherTotal + newQuantity > eventCapacity) {
        return res
          .status(400)
          .json({
            success: false,
            message: `Total ticket quantities (${
              otherTotal + newQuantity
            }) exceed event capacity (${eventCapacity}).`,
          });
      }

      // Update the embedded ticket tier
      if (name !== undefined) ticketTier.name = name;
      if (price !== undefined) ticketTier.price = price;
      if (quantity !== undefined) ticketTier.quantity = quantity;
      if (description !== undefined) ticketTier.description = description;
      if (order !== undefined) ticketTier.order = order;
      if (isActive !== undefined) ticketTier.isActive = isActive;

      // Save the updated event
      await event.save();

      return res.status(200).json({ success: true, data: ticketTier });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async deleteTicketTier(
    req: Request & { user?: { _id: string; role: string } },
    res: Response
  ) {
    try {
      const user = req.user;
      if (!user || !["event_organizer", "event_manager"].includes(user.role)) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Only event organizers or managers can delete ticket tiers.",
          });
      }

      const { ticketTierId } = req.params;

      if (!ticketTierId) {
        return res
          .status(400)
          .json({ success: false, message: "Ticket tier ID is required." });
      }

      // Find the event that contains this ticket tier
      const event = await Event.findOne({ "ticketTiers._id": ticketTierId });
      if (!event) {
        return res
          .status(404)
          .json({ success: false, message: "Ticket tier not found." });
      }

      // Check authorization: only creator or assigned manager can delete ticket tiers
      const isCreator = event.createdBy.toString() === user._id;
      const isManager =
        event.managerId && event.managerId.toString() === user._id;

      if (!isCreator && !isManager) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Forbidden: Not allowed to delete ticket tiers for this event.",
          });
      }

      // Find the specific ticket tier in the embedded array
      const ticketTierIndex = event.ticketTiers.findIndex(
        (tier) => tier._id.toString() === ticketTierId
      );
      if (ticketTierIndex === -1) {
        return res
          .status(404)
          .json({ success: false, message: "Ticket tier not found." });
      }

      const ticketTier = event.ticketTiers[ticketTierIndex];

      // Check if tickets have been sold
      if (ticketTier.soldCount > 0) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Cannot delete ticket tier that has sold tickets.",
          });
      }

      // Remove the tier from the embedded array
      event.ticketTiers.splice(ticketTierIndex, 1);
      await event.save();

      return res
        .status(200)
        .json({ success: true, message: "Ticket tier deleted successfully." });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async bulkCreateTicketTiers(
    req: Request & { user?: { _id: string; role: string } },
    res: Response
  ) {
    try {
      const user = req.user;
      const { eventId, tiers } = req.body;
      if (!user || !["event_organizer", "event_manager"].includes(user.role)) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Only event organizers or managers can create ticket tiers.",
          });
      }
      if (!eventId || !Array.isArray(tiers) || tiers.length === 0) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Event ID and at least one ticket tier are required.",
          });
      }
      const event = await Event.findById(eventId);
      if (!event) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found." });
      }
      const isCreator = event.createdBy.toString() === user._id;
      const isManager =
        event.managerId && event.managerId.toString() === user._id;
      if (!isCreator && !isManager) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Forbidden: Not allowed to manage ticket tiers for this event.",
          });
      }

      // Validate and check for duplicate orders
      const eventCapacity = event.venue?.capacity || 0;

      // Calculate total quantity from existing embedded ticket tiers
      const existingTotalQty = event.ticketTiers.reduce(
        (sum, tier) => sum + tier.quantity,
        0
      );

      const incomingOrders = new Set<number>();
      let incomingQtySum = 0;

      for (const tier of tiers) {
        const { name, price, quantity, order } = tier;
        if (
          !name ||
          price === undefined ||
          quantity === undefined ||
          order === undefined
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message: "Each tier must have name, price, quantity, and order.",
            });
        }
        if (price < 0) {
          return res
            .status(400)
            .json({ success: false, message: "Price must be non-negative." });
        }
        if (quantity < 1) {
          return res
            .status(400)
            .json({ success: false, message: "Quantity must be at least 1." });
        }
        if (order < 1) {
          return res
            .status(400)
            .json({ success: false, message: "Order must be at least 1." });
        }
        if (incomingOrders.has(order)) {
          return res
            .status(409)
            .json({
              success: false,
              message: `Duplicate order ${order} in request payload.`,
            });
        }
        incomingOrders.add(order);
        incomingQtySum += quantity;

        // Check for duplicate order numbers with existing tiers
        if (
          event.ticketTiers.some((existingTier) => existingTier.order === order)
        ) {
          return res
            .status(409)
            .json({
              success: false,
              message: `Order ${order} already exists for this event.`,
            });
        }
      }

      if (existingTotalQty + incomingQtySum > eventCapacity) {
        return res
          .status(400)
          .json({
            success: false,
            message: `Total ticket quantities (${
              existingTotalQty + incomingQtySum
            }) exceed event capacity (${eventCapacity}).`,
          });
      }

      // Create embedded ticket tier objects (without _id, createdAt, updatedAt)
      const newTicketTiers = tiers.map((tier: any) => ({
        name: tier.name,
        price: tier.price,
        quantity: tier.quantity,
        description: tier.description,
        order: tier.order,
        isActive: tier.isActive !== undefined ? tier.isActive : true,
        soldCount: 0,
      }));

      // Add new ticket tiers to the event's embedded array
      event.ticketTiers.push(...newTicketTiers);
      await event.save();

      return res.status(201).json({ success: true, data: newTicketTiers });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async getEventWithTiers(
    req: Request & { user?: { _id: string; role: string } },
    res: Response
  ) {
    try {
      const user = req.user;
      const { eventId } = req.params;
      if (!user || !["event_organizer", "event_manager"].includes(user.role)) {
        return res
          .status(403)
          .json({
            success: false,
            message: "Only event organizers or managers can view event tiers.",
          });
      }
      if (!eventId) {
        return res
          .status(400)
          .json({ success: false, message: "Event ID is required." });
      }
      const event = await Event.findById(eventId);
      if (!event) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found." });
      }
      // Check permission
      const isCreator = event.createdBy.toString() === user._id;
      const isManager =
        event.managerId && event.managerId.toString() === user._id;
      if (!isCreator && !isManager) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Forbidden: Not allowed to view ticket tiers for this event.",
          });
      }

      // Return the event with embedded ticket tiers
      return res.status(200).json({ success: true, event });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
}
