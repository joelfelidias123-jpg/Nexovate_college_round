export function createWebinar(title: string, date: string, time: string) {
  if (!title || !date || !time) {
    throw new Error("Missing required inputs: title, date, and time are required.");
  }
  const webinarId = "webinar_" + Math.random().toString(36).substring(2, 9);
  return {
    webinarId,
    title,
    date,
    time,
    registrationUrl: `https://nexus.app/webinar/${webinarId}`,
  };
}
