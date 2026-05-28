import prisma from "./prisma.js";

/**
 * Persists a lightweight system event log to the database.
 * 
 * @param {string} userId - User ID triggering the event.
 * @param {string} eventType - The action event code ("session_started", "submission_attempted", "hint_requested", "optimization_improved", "problem_completed", "review_generated").
 * @param {string|null} sessionId - Associated CodingSession ID.
 * @param {object} metadata - Custom JSON metadata payload.
 */
export async function logSystemEvent(userId, eventType, sessionId = null, metadata = {}) {
  try {
    const event = await prisma.systemEvent.create({
      data: {
        userId,
        eventType,
        eventVersion: "v1",
        sessionId,
        metadata
      }
    });
    console.log(`[EVENT LOGGED] Type: ${eventType} (ID: ${event.id}) for user ${userId}`);
    return event;
  } catch (error) {
    console.error("Failed to log system event to DB:", error);
    // Silent fail to prevent breaking normal application flow
    return null;
  }
}
