"use server";

export async function generateInterviewQuestions() {
  return {
    success: false,
    error: "AI question generation is unavailable because this project has no configured AI provider or API key.",
  };
}
