'use server';

import {Event} from "@/database/event.model"
import type {EventDocument} from "@/database/event.model";
import {connectToDatabase} from "@/lib/mongodb";

const getSimilarEventsBySlug = async (slug: string): Promise<EventDocument[]> => {
  try {
    await connectToDatabase();
    const event = await Event.findOne({ slug });
    if (!event) return [];

    return await Event.find({_id: {$ne: event._id}, tags: {$in: event.tags}})
      .lean()
      .exec();
  } catch {
    return [];
  }
}

export default getSimilarEventsBySlug;