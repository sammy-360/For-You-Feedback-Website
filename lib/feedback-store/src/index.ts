import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import {
  GetFeedbackDashboardResponse,
  SubmitFeedbackBody,
  SubmitFeedbackResponse,
} from "@workspace/api-zod";
import type {
  FeedbackDashboard,
  FeedbackEntry,
  FeedbackInput,
} from "@workspace/api-zod";

export type { FeedbackDashboard, FeedbackEntry, FeedbackInput };

type FeedbackRow = {
  id: string;
  overall: number;
  food: number;
  service: number;
  ambience: number;
  comment: string | null;
  name: string | null;
  createdAt: Date | string;
};

export class FeedbackValidationError extends Error {
  constructor() {
    super("Please provide valid ratings and feedback.");
    this.name = "FeedbackValidationError";
  }
}

export class DatabaseConfigurationError extends Error {
  constructor() {
    super("NEON_DATABASE_URL is not configured.");
    this.name = "DatabaseConfigurationError";
  }
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.NEON_DATABASE_URL);
}

function getSql() {
  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) throw new DatabaseConfigurationError();
  return neon(connectionString);
}

function toFeedbackEntry(row: FeedbackRow): FeedbackEntry {
  return SubmitFeedbackResponse.parse({
    id: row.id,
    overall: Number(row.overall),
    food: Number(row.food),
    service: Number(row.service),
    ambience: Number(row.ambience),
    comment: row.comment,
    name: row.name,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : new Date(row.createdAt).toISOString(),
  });
}

export async function submitFeedback(input: unknown): Promise<FeedbackEntry> {
  const parsed = SubmitFeedbackBody.safeParse(input);
  if (!parsed.success) throw new FeedbackValidationError();

  const sql = getSql();
  const data = parsed.data;
  const rows = await sql`
    INSERT INTO public.restaurant_feedback
      (id, overall, food, service, ambience, comment, name)
    VALUES
      (${randomUUID()}, ${data.overall}, ${data.food}, ${data.service},
       ${data.ambience}, ${data.comment?.trim() || null}, ${data.name?.trim() || null})
    RETURNING id::text AS id, overall, food, service, ambience, comment, name, created_at AS "createdAt"
  `;
  return toFeedbackEntry(rows[0] as FeedbackRow);
}

export async function getFeedbackDashboard(): Promise<FeedbackDashboard> {
  const sql = getSql();
  const [totalsRows, ratingRows, categoryRows, commentRows] = await Promise.all([
    sql`
      SELECT COUNT(*)::int AS count,
             AVG(overall)::float8 AS average
      FROM public.restaurant_feedback
    `,
    sql`
      SELECT overall AS rating, COUNT(*)::int AS count
      FROM public.restaurant_feedback
      GROUP BY overall
    `,
    sql`
      SELECT 'Food'::text AS category, AVG(food)::float8 AS average
      FROM public.restaurant_feedback
      UNION ALL
      SELECT 'Service'::text AS category, AVG(service)::float8 AS average
      FROM public.restaurant_feedback
      UNION ALL
      SELECT 'Ambience'::text AS category, AVG(ambience)::float8 AS average
      FROM public.restaurant_feedback
    `,
    sql`
      SELECT id::text AS id, overall, food, service, ambience, comment, name,
             created_at AS "createdAt"
      FROM public.restaurant_feedback
      WHERE comment IS NOT NULL AND BTRIM(comment) <> ''
      ORDER BY created_at DESC
      LIMIT 8
    `,
  ]);

  const total = Number(totalsRows[0]?.count ?? 0);
  const categoryAverages = categoryRows.map((row) => ({
    category: String(row.category) as "Food" | "Service" | "Ambience",
    average: Number(row.average ?? 0),
  }));
  const topCategory = total
    ? [...categoryAverages].sort((a, b) => b.average - a.average)[0]
    : null;
  const ratingCounts = new Map(
    ratingRows.map((row) => [Number(row.rating), Number(row.count)]),
  );
  const dashboard = {
    responseCount: total,
    averageOverall:
      total && totalsRows[0]?.average != null
        ? Number(totalsRows[0].average)
        : null,
    topCategory: topCategory?.category ?? null,
    topCategoryAverage: topCategory?.average ?? null,
    distribution: [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: ratingCounts.get(rating) ?? 0,
    })),
    categoryAverages,
    latestComments: commentRows.map((row) =>
      toFeedbackEntry(row as FeedbackRow),
    ),
  };

  return GetFeedbackDashboardResponse.parse(dashboard);
}

function csvCell(value: string | number | Date | null): string {
  let text = value instanceof Date ? value.toISOString() : String(value ?? "");
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function exportFeedbackCsv(): Promise<string> {
  const sql = getSql();
  const rows = await sql`
    SELECT id::text AS id, overall, food, service, ambience, comment, name,
           created_at AS "createdAt"
    FROM public.restaurant_feedback
    ORDER BY created_at DESC
  `;
  const columns: Array<keyof FeedbackRow> = [
    "createdAt",
    "name",
    "overall",
    "food",
    "service",
    "ambience",
    "comment",
  ];
  return [
    columns.map((column) => csvCell(column)).join(","),
    ...rows.map((row) => {
      const entry = toFeedbackEntry(row as FeedbackRow);
      return columns
        .map((column) => csvCell(entry[column] as string | number | null))
        .join(",");
    }),
  ].join("\r\n");
}

export async function ensureFeedbackSchema(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS public.restaurant_feedback (
      id uuid PRIMARY KEY,
      overall smallint NOT NULL CHECK (overall BETWEEN 1 AND 5),
      food smallint NOT NULL CHECK (food BETWEEN 1 AND 5),
      service smallint NOT NULL CHECK (service BETWEEN 1 AND 5),
      ambience smallint NOT NULL CHECK (ambience BETWEEN 1 AND 5),
      comment text,
      name text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS restaurant_feedback_created_at_idx
    ON public.restaurant_feedback (created_at DESC)
  `;
}
