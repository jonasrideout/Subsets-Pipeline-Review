import { NextResponse } from "next/server";
import { fetchActiveDeals, fetchClosedWonQTD, fetchClosedWonYTD, fetchAllEmailSignals } from "@/lib/hubspot";
export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: object) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        emit("progress", { step: "deals", message: "Fetching active deals…" });
        const [active, closedWonQTD, closedWonYTD] = await Promise.all([
          fetchActiveDeals(),
          fetchClosedWonQTD(),
          fetchClosedWonYTD(),
        ]);
        emit("progress", { step: "deals_done", message: `✓ Loaded ${active.length} active deals` });

        const now = new Date();
        emit("progress", { step: "signals", message: "Fetching email signals…", total: active.length });

        const emailSignals = await fetchAllEmailSignals(
          active,
          now,
          (fetched: number, total: number) => {
            emit("progress", { step: "signals_progress", message: `Fetching email signals (${fetched} of ${total})…`, fetched, total });
          }
        );

        emit("progress", { step: "signals_done", message: "✓ Email signals loaded" });

        emit("result", {
          active,
          closedWon:    closedWonQTD,
          closedWonYTD,
          emailSignals,
          asOf: now.toISOString(),
        });
      } catch (err) {
        emit("error", { message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}
