import { Event, IEvent } from "../models/event.model";
import { inject, injectable } from "inversify";

export interface IEventRepository {
  findById(id: string): Promise<IEvent | null>;
  findByCreator(createdBy: string): Promise<IEvent[]>;
  findPublishedEvents(): Promise<IEvent[]>;
  findActiveEvents(): Promise<IEvent[]>;
}

@injectable()
export class EventRepository implements IEventRepository {
  constructor(@inject("Event") private model: typeof Event) {}

  async findById(id: string): Promise<IEvent | null> {
    return this.model.findById(id);
  }

  async findByCreator(createdBy: string): Promise<IEvent[]> {
    return this.model.find({ createdBy });
  }

  async findPublishedEvents(): Promise<IEvent[]> {
    return this.model.find({ status: "published" });
  }

  async findActiveEvents(): Promise<IEvent[]> {
    const now = new Date();
    return this.model.find({
      status: "published",
      saleStart: { $lte: now },
      saleEnd: { $gte: now },
    });
  }
}
