import { GoogleGenAI } from "@google/genai";

let ai = null;

export function getAiClient() {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not defined in env variables.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

/**
 * Service to stream responses from Gemini.
 * Fully isolates Gemini SDK concerns.
 *
 * @param {string} systemInstruction - Prompt detailing Cody's active persona and boundaries.
 * @param {Array} chatHistory - Array of past messages { sender: "cody"|"user", text: string }
 * @param {string} userPrompt - Current contextual user query including code, problem statement etc.
 * @returns {AsyncGenerator<string>} An async generator yielding chunks of text.
 */
export async function* streamCodyResponse(systemInstruction, chatHistory = [], userPrompt) {
  try {
    const contents = [];

    let lastRole = null;
    for (const msg of chatHistory) {
      if (!msg || !msg.text) continue;
      
      const role = msg.sender === "cody" ? "model" : "user";
      
      if (role === lastRole) {
        if (contents.length > 0) {
          contents[contents.length - 1].parts[0].text += "\n\n" + msg.text;
        }
      } else {
        contents.push({
          role,
          parts: [{ text: msg.text }]
        });
        lastRole = role;
      }
    }

    if (lastRole === "user" && contents.length > 0) {
      contents[contents.length - 1].parts[0].text += "\n\n[Context Update / Query]:\n" + userPrompt;
    } else {
      contents.push({
        role: "user",
        parts: [{ text: userPrompt }]
      });
    }

    const modelName = "gemini-2.5-flash";
    let responseStream = null;
    let lastErr = null;
    let retries = 3;
    let delay = 1500;

    while (retries >= 0) {
      try {
        responseStream = await getAiClient().models.generateContentStream({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        });
        break;
      } catch (err) {
        lastErr = err;
        const is503 = err.status === 503 || (err.message && (err.message.includes("503") || err.message.includes("UNAVAILABLE")));
        if (is503 && retries > 0) {
          console.warn(`Gemini model ${modelName} returned 503 (${err.message}). Retrying in ${delay}ms... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries--;
          delay += 1000;
        } else {
          console.warn(`Gemini model ${modelName} failed: ${err.message}.`);
          break;
        }
      }
    }

    if (!responseStream) {
      throw lastErr || new Error(`Failed to generate content stream from ${modelName}.`);
    }

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }
  } catch (error) {
    console.error("Error in geminiService streamCodyResponse:", error);
    throw error;
  }
}

/**
 * Executes a non-streaming generateContent call with retries (for 503/UNAVAILABLE) using gemini-2.5-flash.
 * 
 * @param {object} options - Options containing contents, config, systemInstruction, temperature etc.
 * @returns {Promise<object>} The raw response from the Gemini model.
 */
export async function generateContentWithRetry({ contents, systemInstruction, responseMimeType, temperature }) {
  const ai = getAiClient();
  const modelName = "gemini-2.5-flash";
  let response = null;
  let lastErr = null;
  let retries = 3;
  let delay = 1500;

  while (retries >= 0) {
    try {
      const config = {
        temperature: typeof temperature === "number" ? temperature : 0.2
      };
      if (systemInstruction) config.systemInstruction = systemInstruction;
      if (responseMimeType) config.responseMimeType = responseMimeType;

      response = await ai.models.generateContent({
        model: modelName,
        contents,
        config
      });
      break; 
    } catch (err) {
      lastErr = err;
      const is503 = err.status === 503 || (err.message && (err.message.includes("503") || err.message.includes("UNAVAILABLE")));
      if (is503 && retries > 0) {
        console.warn(`[Gemini Retry] Model ${modelName} returned 503/UNAVAILABLE. Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries--;
        delay += 1000;
      } else {
        console.warn(`[Gemini Failed] Model ${modelName} failed with: ${err.message}.`);
        break; 
      }
    }
  }

  if (!response) {
    throw lastErr || new Error(`Failed to generate content from ${modelName}.`);
  }

  return response;
}

/**
 * Parses and extracts user-friendly error messages from Google Gen AI API exceptions.
 * 
 * @param {Error} error - The caught API error.
 * @returns {string} The formatted, clean error message.
 */
export function cleanGeminiError(error) {
  if (!error) return "Unknown AI service error.";
  
  const msgStr = error.message || String(error);

  if (typeof msgStr === "string" && msgStr.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(msgStr.trim());
      if (parsed?.error?.message) {
        let retryDelay = null;
        if (Array.isArray(parsed.error.details)) {
          const retryInfo = parsed.error.details.find(
            d => d["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
          );
          if (retryInfo && retryInfo.retryDelay) {
            const seconds = parseInt(retryInfo.retryDelay.replace("s", "")) || 0;
            if (seconds > 0) {
              retryDelay = seconds;
            }
          }
        }

        if (parsed.error.code === 429) {
          if (retryDelay) {
            return `Gemini API quota exceeded: Retry available in ${retryDelay} seconds.`;
          }
          return `Gemini API quota exceeded: Please try again shortly.`;
        }
        return parsed.error.message;
      }
    } catch (e) {
    }
  }

  if (typeof msgStr === "string" && msgStr.includes("API_KEY_INVALID")) {
    return "Invalid Gemini API key. Please check your config.";
  }

  if (error.status === 429) {
    return "Gemini API rate limit exceeded. Please wait a moment and try again.";
  }
  if (error.status === 503) {
    return "Gemini API is temporarily unavailable due to high demand. Please try again shortly.";
  }

  return msgStr;
}

