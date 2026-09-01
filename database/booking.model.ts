import {
  model,
  models,
  Schema,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";

import { Event } from "./event.model";

export interface BookingDocument {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const bookingSchema = new Schema<BookingDocument>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value: string): boolean => emailPattern.test(value),
        message: "Provide a valid email address.",
      },
    },
  },
  { timestamps: true },
);

// Bookings are commonly queried by event, so index the reference field.
bookingSchema.index({ eventId: 1 });

bookingSchema.pre("save", async function (this: HydratedDocument<BookingDocument>) {
  // Recheck the reference whenever it is first saved or changed.
  if (this.isNew || this.isModified("eventId")) {
    const eventExists = await Event.exists({ _id: this.eventId });

    if (!eventExists) {
      throw new Error("Cannot create a booking for an event that does not exist.");
    }
  }
});

export const Booking =
  (models.Booking as Model<BookingDocument> | undefined) ??
  model<BookingDocument>("Booking", bookingSchema);
