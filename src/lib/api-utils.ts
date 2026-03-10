import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { z } from "zod/v4";

export async function requireAuth() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function errorResponse(error: unknown, context: string) {
  console.error(`${context}:`, error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return !isNaN(d.getTime());
}

export function isValidDays(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 3650;
}

export function isCalendarDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  if (isNaN(d.getTime())) return false;
  // Verify the date didn't roll over (e.g. Feb 30 -> Mar 2)
  return d.toISOString().startsWith(value);
}

export function validationError(error: z.ZodError) {
  const messages = error.issues.map((i) => {
    const path = i.path.join(".");
    return path ? `${path}: ${i.message}` : i.message;
  });
  return NextResponse.json(
    { error: "Invalid input", messages },
    { status: 400 }
  );
}
