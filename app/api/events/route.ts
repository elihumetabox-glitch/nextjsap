import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { connectToDatabase } from "@/lib/mongodb";
import { Event } from "@/database/event.model";



/*cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});*/

function parseArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((v) => String(v).trim()).filter(Boolean);
  }
  const str = String(val).trim();
  if (str.startsWith("[") && str.endsWith("]")) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch {
      // Fallback to split if JSON parsing fails
    }
  }
  return str
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const formData = await req.formData();
    const event = Object.fromEntries(formData.entries()) as Record<string, unknown>;

    const file = formData.get("image") as File;

    if (!file) return NextResponse.json({ message: "Image is required" }, { status: 400 });

    let tags = JSON.parse(formData.get('tags')as string);
    let agenda = JSON.parse(formData.get('agenda')as string);


    // Parse array fields sent as JSON strings from multipart form
    //event.tags = parseArray(event.tags);
    //event.agenda = parseArray(event.agenda);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: "image", folder: "DevEvent" },
        (error, results) => {
          if (error) return reject(error);
          resolve(results);
        }
      ).end(buffer);
    });

    event.image = (uploadResult as { secure_url: string }).secure_url;

    const createdEvent = await Event.create({
      ...event,
      tags: tags,
      agenda: agenda,
    });

    return NextResponse.json(
      { message: "Event created successfully.", event: createdEvent },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/events error:", e);
    const errorDetail =
      e instanceof Error
        ? { message: e.message, stack: e.stack }
        : { raw: JSON.stringify(e, null, 2) };
    return NextResponse.json(
      { message: "Event Creation Failed", ...errorDetail },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    const events = await Event.find().sort({ createdAt: -1 });

    return NextResponse.json(
      { message: "Events fetched successfully.", events },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("GET /api/events error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Event fetching failed", error: errorMessage },
      { status: 500 }
    );
  }
}
