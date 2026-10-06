import {
  DatabaseConfigurationError,
  getFeedbackDashboard,
  isDatabaseConfigured,
} from "@workspace/feedback-store";
import type { ApiRequest, ApiResponse } from "./_lib/http";

export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
): Promise<ApiResponse | void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }
  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: "Database is not configured." });
  }
  try {
    return res.status(200).json(await getFeedbackDashboard());
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return res.status(503).json({ error: "Database is not configured." });
    }
    return res.status(500).json({ error: "Could not load dashboard." });
  }
}
