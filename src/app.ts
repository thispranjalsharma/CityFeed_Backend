import express from 'express';
import type { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logger.middleware';
import { config } from './config/config';
import { connectDB } from './config/database';

// Import models to ensure they are registered
import './models/admin.model';
import './models/user.model';
import './models/merchant.model';
import './models/offer.model';
import './models/dineInSession.model';
import './models/payment.model';

// Import routes
import userRoutes from './routes/user.routes';
import merchantRoutes from './routes/merchant.routes';
import adminRoutes from './routes/admin.routes';
import authRoutes from './routes/auth.routes';
import offerRoutes from './routes/offer.routes';
import dineInRoutes from './routes/dineIn.routes';
import paymentRoutes from './routes/payment.routes';

class App {
  private app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false // Disable CSP for Swagger UI
    }));
    
    // CORS configuration
    this.app.use(cors());

    // Logging middleware
    this.app.use(morgan('dev'));
    this.app.use(requestLogger);

    // Body parsing middleware
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Serve static files
    this.app.use('/uploads', express.static(config.uploadDir));

    // Swagger documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      swaggerOptions: {
        persistAuthorization: true,
        tryItOutEnabled: true,
        docExpansion: 'none',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        syntaxHighlight: {
          activate: true,
          theme: 'monokai'
        }
      },
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'CityFeed API Documentation'
    }));
  }

  private initializeRoutes(): void {
    // Handle pre-flight requests
    this.app.options('*', cors());

    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv
      });
    });

    // API routes
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/merchants', merchantRoutes);
    this.app.use('/api/admin', adminRoutes);
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/offers', offerRoutes);
    this.app.use('/api/dine-in', dineInRoutes);
    this.app.use('/api/payments', paymentRoutes);
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({ message: 'Route not found' });
    });

    // Error handler
    this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      errorHandler(err, req, res, next);
    });
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await connectDB();

      // Start server
      const server = this.app.listen(config.port, () => {
        console.log(`Server is running on port ${config.port}`);
      });

      // Handle server errors
      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.syscall !== 'listen') {
          throw error;
        }

        const bind = typeof config.port === 'string' ? 'Pipe ' + config.port : 'Port ' + config.port;

        // Handle specific listen errors with friendly messages
        switch (error.code) {
          case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
          case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
          default:
            throw error;
        }
      });

      // Handle process termination
      process.on('SIGTERM', () => {
        console.log('SIGTERM signal received: closing HTTP server');
        server.close(() => {
          console.log('HTTP server closed');
          process.exit(0);
        });
      });

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public getApp(): Application {
    return this.app;
  }
}

export default App;
