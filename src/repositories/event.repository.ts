import { BaseRepository } from './base.repository';
import { Event, IEvent } from '../models/event.model';

export class EventRepository extends BaseRepository<IEvent> {
  constructor() {
    super(Event);
  }

  async findById(id: string): Promise<IEvent | null> {
    return this.model.findById(id);
  }

  async findByCreator(createdBy: string): Promise<IEvent[]> {
    return this.find({ createdBy });
  }

  async findPublishedEvents(): Promise<IEvent[]> {
    return this.find({ status: 'published' });
  }

  async findActiveEvents(): Promise<IEvent[]> {
    const now = new Date();
    return this.find({
      status: 'published',
      saleStart: { $lte: now },
      saleEnd: { $gte: now }
    });
  }
} 