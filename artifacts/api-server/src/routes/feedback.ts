import { Router, type IRouter } from "express";
import {
  DatabaseConfigurationError,
  exportFeedbackCsv,
  FeedbackValidationError,
  getFeedbackDashboard,
  isDatabaseConfigured,
  submitFeedback,
} from "@workspace/feedback-store";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/feedback", async (req, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: "Database is not configured." });
  }
  try {
    return res.status(201).json(await submitFeedback(req.body));
  } catch (error) {
    if (error instanceof FeedbackValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof DatabaseConfigurationError) {
      return res.status(503).json({ error: "Database is not configured." });
    }
    logger.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Could not save guest feedback",
    );
    return res.status(500).json({ error: "Could not save feedback." });
  }
});

router.get("/dashboard", async (_req, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: "Database is not configured." });
  }
  try {
    return res.status(200).json(await getFeedbackDashboard());
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return res.status(503).json({ error: "Database is not configured." });
    }
    logger.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Could not load guest feedback dashboard",
    );
    return res.status(500).json({ error: "Could not load dashboard." });
  }
});

router.get("/feedback/export", async (_req, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: "Database is not configured." });
  }
  try {
    res.type("text/csv; charset=utf-8");
    res.attachment("for-you-feedback.csv");
    return res.status(200).send(`\uFEFF${await exportFeedbackCsv()}`);
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return res.status(503).json({ error: "Database is not configured." });
    }
    logger.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Could not export guest feedback",
    );
    return res.status(500).json({ error: "Could not export feedback." });
  }
});

export default router;
