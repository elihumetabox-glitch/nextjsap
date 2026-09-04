import ExploreBtn from "@/components/ExploreBtn";
import EventCard from "@/components/EventCard";
import { EventDocument } from "@/database/event.model";
import { cacheLife } from "next/cache";

const getBaseUrl = () => {
    const url = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL;
    if (!url) return "http://localhost:3000";
    return url.startsWith("http") ? url : `https://${url}`;
};

const Page = async () => {
    'use cache';
    cacheLife('hours');

    let events: EventDocument[] = [];

    try {
        const BASE_URL = getBaseUrl();
        const response = await fetch(`${BASE_URL}/api/events`, {
            // Optional: fallback cache settings for build time
            next: { revalidate: 3600 }
        });

        if (response.ok) {
            const data = await response.json();
            events = data.events || [];
        } else {
            console.warn(`[Build Warning] Failed to fetch events: ${response.status}`);
        }
    } catch (error) {
        console.error("[Build Warning] API route unreachable during build:", error);
    }

    return (
        <section>
            <h1 className="text-center">The Hub for Every Dev <br/> Event You Can&apos;t Miss</h1>
            <p className="text-center mt-5">Hackathon, Meetups and Conferences, All in One Place</p>
            <ExploreBtn />

            <div className="mt-20 space-y-7">
                <h3>Featured Events</h3>

                <ul className="events">
                    {events && events.length > 0 ? (
                        events.map((event: EventDocument) => (
                            <li key={event.title}>
                                <EventCard {...event} />
                            </li>
                        ))
                    ) : (
                        <p>No events available at the moment.</p>
                    )}
                </ul>
            </div>
        </section>
    );
};

export default Page;