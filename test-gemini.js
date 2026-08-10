import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
ai.models.generateContent({
  model: "gemini-2.0-flash",
  contents: "hello",
}).then(res => console.log(res.text)).catch(err => console.error(err));
