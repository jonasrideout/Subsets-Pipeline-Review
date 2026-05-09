// app/api/snapshot/route.ts

import { NextResponse } from "next/server";
import { readSnapshot } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await readSnapshot();
  if (!snapshot) {
    return NextResponse.json({ error: "No snapshot available" }, { status: 404 });
  }
  return NextResponse.json(snapshot);
}
