import { logSystemEvent } from "../utils/eventLogger.js";

/**
 * Controller to log client-side temporal events in the DB.
 * POST /api/events
 */
export const handleLogClientEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventType, sessionId, metadata } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: "Missing required field: eventType" });
    }

    const event = await logSystemEvent(userId, eventType, sessionId, metadata || {});
    return res.status(201).json({ success: true, eventId: event?.id });
  } catch (error) {
    console.error("Error in handleLogClientEvent:", error);
    return res.status(500).json({ error: "Failed to record event." });
  }
};
