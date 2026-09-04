import { type NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Event } from "@/database/event.model";

type RouteParams = {
  params: Promise<{
    slug: string;
  }>;
};

/**
 * GET /api/events/[slug]
 * Fetches single events details by its unique URL slug.
 */
export async function GET(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    await connectToDatabase();

    const { slug } = await params;

    if (!slug || typeof slug !== "string" || slug.trim() === "") {
      return NextResponse.json(
        { message: "A valid event slug parameter is required." },
        { status: 400 }
      );
    }

    const sanitizedSlug = slug.trim().toLowerCase();

    const event = await Event.findOne({ slug: sanitizedSlug }).lean();

    if (!event) {
      return NextResponse.json(
        { message: `Event with slug '${sanitizedSlug}' not found.` },
        { status: 404 }
      );
    }

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
