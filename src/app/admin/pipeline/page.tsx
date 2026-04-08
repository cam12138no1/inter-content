"use client";

import { useState, useRef, useCallback } from "react";
import { PIPELINE_STAGES } from "@/lib/utils/constants";

type StageStatus = "pending" | "running" | "complete" | "error";

interface StageState {
  id: string;
  name: string;
  description: string;
  status: StageStatus;
  message: string;
}

export default function PipelinePage() {
  const [ipName, setIpName] = useState("");
  const [novelText, setNovelText] = useState("");
  const [targetMarket, setTargetMarket] = useState("global");
  const [socialPreferences, setSocialPreferences] = useState<string[]>([
    "identity_test",
    "friend_comparison",
  ]);
  const [running, setRunning] = useState(false);
  const [stages, setStages] = useState<StageState[]>([]);
  const [completedIpId, setCompletedIpId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const togglePreference = (pref: string) => {
    setSocialPreferences((prev) =>
      prev.includes(pref)
        ? prev.filter((p) => p !== pref)
        : [...prev, pref]
    );
  };

  const runPipeline = useCallback(async () => {
    if (!ipName.trim() || !novelText.trim()) return;

    setRunning(true);
    setCompletedIpId(null);
    setStages(
      PIPELINE_STAGES.map((s) => ({
        ...s,
        status: "pending" as StageStatus,
        message: "",
      }))
    );

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novel_text: novelText,
          ip_name: ipName,
          target_market: targetMarket,
          social_preferences: socialPreferences,
        }),
        signal: abortRef.current.signal,
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              setStages((prev) =>
                prev.map((s) =>
                  s.id === data.stage
                    ? {
                        ...s,
                        status: data.status,
                        message: data.message,
                      }
                    : s
                )
              );

              if (
                data.stage === "done" &&
                data.status === "complete" &&
                data.data?.ipId
              ) {
                setCompletedIpId(data.data.ipId);
              }
            } catch {
              // skip malformed events
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      console.error("Pipeline error:", err);
    } finally {
      setRunning(false);
    }
  }, [ipName, novelText, targetMarket, socialPreferences]);

  const statusIcon = (status: StageStatus) => {
    switch (status) {
      case "pending":
        return "○";
      case "running":
        return "◉";
      case "complete":
        return "●";
      case "error":
        return "✕";
    }
  };

  const statusColor = (status: StageStatus) => {
    switch (status) {
      case "pending":
        return "text-gray-600";
      case "running":
        return "text-indigo-400";
      case "complete":
        return "text-green-400";
      case "error":
        return "text-red-400";
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Pipeline Runner</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              IP Name
            </label>
            <input
              type="text"
              value={ipName}
              onChange={(e) => setIpName(e.target.value)}
              placeholder="e.g., Omniscient Reader's Viewpoint"
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              disabled={running}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Target Market
            </label>
            <select
              value={targetMarket}
              onChange={(e) => setTargetMarket(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-white focus:outline-none focus:border-indigo-500"
              disabled={running}
            >
              <option value="global">Global</option>
              <option value="ID">Indonesia</option>
              <option value="US">United States</option>
              <option value="ID,US">Indonesia + US</option>
              <option value="SEA">Southeast Asia</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Social Scene Preferences
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                "identity_test",
                "challenge",
                "confession",
                "friend_comparison",
              ].map((pref) => (
                <button
                  key={pref}
                  onClick={() => togglePreference(pref)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    socialPreferences.includes(pref)
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                      : "border-[var(--border)] text-gray-500 hover:text-gray-300"
                  }`}
                  disabled={running}
                >
                  {pref.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Novel Text / Synopsis
            </label>
            <textarea
              value={novelText}
              onChange={(e) => setNovelText(e.target.value)}
              placeholder="Paste the novel text, synopsis, or detailed description here..."
              className="w-full h-64 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none font-mono text-sm"
              disabled={running}
            />
            <p className="text-xs text-gray-500 mt-1">
              {novelText.length.toLocaleString()} characters
            </p>
          </div>

          <button
            onClick={runPipeline}
            disabled={running || !ipName.trim() || !novelText.trim()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
          >
            {running ? "Running Pipeline..." : "Run Pipeline"}
          </button>
        </div>

        {/* Progress Display */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Progress</h2>

          {stages.length === 0 ? (
            <div className="text-gray-500 text-sm py-8 text-center">
              Pipeline stages will appear here once started
            </div>
          ) : (
            <div className="space-y-2">
              {stages.map((stage) => (
                <div
                  key={stage.id}
                  className={`p-3 bg-[var(--surface)] border rounded-lg transition-colors ${
                    stage.status === "running"
                      ? "border-indigo-500/50"
                      : stage.status === "complete"
                        ? "border-green-500/30"
                        : stage.status === "error"
                          ? "border-red-500/30"
                          : "border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-lg ${statusColor(stage.status)}`}
                    >
                      {statusIcon(stage.status)}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">
                        {stage.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {stage.message || stage.description}
                      </div>
                    </div>
                    {stage.status === "running" && (
                      <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </div>
              ))}

              {completedIpId && (
                <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <p className="text-green-400 font-medium">
                    Pipeline Complete!
                  </p>
                  <div className="flex gap-2 mt-2">
                    <a
                      href={`/admin/data/${completedIpId}`}
                      className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                    >
                      View Data
                    </a>
                    <a
                      href={`/play/${completedIpId}/s01`}
                      className="px-3 py-1.5 text-sm border border-green-600 text-green-400 hover:bg-green-600/10 rounded-lg transition-colors"
                    >
                      Play First Scene
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
