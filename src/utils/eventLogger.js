import prisma from "./prisma.js";
import { processEvent } from "../services/achievementService.js";

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

    processEvent(userId, eventType, { ...metadata, sessionId }).catch(err => {
      console.error("Failed to process event in achievements engine:", err);
    });

    return event;
  } catch (error) {
    console.error("Failed to log system event to DB:", error);
    return null;
  }
}
