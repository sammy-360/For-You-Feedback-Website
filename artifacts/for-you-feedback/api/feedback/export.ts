import {
  DatabaseConfigurationError,
  exportFeedbackCsv,
  isDatabaseConfigured,
} from "@workspace/feedback-store";
import type { ApiRequest, ApiResponse } from "../_lib/http";

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
    const csv = await exportFeedbackCsv();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="for-you-feedback.csv"');
    return res.status(200).send(`\uFEFF${csv}`);
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return res.status(503).json({ error: "Database is not configured." });
    }
    return res.status(500).json({ error: "Could not export feedback." });
  }
}
