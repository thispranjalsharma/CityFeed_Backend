import { logger } from './logger.util';

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(operation: string): () => void {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      this.recordMetric(operation, duration);
      logger.info(`[Performance] ${operation}: ${duration}ms`);
    };
  }

  private recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);
    
    // Keep only last 100 measurements
    const measurements = this.metrics.get(operation)!;
    if (measurements.length > 100) {
      measurements.shift();
    }
  }

  getAverageTime(operation: string): number {
    const measurements = this.metrics.get(operation);
    if (!measurements || measurements.length === 0) {
      return 0;
    }
    return measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
  }

  getMetrics(): Record<string, { avg: number; count: number; min: number; max: number }> {
    const result: Record<string, { avg: number; count: number; min: number; max: number }> = {};
    
    for (const [operation, measurements] of this.metrics.entries()) {
      if (measurements.length > 0) {
        result[operation] = {
          avg: this.getAverageTime(operation),
          count: measurements.length,
          min: Math.min(...measurements),
          max: Math.max(...measurements)
        };
      }
    }
    
    return result;
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
