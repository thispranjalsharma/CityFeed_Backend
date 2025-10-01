import 'reflect-metadata';
import { logger } from "./utils/logger.util";
logger.info("Logger test: App started");

// This file is kept for backward compatibility
// The actual application is now configured in server.ts using InversifyExpressServer

export default class App {
  // This class is now a placeholder for backward compatibility
  // The actual application is configured in server.ts
  
  public getApp(): any {
    logger.warn('App.getApp() is deprecated. The application is now configured in server.ts');
    return null;
  }

  public async start(): Promise<void> {
    logger.warn('App.start() is deprecated. The application is now started in server.ts');
    return;
  }
}
