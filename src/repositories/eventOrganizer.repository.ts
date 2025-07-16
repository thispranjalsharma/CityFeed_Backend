import { BaseRepository } from './base.repository';
import { EventOrganizer } from '../models/eventOrganizer.model';
import { IEventOrganizer } from '../models/eventOrganizer.model';

export class EventOrganizerRepository extends BaseRepository<IEventOrganizer> {
  constructor() {
    super(EventOrganizer);
  }

  async findByEmail(email: string): Promise<IEventOrganizer | null> {
    return this.model.findOne({ email }).exec();
  }

  async findPendingApproval(): Promise<IEventOrganizer[]> {
    return this.model.find({ isApproved: false }).exec();
  }

  async approveEventOrganizer(id: string): Promise<IEventOrganizer | null> {
    return this.model.findByIdAndUpdate(
      id,
      { isApproved: true },
      { new: true }
    ).exec();
  }
} 