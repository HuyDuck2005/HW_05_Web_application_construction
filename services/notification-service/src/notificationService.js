import { broadcastCourseEnrollmentCountIncreased } from "./sseHub.js";

const processedEvents = new Set();

export async function handleCourseEnrollmentCountIncreased(event) {
  if (event.eventType !== 'CourseEnrollmentCountIncreased') {
    throw new Error(`Unsupported eventType: ${event.eventType}`);
  }
  if (!event.payload?.courseId) {
    throw new Error('Missing payload.courseId');
  }

  if (processedEvents.has(event.eventId)) {
    console.log(`[notification-service] eventId=${event.eventId} already processed (idempotent)`);
    return { sent: 0, duplicated: true };
  }
  
  const sent = broadcastCourseEnrollmentCountIncreased(event);
  processedEvents.add(event.eventId);

  console.log(`[notification-service] pushed eventId=${event.eventId} courseId=${event.payload.courseId} clients=${sent}`);
  
  return { sent, duplicated: false };
}
