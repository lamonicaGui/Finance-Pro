
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyAi9kB-Mmk8vZzaUfmIQVxdqJBD1EEG5ZQ";

async function listModels() {
    try {
        console.log("Fetching models...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("✅ Models found:");
            data.models.forEach(m => {
                if (m.name.includes("gemini")) {
                    console.log(`- ${m.name} (Supported methods: ${m.supportedGenerationMethods})`);
                }
            });
        } else {
            console.log("❌ Error or no models:", data);
        }
    } catch (error) {
        console.error("❌ Exception:", error);
    }
}

listModels();
