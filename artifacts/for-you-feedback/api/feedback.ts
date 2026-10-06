import {
  DatabaseConfigurationError,
  FeedbackValidationError,
  isDatabaseConfigured,
  submitFeedback,
} from "@workspace/feedback-store";
import type { ApiRequest, ApiResponse } from "./_lib/http";

export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
): Promise<ApiResponse | void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: "Database is not configured." });
  }
  try {
    const feedback = await submitFeedback(req.body);
    return res.status(201).json(feedback);
  } catch (error) {
    if (error instanceof FeedbackValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof DatabaseConfigurationError) {
      return res.status(503).json({ error: "Database is not configured." });
    }
    return res.status(500).json({ error: "Could not save feedback." });
  }
}
