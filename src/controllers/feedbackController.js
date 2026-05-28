import prisma from "../utils/prisma.js";

/**
 * Controller to handle feedback submissions.
 * POST /api/feedback
 */
export const handleCreateFeedback = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId, prompt, source, rating, comment } = req.body;

    if (!prompt || !source || !rating) {
      return res.status(400).json({ error: "Missing required fields: prompt, source, rating." });
    }

    const newFeedback = await prisma.feedback.create({
      data: {
        userId,
        sessionId: sessionId || null,
        prompt,
        source,
        rating,
        comment: comment || null
      }
    });

    console.log(`[Feedback Created] Saved feedback ${newFeedback.id} from user ${userId} for source ${source}`);
    return res.status(201).json(newFeedback);
  } catch (error) {
    console.error("Error in handleCreateFeedback:", error);
    return res.status(500).json({ error: "Failed to persist feedback." });
  }
};
