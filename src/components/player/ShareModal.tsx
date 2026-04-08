"use client";

import { useState, useCallback } from "react";
import type { Scene } from "@/types";

interface ShareModalProps {
  ipId: string;
  sceneId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any;
  scene: Scene | null;
  onClose: () => void;
}

export function ShareModal({
  ipId,
  sceneId,
  result,
  scene,
  onClose,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  // Build share URL
  const userId = Math.random().toString(36).slice(2, 8);
  const resultEncoded = btoa(
    JSON.stringify({
      title: result?.title,
      key: result?.key,
    })
  );
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${baseUrl}/play/${ipId}/${sceneId}?ref=${userId}&result=${resultEncoded}`;

  // Build share text
  const shareTemplate =
    scene?.share_exit?.share_text_template ||
    `I got {result} in {scene}! What about you? {link}`;
  const shareText = shareTemplate
    .replace("{result}", result?.title || "a result")
    .replace("{scene}", scene?.scene_title || "this scene")
    .replace("{link}", shareUrl);

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  const shareWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank"
    );
  };

  const shareTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      "_blank"
    );
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: result?.title || "My Result",
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled or not supported
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-[430px] bg-[var(--surface)] border-t border-[var(--border)] rounded-t-2xl p-6 space-y-4 card-enter">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto" />

        <h3 className="text-lg font-semibold text-white text-center">
          Share Your Result
        </h3>

        {/* Result preview */}
        <div className="p-4 bg-[var(--background)] rounded-xl text-center">
          <p className="text-white font-bold">{result?.title || "Result"}</p>
          {result?.matching_character && (
            <p className="text-sm text-gray-400 mt-1">
              Matched: {result.matching_character}
            </p>
          )}
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={shareWhatsApp}
            className="flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-colors tap-target"
          >
            <span>WhatsApp</span>
          </button>

          <button
            onClick={shareTwitter}
            className="flex items-center justify-center gap-2 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-medium transition-colors tap-target"
          >
            <span>Twitter/X</span>
          </button>

          <button
            onClick={shareNative}
            className="flex items-center justify-center gap-2 py-3 bg-[var(--surface-light)] border border-[var(--border)] text-white rounded-xl font-medium transition-colors tap-target"
          >
            <span>More...</span>
          </button>

          <button
            onClick={copyLink}
            className="flex items-center justify-center gap-2 py-3 bg-[var(--surface-light)] border border-[var(--border)] text-white rounded-xl font-medium transition-colors tap-target"
          >
            <span>{copied ? "Copied!" : "Copy Link"}</span>
          </button>
        </div>

        {/* Friend comparison CTA */}
        {scene?.share_exit?.friend_comparison && (
          <div className="text-center">
            <p className="text-sm text-indigo-400">
              {scene.share_exit.comparison_text ||
                "Share with friends to compare results!"}
            </p>
          </div>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full py-2.5 text-gray-400 hover:text-white text-sm transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
