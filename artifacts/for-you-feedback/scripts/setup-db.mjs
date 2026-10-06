import { neon } from "@neondatabase/serverless";

const connectionString = process.env.NEON_DATABASE_URL;
if (!connectionString) {
  throw new Error("Set NEON_DATABASE_URL before running the database setup.");
}

const sql = neon(connectionString);
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
console.log("Neon feedback schema is ready.");
