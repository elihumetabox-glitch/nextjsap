'use server'
import {Event} from "@/database/event.model";

import {connectToDatabase} from "@/lib/mongodb";

export const getSimilarEventsBySlug = async (slug: string) => {
    try {
        await connectToDatabase();

        const event = await Event.findOne({ slug });
        if (!event || !event.tags?.length) return [];

        return await Event.find({ _id: { $ne: event._id}, tags:{$in: event.tags} }).lean();
    }catch (e) {
        return [];
    }
}