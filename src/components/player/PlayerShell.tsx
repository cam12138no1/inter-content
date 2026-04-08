"use client";

import { useState, useEffect } from "react";
import type { Blueprint, SceneGraph } from "@/types";
import { CardSwipeView } from "./CardSwipeView";
import { ChatView } from "./ChatView";
import { ResultDisplay } from "./ResultDisplay";
import { ShareModal } from "./ShareModal";

interface PlayerShellProps {
  ipId: string;
  sceneId: string;
  refUserId?: string | null;
  refResult?: string | null;
}

export function PlayerShell({
  ipId,
  sceneId,
  refUserId,
  refResult,
}: PlayerShellProps) {
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [sceneGraph, setSceneGraph] = useState<SceneGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<
    "viral_entry" | "playing" | "result" | "share"
  >(refResult ? "viral_entry" : "playing");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // Load blueprint
        const bpRes = await fetch(
          `/api/data/${ipId}?file=blueprints/${sceneId}_blueprint.json`
        );
        if (!bpRes.ok) throw new Error("Blueprint not found");
        const bp = await bpRes.json();
        setBlueprint(bp);

        // Load scene graph
        const sgRes = await fetch(
          `/api/data/${ipId}?file=scene_graph.json`
        );
        if (sgRes.ok) {
          setSceneGraph(await sgRes.json());
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load scene"
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [ipId, sceneId]);

  // Auto-transition from viral entry
  useEffect(() => {
    if (phase === "viral_entry") {
      const timer = setTimeout(() => setPhase("playing"), 3000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  function handleComplete(resultData: unknown) {
    setResult(resultData);
    setPhase("result");
  }

  if (loading) {
    return (
      <div className="player-container flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !blueprint) {
    return (
      <div className="player-container flex items-center justify-center bg-[var(--background)] p-6">
        <div className="text-center space-y-3">
          <p className="text-red-400">{error || "Scene not found"}</p>
          <a
            href="/"
            className="text-indigo-400 hover:text-indigo-300 text-sm"
          >
            Go home
          </a>
        </div>
      </div>
    );
  }

  const scene = sceneGraph?.scenes?.find((s) => s.scene_id === sceneId);
  const accentColor =
    blueprint.frontend_spec?.accent_color || "#6366f1";

  return (
    <div
      className="player-container bg-[var(--background)]"
      style={{ "--player-accent": accentColor } as React.CSSProperties}
    >
      {/* Viral Entry Splash */}
      {phase === "viral_entry" && refResult && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--background)] p-6">
          <div className="text-center space-y-4 card-enter">
            <p className="text-gray-400 text-sm">
              {refUserId ? `Your friend` : "Someone"} got:
            </p>
            <div className="text-2xl font-bold text-white">
              {(() => {
                try {
                  return JSON.parse(atob(refResult)).title || refResult;
                } catch {
                  return refResult;
                }
              })()}
            </div>
            <p className="text-indigo-400 text-lg">What about you?</p>
          </div>
        </div>
      )}

      {/* Playing Phase */}
      {phase === "playing" && (
        <>
          {blueprint.tier === 1 ? (
            <CardSwipeView
              ipId={ipId}
              blueprint={blueprint}
              scene={scene || null}
              onComplete={handleComplete}
            />
          ) : (
            <ChatView
              ipId={ipId}
              sceneId={sceneId}
              blueprint={blueprint}
              scene={scene || null}
              onComplete={handleComplete}
            />
          )}
        </>
      )}

      {/* Result Phase */}
      {phase === "result" && (
        <ResultDisplay
          result={result}
          scene={scene || null}
          blueprint={blueprint}
          onShare={() => setShowShareModal(true)}
          onReplay={() => {
            setResult(null);
            setPhase("playing");
          }}
          onNext={() => {
            if (scene?.transition_to) {
              window.location.href = `/play/${ipId}/${scene.transition_to}`;
            }
          }}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          ipId={ipId}
          sceneId={sceneId}
          result={result}
          scene={scene || null}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
