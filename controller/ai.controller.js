import File from "../model/file.model.js";
import dotenv from "dotenv";
import fetch from "node-fetch"; 
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const fetchPdfBytes = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to download PDF");

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("PDF fetch error:", err);
    throw new Error("Failed to fetch PDF from URL");
  }
};

const retryGemini = async (fn, retries = 3, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.message.includes("503") && i < retries - 1) {
        console.log(`Gemini overloaded, retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
};


export const generateSummary = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    const pdfBytes = await fetchPdfBytes(file.fileUrl);

    
    const response = await retryGemini(() =>
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { text: "Summarize this document in a clear, student-friendly way" },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBytes.toString("base64"),
            },
          },
        ],
      })
    );

    const summaryText = response.text.trim();

    file.summary = summaryText;
    await file.save();

    res.status(200).json({
      success: true,
      message: "Summary generated successfully",
      summary: summaryText,
    });
  } catch (err) {
    console.error("Summary generation error:", err);
    res.status(500).json({
      success: false,
      message: "Error generating summary",
      error: err.message,
    });
  }
};


export const generateQuiz = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    const pdfBytes = await fetchPdfBytes(file.fileUrl);

    const response = await retryGemini(() =>
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { text: `
Create exactly 2 multiple-choice questions (MCQs) from this document.
Each question should have:
- "question": the question text
- "options": an array of 4 options (A-D)
- "answer": the correct option letter ("A", "B", "C", or "D")

**IMPORTANT**: Return **only valid JSON**, no explanations, no markdown, no extra text. Example:

{
  "quiz": [
    {
      "question": "What is ...?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "answer": "B"
    },
    {
      "question": "Which ...?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "answer": "A"
    }
  ]
}
          ` },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBytes.toString("base64"),
            },
          },
        ],
      })
    );

    const quizText = response.text.trim();

    let quizData = [];
    try {
      const jsonMatch = quizText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        quizData = parsed.quiz || [];
      } else {
        console.error("No JSON found in quiz response");
      }
    } catch (parseErr) {
      console.error("Failed to parse quiz JSON:", parseErr);
    }

    file.quiz = quizData;
    await file.save();

    res.status(200).json({
      success: true,
      message: "Quiz generated successfully",
      quiz: quizData,
    });
  } catch (err) {
    console.error("Quiz generation error:", err);
    res.status(500).json({
      success: false,
      message: "Error generating quiz",
      error: err.message,
    });
  }
};
