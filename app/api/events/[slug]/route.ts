import { type NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Event, type EventDocument } from "@/database/event.model";

/** Context containing dynamic route parameters for Next.js Route Handlers */
type RouteParams = {
  params: Promise<{
    slug: string;
  }>;
}

/** Standard JSON response payload format */
/*interface ApiResponse<T = unknown> {
  message: string;
  event?: T;
  error?: string;
}*/

/**
 * GET /api/events/[slug]
 * Fetches single events details by its unique URL slug.
 */
export async function GET(
  req: NextRequest,
  {params}: RouteParams
): Promise<NextResponse> {
  try {
    // Ensure connection to MongoDB
    await connectToDatabase();

    // Await route parameters (as required by Next.js 15+)
    const { slug } = await params;

    // Validate the slug parameter
    if (!slug || typeof slug !== "string" || slug.trim() === '') {
      return NextResponse.json(
        { message: "A valid event slug parameter is required." },
        { status: 400 }
      );
    }

    const sanitizedSlug = slug.trim().toLowerCase();



    // Query for matching event
    const event = await Event.findOne({ slug: sanitizedSlug }).lean();

    // Return 404 if event is not found
    if (!event) {
      return NextResponse.json(
        { message: `Event with slug '${sanitizedSlug}' not found.` },
        { status: 404 }
      );
    }

    // Return 200 with the event data
    return NextResponse.json(
      {
        message: "Event fetched successfully.",
        event,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected server error occurred.";

    console.error("Error fetching event by slug:", error);

    return NextResponse.json(
      {
        message: "Failed to fetch event.",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
