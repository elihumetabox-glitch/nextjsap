import { model, models, Schema, type HydratedDocument, type Model } from "mongoose";

export interface EventDocument {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const requiredString = {
  type: String,
  required: true,
  trim: true,
  validate: {
    validator: (value: string): boolean => value.length > 0,
    message: "This field cannot be empty.",
  },
} as const;

const nonEmptyStringArray = {
  type: [String],
  required: true,
  validate: {
    validator: (values: string[]): boolean =>
      values.length > 0 && values.every((value) => value.trim().length > 0),
    message: "Provide at least one non-empty value.",
  },
} as const;

const eventSchema = new Schema<EventDocument>(
  {
    title: requiredString,
    slug: { type: String, trim: true },
    description: requiredString,
    overview: requiredString,
    image: requiredString,
    venue: requiredString,
    location: requiredString,
    date: requiredString,
    time: requiredString,
    mode: requiredString,
    audience: requiredString,
    agenda: nonEmptyStringArray,
    organizer: requiredString,
    tags: nonEmptyStringArray,
  },
  { timestamps: true },
);

eventSchema.index({ slug: 1 }, { unique: true });

function toSlug(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/.exec(value.trim());

  if (!match) {
    throw new Error("Time must use HH:mm or h:mm AM/PM format.");
  }

  const [, hourValue, minuteValue, period] = match;
  let hour = Number(hourValue);
  const minute = Number(minuteValue);

  if (minute > 59 || hour > (period ? 12 : 23) || hour < (period ? 1 : 0)) {
    throw new Error("Time contains an invalid hour or minute.");
  }

  if (period) {
    hour = hour % 12 + (period.toLowerCase() === "pm" ? 12 : 0);
  }

  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

eventSchema.pre("save", function (this: HydratedDocument<EventDocument>) {
  // Regenerate the URL-safe slug only when its source title changes.
  if (this.isModified("title")) {
    const slug = toSlug(this.title);

    if (!slug) {
      throw new Error("Title must contain at least one URL-safe character.");
    }

    this.slug = slug;
  }

  // Store valid dates as ISO strings and times in consistent 24-hour HH:mm form.
  const parsedDate = new Date(this.date);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Date must be a valid date string.");
  }

  this.date = parsedDate.toISOString();
  this.time = normalizeTime(this.time);
});

export const Event =
  (models.Event as Model<EventDocument> | undefined) ??
  model<EventDocument>("Event", eventSchema);