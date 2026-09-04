'use server';

import {Event} from "@/database/event.model"
import type {EventDocument} from "@/database/event.model";
import {connectToDatabase} from "@/lib/mongodb";

export const getEvents = async (): Promise<EventDocument[]> => {
  try {
    await connectToDatabase();
    const events = await Event.find().sort({ createdAt: -1 }).lean().exec();
    return JSON.parse(JSON.stringify(events));
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return [];
  }
};

export const getEventBySlug = async (slug: string): Promise<EventDocument | null> => {
  try {
    await connectToDatabase();
    const sanitizedSlug = slug.trim().toLowerCase();
    const event = await Event.findOne({ slug: sanitizedSlug }).lean().exec();
    if (!event) return null;
    return JSON.parse(JSON.stringify(event));
  } catch (error) {
    console.error("Failed to fetch event by slug:", error);
    return null;
  }
};

export const getSimilarEventsBySlug = async (slug: string): Promise<EventDocument[]> => {
  try {
    await connectToDatabase();
    const sanitizedSlug = slug.trim().toLowerCase();
    const event = await Event.findOne({ slug: sanitizedSlug });
    if (!event) return [];

    const similarEvents = await Event.find({ _id: { $ne: event._id }, tags: { $in: event.tags } })
      .lean()
      .exec();
    return JSON.parse(JSON.stringify(similarEvents));
  } catch {
    return [];
  }
};

export default getSimilarEventsBySlug;