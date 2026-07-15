import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
const PORT = 3000;

// Lazy-initialize Gemini client to prevent crashes if key is not yet set
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is missing.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// AI Letter Drafting Assistant Endpoint
app.post("/api/gemini/assist", async (req, res) => {
  try {
    const { topic, type, language, officeName, senderRole, recipientDetails, keyPoints } = req.body;

    if (!topic) {
      res.status(400).json({ error: "Topic is required" });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: "AI service is currently unavailable. Please check that GEMINI_API_KEY is set in Settings > Secrets."
      });
      return;
    }

    const isNepali = language === "ne";

    const systemPrompt = isNepali
      ? `तपाईं नेपाल सरकारको आधिकारिक पत्र लेखन विशेषज्ञ हुनुहुन्छ। तपाईंको काम प्रयोगकर्ताको बुँदाहरू र आवश्यकताका आधारमा सरकारी ढाँचा (Official Nepal Government Format) मा अत्यन्तै शिष्ट, शुद्ध र व्यावसायिक पत्रको विषय (Subject) र मुख्य व्यहोरा (Body) तयार पार्नु हो।
नेपाली सरकारी पत्रमा प्रयोग हुने विशिष्ट प्रशासनिक शब्दावलीहरू जस्तै: "प्रस्तुत विषयमा", "तपसिल बमोजिम", "सादर अनुरोध छ", "व्यहोरा अवगत गराउँदछु", "कार्यार्थ" आदि प्रयोग गर्नुहोस्। 
पत्रको ढाँचा सधैं शिष्ट र औपचारिक हुनुपर्छ।

कृपया प्रतिक्रिया JSON ढाँचामा दिनुहोस् जसमा निम्न कुञ्जीहरू (keys) हुनुपर्छ:
1. "subject": सरकारी शैलीमा लेखिएको छोटो र स्पष्ट विषय (जस्तै: "बिषय: बजेट निकासा सम्बन्धमा।")
2. "salutation": प्रापकको पद र सम्मान (जस्तै: "श्रीमान् सचिवज्यू,", "श्री कार्यालय प्रमुखज्यू,")
3. "body": पत्रको मुख्य विस्तृत व्यहोरा। यदि धेरै बुँदाहरू छन् भने "तपसिल:" बनाएर बुँदागत रूपमा आकर्षक तालिका वा बुँदा सूचीमा प्रस्तुत गर्नुहोस्।
४. "closing": पत्रको अन्त्यमा प्रयोग गरिने शिष्ट शब्दावली (जस्तै: "भवदीय,", "सादर धन्यवाद सहित,")`
      : `You are an expert in drafting official government letters for Nepal in formal English. Your job is to draft a highly professional, polite, and authoritative letter subject and body based on the user's input.
Use official administrative terminology common in Nepalese ministries (e.g., "In reference to the subject mentioned above...", "as per the following details...", "requested for necessary action...", "sincerely yours").

Please return your response in JSON format with the following keys:
1. "subject": A brief, clear official subject line (e.g., "Subject: Request for Budget Allocation.")
2. "salutation": Appropriate formal greeting for the recipient (e.g., "The Secretary,", "Dear Sir/Madam,")
3. "body": The main detailed content of the letter. If there are multiple points or details, format them clearly using structured lists or bullets under a "Details (Tapasils)" section.
4. "closing": Formal sign-off phrase (e.g., "Sincerely yours,", "With best regards,")`;

    const userPrompt = `
Topic of the Letter: ${topic}
Type of Letter: ${type || 'General'}
Language: ${isNepali ? 'Nepali (नेपाली)' : 'English'}
Office Sending the Letter: ${officeName || 'Not specified'}
Sender's Role/Designation: ${senderRole || 'Not specified'}
Recipient Details: ${recipientDetails || 'Not specified'}
Key Points to Include: ${keyPoints || 'None specified'}

Draft a complete, official, and flawless subject and main body for this government letter. Make sure it adheres to Nepalese government official letter-writing standards. Provide the response strictly in JSON format as specified.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: {
              type: Type.STRING,
              description: "The official subject line of the letter (e.g. 'विषय: बजेट निकासा सम्बन्धमा।' or 'Subject: Request for Budget Allocation.')"
            },
            salutation: {
              type: Type.STRING,
              description: "The formal greeting for the recipient (e.g. 'श्रीमान् सचिवज्यू,' or 'Dear Sir/Madam,')"
            },
            body: {
              type: Type.STRING,
              description: "The main body/content of the letter. If there are multiple key points, structure them clearly."
            },
            closing: {
              type: Type.STRING,
              description: "The formal sign-off phrase (e.g. 'भवदीय,' or 'Sincerely yours,')"
            }
          },
          required: ["subject", "salutation", "body", "closing"]
        },
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response received from Gemini.");
    }

    try {
      const parsedData = JSON.parse(text);
      res.json(parsedData);
    } catch (parseError) {
      console.error("Error parsing JSON from Gemini:", text);
      // Fallback if the JSON isn't fully structured
      res.json({
        subject: isNepali ? `विषय: ${topic}` : `Subject: ${topic}`,
        salutation: isNepali ? "श्रीमान्," : "Dear Sir/Madam,",
        body: text,
        closing: isNepali ? "भवदीय," : "Sincerely,"
      });
    }
  } catch (error: any) {
    console.error("Gemini assistance error:", error);
    res.status(500).json({ error: error.message || "An error occurred while generating letter contents." });
  }
});

// Vite Middleware Integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
