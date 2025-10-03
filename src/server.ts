import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import App from "./app";
import { errorHandler } from "./middleware/error.middleware";
import { config } from "./config/config";
import { logger } from "./utils/logger.util";
import Routers from "./routes/router";

dotenv.config();

const app = new App();
const expressApp = express();

// Middleware
expressApp.use(
  cors({
  origin: ['http://localhost:3000', 'https://cityfeed-backend.onrender.com'],
    credentials: true,
  })
);

expressApp.use(express.json());

// Swagger documentation
expressApp.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
expressApp.use("/api", Routers);

// Error handling
expressApp.use(errorHandler);

// Start server with Socket.IO
// Start server with Socket.IO
import { createServer } from "http";
import { Server } from "socket.io";

const port = process.env.PORT || 3001;
const httpServer = createServer(expressApp);

const io = new Server(httpServer, {
  cors: { origin: "*", credentials: true },
});

// Store active booking sessions
const activeBookingSessions = new Map<
  string,
  {
    userId: string;
    eventId: string;
    tierId: string;
    quantity: number;
    expiresAt: Date;
    socketId: string;
  }
>();

// Clean up expired booking sessions every 30 seconds
setInterval(() => {
  const now = new Date();
  for (const [sessionId, session] of activeBookingSessions.entries()) {
    if (session.expiresAt < now) {
      activeBookingSessions.delete(sessionId);
      logger.info(`Expired booking session: ${sessionId}`);
    }
  }
}, 30000);

io.on("connection", (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);

  // Join event room for real-time updates
  socket.on("joinEvent", (eventId) => {
    socket.join(`event_${eventId}`);
    logger.info(`Socket ${socket.id} joined room event_${eventId}`);

    // Send current availability immediately
    socket.emit("eventJoined", { eventId });
  });

  // Start booking session - reserve tickets temporarily
  socket.on(
    "startBooking",
    async (data: {
      eventId: string;
      userId: string;
      tierId: string;
      quantity: number;
    }) => {
      try {
        const { eventId, userId, tierId, quantity } = data;
        const sessionId = `${userId}_${eventId}_${tierId}`;

        // Check if user already has an active session for this tier
        if (activeBookingSessions.has(sessionId)) {
          socket.emit("bookingError", {
            message: "You already have an active booking session for this tier",
          });
          return;
        }

        // Check ticket availability
        // Use embedded ticket tiers from Event model instead of deprecated collection
        const { Event } = await import("./models/event.model");
        const event = await Event.findById(eventId);

        if (!event) {
          socket.emit("bookingError", { message: "Event not found" });
          return;
        }

        // Check if event is cancelled
        if (event.isCancelled) {
          socket.emit("bookingError", {
            message: "Event booking not allowed. Event is cancelled.",
            data: {
              eventId: event._id,
              eventName: event.name,
              isCancelled: true,
              cancellationReason:
                event.cancellationDescription || "No reason provided",
              cancellationInstructions:
                event.cancellationInstructions || "No instructions provided",
            },
          });
          return;
        }

        const tier = event.ticketTiers.find(
          (tt) => tt._id?.toString() === tierId
        );

        if (!tier) {
          socket.emit("bookingError", { message: "Ticket tier not found" });
          return;
        }

        // Calculate available tickets (excluding active booking sessions)
        const activeSessionsForTier = Array.from(
          activeBookingSessions.values()
        ).filter(
          (session) => session.tierId === tierId && session.eventId === eventId
        );

        const reservedQuantity = activeSessionsForTier.reduce(
          (sum, session) => sum + session.quantity,
          0
        );
        const actuallyAvailable =
          tier.quantity - tier.soldCount - reservedQuantity;

        if (quantity > actuallyAvailable) {
          socket.emit("bookingError", {
            message: `Only ${actuallyAvailable} tickets available for ${tier.name}`,
            available: actuallyAvailable,
          });
          return;
        }

        // Create booking session (15 minutes expiry)
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        activeBookingSessions.set(sessionId, {
          userId,
          eventId,
          tierId,
          quantity,
          expiresAt,
          socketId: socket.id,
        });

        // Emit booking started event
        socket.emit("bookingStarted", {
          sessionId,
          eventId,
          tierId,
          quantity,
          expiresAt,
          message: `Booking session started. You have 15 minutes to complete payment.`,
        });

        // Notify other users about reduced availability
        socket.to(`event_${eventId}`).emit("availabilityUpdate", {
          eventId,
          tierId,
          available: actuallyAvailable - quantity,
          reserved: reservedQuantity + quantity,
        });

        logger.info(
          `Booking session started: ${sessionId} for ${quantity} tickets`
        );
      } catch (error) {
        logger.error("Error starting booking session:", error);
        socket.emit("bookingError", {
          message: "Failed to start booking session",
        });
      }
    }
  );

  // Cancel booking session
  socket.on("cancelBooking", (data: { sessionId: string; userId: string }) => {
    const { sessionId, userId } = data;
    const session = activeBookingSessions.get(sessionId);

    if (session && session.userId === userId) {
      activeBookingSessions.delete(sessionId);

      // Notify other users about restored availability
      socket.to(`event_${session.eventId}`).emit("availabilityUpdate", {
        eventId: session.eventId,
        tierId: session.tierId,
        available: "restored",
        reserved: "decreased",
      });

      socket.emit("bookingCancelled", {
        sessionId,
        message: "Booking session cancelled",
      });
      logger.info(`Booking session cancelled: ${sessionId}`);
    }
  });

  // Complete booking (called after successful payment)
  socket.on(
    "completeBooking",
    (data: { sessionId: string; userId: string }) => {
      const { sessionId, userId } = data;
      const session = activeBookingSessions.get(sessionId);

      if (session && session.userId === userId) {
        activeBookingSessions.delete(sessionId);
        socket.emit("bookingCompleted", {
          sessionId,
          message: "Booking completed successfully",
        });
        logger.info(`Booking session completed: ${sessionId}`);
      }
    }
  );

  // Get current availability
  socket.on("getAvailability", async (data: { eventId: string }) => {
    try {
      const { eventId } = data;
      const { Event } = await import("./models/event.model");

      const event = await Event.findById(eventId);
      const tiers = event?.ticketTiers || [];
      const availability = tiers.map((tier) => {
        const activeSessionsForTier = Array.from(
          activeBookingSessions.values()
        ).filter(
          (session) =>
            session.tierId === tier._id?.toString() &&
            session.eventId === eventId
        );

        const reservedQuantity = activeSessionsForTier.reduce(
          (sum, session) => sum + session.quantity,
          0
        );
        const actuallyAvailable =
          tier.quantity - tier.soldCount - reservedQuantity;

        return {
          tierId: tier._id,
          name: tier.name,
          price: tier.price,
          totalQuantity: tier.quantity,
          soldCount: tier.soldCount,
          reservedCount: reservedQuantity,
          available: Math.max(0, actuallyAvailable),
        };
      });

      socket.emit("availabilityData", { eventId, tiers: availability });
    } catch (error) {
      logger.error("Error getting availability:", error);
      socket.emit("availabilityError", {
        message: "Failed to get availability data",
      });
    }
  });

  socket.on("disconnect", () => {
    // Clean up user's booking sessions on disconnect
    for (const [sessionId, session] of activeBookingSessions.entries()) {
      if (session.socketId === socket.id) {
        activeBookingSessions.delete(sessionId);
        logger.info(`Cleaned up booking session on disconnect: ${sessionId}`);
      }
    }
    logger.info(`WebSocket client disconnected: ${socket.id}`);
  });
});

// Export io and activeBookingSessions for use in controllers/services
export { io, activeBookingSessions };

// Clean up expired booking sessions every 30 seconds
setInterval(() => {
  const now = new Date();
  for (const [sessionId, session] of activeBookingSessions.entries()) {
    if (session.expiresAt < now) {
      activeBookingSessions.delete(sessionId);
      logger.info(`Expired booking session: ${sessionId}`);
    }
  }
}, 30000);

// Connect to MongoDB before starting the server
mongoose
  .connect(config.mongoUri)
  .then(() => {
    logger.info(
      "------------------------------------------------✅ Connected to MongoDB------------------------------------------------"
    );
    httpServer.listen(port, () => {
      logger.info(`Server (with WebSocket) is running on port ${port}`);
    });
  })
  .catch((err) => {
    logger.error("❌ Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
