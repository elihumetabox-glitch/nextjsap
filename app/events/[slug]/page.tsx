import { Suspense } from "react";
import EventDetails from "@/components/EventDetails";
import { getEvents } from "@/lib/actions/event.actions";

export async function generateStaticParams() {
    const events = await getEvents();
    return events.map((event) => ({
        slug: event.slug,
    }));
}

const EventDetailsPage = async ({ params }: { params: Promise<{slug: string}>}) => {
    const { slug } = await params;

    return (
        <main>
            <Suspense fallback={<div>Loading...</div>}>
                <EventDetails slug={slug} />
            </Suspense>
        </main>
    );
};

export default EventDetailsPage;
