import { NextRequest } from "next/server";
import { runPipeline } from "@/lib/pipeline/engine";
import type { PipelineProgress } from "@/types";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { novel_text, ip_name, target_market, social_preferences } = body;

  if (!novel_text || !ip_name) {
    return new Response(
      JSON.stringify({ error: "novel_text and ip_name are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: PipelineProgress) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        await runPipeline(
          {
            novel_text,
            ip_name,
            target_market: target_market || "global",
            social_preferences: social_preferences || [
              "identity_test",
              "friend_comparison",
            ],
          },
          sendEvent
        );
      } catch (err) {
        sendEvent({
          stage: "error",
          status: "error",
          message:
            err instanceof Error ? err.message : "Pipeline failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
