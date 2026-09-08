import { Suspense } from "react";
import EventDetails from "@/components/EventDetails";

const EventDetailsContent = async ({
    params,
}: {
    params: Promise<{ slug: string }>;
}) => {
    const { slug } = await params;
    return <EventDetails slug={slug} />;
};

const EventDetailsPage = ({ params }: { params: Promise<{ slug: string }> }) => {
    return (
        <main>
            <Suspense fallback={<div>Loading...</div>}>
                <EventDetailsContent params={params} />
            </Suspense>
        </main>
    );
};

export default EventDetailsPage;
