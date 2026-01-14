import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google Generative AI client
// Ensure you have GEMINI_API_KEY defined in your .env.local file
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');

if (!API_KEY) {
  console.warn("GEMINI_API_KEY is not set in environment variables. Gemini features will be disabled.");
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

/**
 * Generates content using the Gemini model.
 * @param prompt The prompt to send to the model.
 * @returns The release text response.
 */
export const getGeminiResponse = async (prompt: string): Promise<string> => {
  if (!API_KEY) {
    throw new Error("API Key not found. Please set GEMINI_API_KEY in .env.local");
  }

  try {
    // Use the gemini-2.0-flash-lite model for faster text generation
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};
