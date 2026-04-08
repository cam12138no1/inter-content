"use client";

import type { Blueprint, Scene } from "@/types";

interface ResultDisplayProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any;
  scene: Scene | null;
  blueprint: Blueprint;
  onShare: () => void;
  onReplay: () => void;
  onNext: () => void;
}

export function ResultDisplay({
  result,
  scene,
  onShare,
  onReplay,
  onNext,
}: ResultDisplayProps) {
  const hasNext = !!scene?.transition_to;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6 result-reveal">
        {/* Result card */}
        <div className="bg-gradient-to-b from-[var(--surface)] to-[var(--surface-light)] border border-[var(--border)] rounded-2xl p-6 text-center space-y-4">
          {/* Matching character or icon */}
          {result?.matching_character && (
            <div className="w-20 h-20 mx-auto bg-indigo-600/20 rounded-full flex items-center justify-center">
              <span className="text-3xl">
                {result.emotion === "warm"
                  ? "💛"
                  : result.emotion === "hostile"
                    ? "⚔️"
                    : "✨"}
              </span>
            </div>
          )}

          {/* Result title */}
          <h2 className="text-2xl font-bold text-white">
            {result?.title || "Result"}
          </h2>

          {/* Subtitle */}
          {result?.subtitle && (
            <p className="text-indigo-400 font-medium">
              {result.subtitle}
            </p>
          )}

          {/* Description */}
          <p className="text-gray-400 text-sm leading-relaxed">
            {result?.description || ""}
          </p>

          {/* Stats */}
          {(result?.trust !== undefined || result?.turn !== undefined) && (
            <div className="flex justify-center gap-4 pt-2">
              {result?.trust !== undefined && (
                <div className="text-center">
                  <div
                    className={`text-lg font-bold ${
                      result.trust > 0
                        ? "text-green-400"
                        : result.trust < 0
                          ? "text-red-400"
                          : "text-gray-400"
                    }`}
                  >
                    {result.trust > 0 ? "+" : ""}
                    {result.trust}
                  </div>
                  <div className="text-xs text-gray-500">Trust</div>
                </div>
              )}
              {result?.turn !== undefined && (
                <div className="text-center">
                  <div className="text-lg font-bold text-indigo-400">
                    {result.turn}
                  </div>
                  <div className="text-xs text-gray-500">Turns</div>
                </div>
              )}
            </div>
          )}

          {/* Character match */}
          {result?.matching_character && (
            <div className="pt-2">
              <p className="text-xs text-gray-500">You matched with</p>
              <p className="text-white font-semibold">
                {result.matching_character}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Primary CTA: Share */}
          <button
            onClick={onShare}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors tap-target"
          >
            {scene?.share_exit?.primary_cta || "Share Your Result"}
          </button>

          {/* Secondary actions */}
          <div className="flex gap-3">
            <button
              onClick={onReplay}
              className="flex-1 py-2.5 border border-[var(--border)] text-gray-400 hover:text-white hover:border-gray-500 rounded-xl text-sm transition-colors tap-target"
            >
              Play Again
            </button>
            {hasNext && (
              <button
                onClick={onNext}
                className="flex-1 py-2.5 border border-indigo-500/50 text-indigo-400 hover:bg-indigo-600/10 rounded-xl text-sm transition-colors tap-target"
              >
                Next Scene
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
