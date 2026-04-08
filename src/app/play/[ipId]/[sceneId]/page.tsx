"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PlayerShell } from "@/components/player/PlayerShell";

function PlayerContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const ipId = params.ipId as string;
  const sceneId = params.sceneId as string;
  const refUserId = searchParams.get("ref");
  const refResult = searchParams.get("result");

  return (
    <PlayerShell
      ipId={ipId}
      sceneId={sceneId}
      refUserId={refUserId}
      refResult={refResult}
    />
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="player-container flex items-center justify-center min-h-screen bg-[var(--background)]">
          <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PlayerContent />
    </Suspense>
  );
}
