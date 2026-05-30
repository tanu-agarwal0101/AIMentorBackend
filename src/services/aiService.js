import { CohereClient } from "cohere-ai";
import { generateContentWithRetry } from "./geminiService.js";

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

const SYSTEM_INSTRUCTION = `You are Cody. You are primarily a career mentor, but you can help with any topic. When the user's question relates to learning, careers, interviews, projects, resumes, or roadmaps, provide mentorship-oriented answers. When the user's question is unrelated, answer normally without forcing career advice. Keep your advice practical, specific, honest, and encouraging. Avoid generic motivational fluff.`;

/**
 * Gets the AI response using Gemini as primary and Cohere as fallback.
 * Includes conversation history in the context.
 * 
 * @param {string} message - Current user message.
 * @param {Array} history - Array of previous messages { role: "user" | "assistant", content: string }.
 * @returns {Promise<string>} The AI response.
 */
export async function getAIResponse(message, history = []) {
  const contents = [];
  
  const recentHistory = history.slice(-20);
  
  let lastRole = null;
  for (const msg of recentHistory) {
    const role = msg.role === "assistant" ? "model" : "user";
    if (role === lastRole && contents.length > 0) {
      contents[contents.length - 1].parts[0].text += "\n\n" + msg.content;
    } else {
      contents.push({
        role,
        parts: [{ text: msg.content }]
      });
      lastRole = role;
    }
  }

  if (lastRole === "user" && contents.length > 0) {
    contents[contents.length - 1].parts[0].text += "\n\n" + message;
  } else {
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });
  }

  try {
    console.log("[AI Service] Attempting response with Gemini...");
    const response = await generateContentWithRetry({
      contents,
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    });
    
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      return text;
    }
    throw new Error("Empty response from Gemini");
  } catch (error) {
    const errorMsg = error?.message || String(error);
    const isGeminiQuota = errorMsg.toLowerCase().includes("quota") || 
                          errorMsg.toLowerCase().includes("429") || 
                          errorMsg.toLowerCase().includes("resourceexhausted") ||
                          errorMsg.toLowerCase().includes("limit");

    if (isGeminiQuota) {
      console.warn("[AI Service] Gemini API Quota Exceeded. Falling back to Cohere...");
    } else {
      console.error("[AI Service] Gemini failed, falling back to Cohere:", error);
    }
    
    try {
      const chatHistory = recentHistory.map(msg => ({
        role: msg.role === "assistant" ? "CHATBOT" : "USER",
        message: msg.content
      }));

      const cohereResponse = await cohere.chat({
        model: "command-r-plus-08-2024",
        message: message,
        preamble: SYSTEM_INSTRUCTION,
        chatHistory,
        maxTokens: 1024,
      });

      return cohereResponse.text || "AI Service is unable to respond at the moment.";
    } catch (cohereError) {
      const cohereMsg = cohereError?.message || String(cohereError);
      const isCohereQuota = cohereMsg.toLowerCase().includes("quota") || 
                            cohereMsg.toLowerCase().includes("429") ||
                            cohereMsg.toLowerCase().includes("limit");

      if (isCohereQuota) {
        console.warn("[AI Service] Cohere API Quota Exceeded.");
      } else {
        console.error("[AI Service] Cohere fallback failed too:", cohereError);
      }
      return "AI Service is temporarily unavailable due to API quota limits. Please try again later.";
    }
  }
}

/**
 * Generates a concise title (3-5 words) for a conversation based on the first user query and assistant response.
 * 
 * @param {string} userMessage - First user query.
 * @param {string} assistantResponse - First AI response.
 * @returns {Promise<string>} Concise generated title.
 */
export async function generateTitle(userMessage, assistantResponse) {
  const prompt = `Generate a concise 3-5 word title for a career mentorship chat started with the following interaction. Do not wrap in quotes or add preamble.
User: "${userMessage}"
Assistant: "${assistantResponse}"`;

  try {
    console.log("[AI Service] Generating title with Gemini...");
    const response = await generateContentWithRetry({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: "You generate short, clean titles for conversations. Output ONLY the title, no extra text.",
      temperature: 0.3,
    });

    let title = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (title) {
      return title.trim().replace(/^["']|["']$/g, '');
    }
    throw new Error("Empty title from Gemini");
  } catch (error) {
    const errorMsg = error?.message || String(error);
    const isGeminiQuota = errorMsg.toLowerCase().includes("quota") || 
                          errorMsg.toLowerCase().includes("429") || 
                          errorMsg.toLowerCase().includes("resourceexhausted") ||
                          errorMsg.toLowerCase().includes("limit");

    if (isGeminiQuota) {
      console.warn("[AI Service] Gemini API Quota Exceeded during title generation. Falling back to Cohere...");
    } else {
      console.error("[AI Service] Gemini title gen failed, falling back to Cohere:", error);
    }
    try {
      const cohereResponse = await cohere.chat({
        model: "command-r-plus-08-2024",
        message: prompt,
        preamble: "You generate short, clean titles for conversations. Output ONLY the title, no extra text.",
        maxTokens: 50,
      });
      return cohereResponse.text.trim().replace(/^["']|["']$/g, '');
    } catch (cohereError) {
      const cohereMsg = cohereError?.message || String(cohereError);
      const isCohereQuota = cohereMsg.toLowerCase().includes("quota") || 
                            cohereMsg.toLowerCase().includes("429") ||
                            cohereMsg.toLowerCase().includes("limit");

      if (isCohereQuota) {
        console.warn("[AI Service] Cohere API Quota Exceeded during title generation.");
      } else {
        console.error("[AI Service] Cohere title gen failed:", cohereError);
      }
      return "Career Discussion";
    }
  }
}
