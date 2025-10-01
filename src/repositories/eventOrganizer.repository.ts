// import { BaseRepository } from "./base.repository";
import { EventOrganizer } from "../models/eventOrganizer.model";
import { IEventOrganizer } from "../models/eventOrganizer.model";
import { inject, injectable } from "inversify";

export interface IEventOrganizerRepository {
  findByEmail(email: string): Promise<IEventOrganizer | null>;
  findPendingApproval(): Promise<IEventOrganizer[]>;
  approveEventOrganizer(id: string): Promise<IEventOrganizer | null>;
  findById(id: string): Promise<IEventOrganizer | null>;
}
@injectable()
export class EventOrganizerRepository implements IEventOrganizerRepository {
  constructor(
    @inject("EventOrganizer") private eventOrganizer: typeof EventOrganizer
  ) {}

  async findById(id: string): Promise<IEventOrganizer | null> {
    return this.eventOrganizer.findById(id).exec();
  }
  async findByEmail(email: string): Promise<IEventOrganizer | null> {
    return this.eventOrganizer.findOne({ email }).exec();
  }

  async findPendingApproval(): Promise<IEventOrganizer[]> {
    return this.eventOrganizer.find({ isApproved: false }).exec();
  }

  async approveEventOrganizer(id: string): Promise<IEventOrganizer | null> {
    return this.eventOrganizer
      .findByIdAndUpdate(id, { isApproved: true }, { new: true })
      .exec();
  }
}
