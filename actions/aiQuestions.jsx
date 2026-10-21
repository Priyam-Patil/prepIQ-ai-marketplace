"use server";

import { currentUser } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  parseInterviewQuestions,
  QUESTION_CATEGORIES,
  QUESTION_MODEL,
} from "@/lib/ai-questions.mjs";

export async function generateInterviewQuestions(input) {
  const user = await currentUser();
  if (!user?.id) {
    return { success: false, error: "Sign in to generate interview questions." };
  }

  const category = input && typeof input === "object" ? input.category : null;
  if (typeof category !== "string" || !Object.hasOwn(QUESTION_CATEGORIES, category)) {
    return { success: false, error: "Choose a valid interview category." };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "AI question generation is not configured." };
  }

  try {
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: QUESTION_MODEL,
      generationConfig: { responseMimeType: "application/json" },
    });
    const result = await model.generateContent(`
You are an expert technical interviewer.
Generate exactly 6 interview questions for the ${category} category.
Topics to cover: ${QUESTION_CATEGORIES[category]}.
For each question, provide a concise and accurate sample answer in 2-4 sentences.
Return only a JSON array with this shape: [{"question":"...","answer":"..."}].
Do not include Markdown or additional explanation.
`);
    const questions = parseInterviewQuestions(result.response.text());
    return { success: true, questions };
  } catch (error) {
    console.error("AI interview question generation failed.", error?.name || "Error");
    return {
      success: false,
      error: error?.message === "invalid-response" || error?.message === "unexpected-format"
        ? "The AI returned an unreadable response. Please try again."
        : "AI question generation is temporarily unavailable. Please try again.",
    };
  }
}
