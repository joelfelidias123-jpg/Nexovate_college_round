import { makeId, updateStore, type Webinar, type WebinarStatus } from "@/lib/store";

/**
 * Creates a webinar through the store functions.
 * Returns the created webinar metadata and its registration URL.
 */
export async function createWebinar(
  title: string,
  date: string,
  time: string
): Promise<{
  webinarId: string;
  title: string;
  date: string;
  time: string;
  registrationUrl: string;
}> {
  if (!title || !date || !time) {
    throw new Error("Missing required inputs: title, date, and time are required.");
  }

  const startsAt = new Date(`${date}T${time}`);
  if (!Number.isFinite(startsAt.getTime())) {
    throw new Error("Invalid start date or time provided.");
  }

  // Default duration: 1 hour
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  const cleanSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const webinarId = makeId("webinar");
  const status: WebinarStatus = "published";

  const { result } = await updateStore((draft) => {
    let slug = cleanSlug;
    if (!slug || draft.webinars.some((w) => w.slug === slug)) {
      slug = `${cleanSlug || "webinar"}-${webinarId.slice(-6)}`;
    }

    const webinar: Webinar = {
      id: webinarId,
      title: title.trim(),
      slug,
      description: "Live interactive webinar session.",
      status,
      startsAt,
      endsAt,
      createdAt: new Date(),
    };

    draft.webinars.push(webinar);

    return {
      webinarId: webinar.id,
      title: webinar.title,
      date,
      time,
      registrationUrl: `/webinar/${webinar.slug || webinar.id}/register`,
    };
  });

  return result;
}
