export const QUESTION_CATEGORIES = Object.freeze({
  FRONTEND: "React, JavaScript, CSS, performance, accessibility, browser APIs",
  BACKEND: "Node.js, REST APIs, databases, authentication, caching, scalability",
  FULLSTACK: "full-stack architecture, API design, state management, deployment",
  DSA: "data structures, algorithms, time complexity, problem solving",
  SYSTEM_DESIGN: "distributed systems, scalability, databases, microservices, caching",
  BEHAVIORAL: "leadership, teamwork, conflict resolution, career growth, STAR method",
  DEVOPS: "CI/CD, Docker, Kubernetes, cloud infrastructure, monitoring",
  MOBILE: "React Native, iOS/Android, performance, offline support, app lifecycle",
});

export const QUESTION_MODEL = "gemini-3.5-flash-lite";

export function parseInterviewQuestions(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("invalid-response");
  }
  const cleaned = raw.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("invalid-response");
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 6 ||
    parsed.some((item) =>
      !item ||
      typeof item.question !== "string" ||
      !item.question.trim() ||
      item.question.length > 1000 ||
      typeof item.answer !== "string" ||
      !item.answer.trim() ||
      item.answer.length > 4000
    )
  ) {
    throw new Error("unexpected-format");
  }
  return parsed.map(({ question, answer }) => ({
    question: question.trim(),
    answer: answer.trim(),
  }));
}
