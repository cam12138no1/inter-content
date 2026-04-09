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

// Client-side truncation limit.
// AI models work best with focused content (~50k chars ≈ 12k tokens).
// Also keeps well within Vercel's 4.5MB body limit.
const MAX_TEXT_FOR_API = 50000;

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
  const [fileName, setFileName] = useState<string>("");
  const [fileLoading, setFileLoading] = useState(false);
  const [truncatedInfo, setTruncatedInfo] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const togglePreference = (pref: string) => {
    setSocialPreferences((prev) =>
      prev.includes(pref)
        ? prev.filter((p) => p !== pref)
        : [...prev, pref]
    );
  };

  // ---- Client-side PDF text extraction ----
  const extractPDFTextClientSide = useCallback(async (file: File): Promise<string> => {
    setFileLoading(true);

    try {
      // Dynamic import pdf.js
      const pdfjsLib = await import("pdfjs-dist");

      // Set worker from CDN matching the installed version
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
      }).promise;

      const textParts: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pageText = content.items
          .map((item: unknown) => {
            const rec = item as Record<string, unknown>;
            return (rec.str as string) || "";
          })
          .join(" ");
        if (pageText.trim()) textParts.push(pageText);
      }

      const fullText = textParts.join("\n\n");
      if (!fullText.trim()) {
        throw new Error("No text extracted — the PDF may be image-based (scanned). Try a text-based PDF or .txt file.");
      }
      return fullText;
    } catch (clientErr) {
      console.warn("Client-side PDF parsing failed, trying server fallback:", clientErr);

      // Fallback: try server-side parsing (only works for files < 4.5MB)
      if (file.size < 4 * 1024 * 1024) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/parse-pdf", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          return data.text;
        }
      }

      throw clientErr;
    }
  }, []);

  // ---- File upload handler ----
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      alert("File is too large. Maximum supported size is 50MB.");
      return;
    }

    setFileLoading(true);
    setFileName(file.name);
    setTruncatedInfo("");

    try {
      let text: string;

      if (file.name.toLowerCase().endsWith(".pdf")) {
        text = await extractPDFTextClientSide(file);
      } else {
        // txt, md, etc. — read directly in browser
        text = await file.text();
      }

      // Show warning if text will be truncated
      if (text.length > MAX_TEXT_FOR_API) {
        setTruncatedInfo(
          `Original: ${(text.length / 1000).toFixed(0)}k chars. Will send first ${(MAX_TEXT_FOR_API / 1000).toFixed(0)}k chars to AI (model context limit).`
        );
      }

      setNovelText(text);

      // Auto-fill IP name from filename if empty
      if (!ipName) {
        const name = file.name
          .replace(/\.(txt|md|text|novel|pdf)$/i, "")
          .replace(/[_-]/g, " ")
          .trim();
        if (name) setIpName(name);
      }
    } catch (err) {
      console.error("Failed to read file:", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      alert(`Failed to read file: ${msg}`);
    } finally {
      setFileLoading(false);
    }
  }, [ipName, extractPDFTextClientSide]);

  // ---- Run pipeline ----
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

    // Truncate text client-side to stay within Vercel's 4.5MB body limit
    let textToSend = novelText;
    if (textToSend.length > MAX_TEXT_FOR_API) {
      textToSend = textToSend.slice(0, MAX_TEXT_FOR_API) +
        "\n\n[... remaining text omitted — first 100k characters provided ...]";
    }

    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novel_text: textToSend,
          ip_name: ipName,
          target_market: targetMarket,
          social_preferences: socialPreferences,
        }),
        signal: abortRef.current.signal,
      });

      // Check for non-streaming error responses
      if (!res.ok) {
        const errText = await res.text();
        setStages((prev) =>
          prev.map((s, i) =>
            i === 0
              ? { ...s, status: "error" as StageStatus, message: `HTTP ${res.status}: ${errText.slice(0, 200)}` }
              : s
          )
        );
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const dataLines = event
            .split("\n")
            .filter((line) => line.startsWith("data: "))
            .map((line) => line.slice(6));

          for (const dataStr of dataLines) {
            try {
              const data = JSON.parse(dataStr);

              setStages((prev) =>
                prev.map((s) =>
                  s.id === data.stage
                    ? { ...s, status: data.status, message: data.message }
                    : s
                )
              );

              if (data.stage === "done" && data.status === "complete" && data.data?.ipId) {
                setCompletedIpId(data.data.ipId);
              }

              if (data.stage === "error" && data.status === "error") {
                setStages((prev) =>
                  prev.map((s) =>
                    s.status === "running"
                      ? { ...s, status: "error" as StageStatus, message: data.message }
                      : s
                  )
                );
              }
            } catch {
              console.warn("Skipping malformed SSE data:", dataStr.slice(0, 100));
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Pipeline error:", err);
      setStages((prev) =>
        prev.map((s) =>
          s.status === "running"
            ? { ...s, status: "error" as StageStatus, message: err instanceof Error ? err.message : "Connection lost" }
            : s
        )
      );
    } finally {
      setRunning(false);
    }
  }, [ipName, novelText, targetMarket, socialPreferences]);

  // ---- UI Helpers ----
  const statusIcon = (status: StageStatus) => {
    switch (status) {
      case "pending": return "○";
      case "running": return "◉";
      case "complete": return "●";
      case "error": return "✕";
    }
  };

  const statusColor = (status: StageStatus) => {
    switch (status) {
      case "pending": return "text-gray-600";
      case "running": return "text-indigo-400";
      case "complete": return "text-green-400";
      case "error": return "text-red-400";
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
              {["identity_test", "challenge", "confession", "friend_comparison"].map((pref) => (
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

            {/* File upload area */}
            <div
              onClick={() => !running && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (running) return;
                const file = e.dataTransfer.files[0];
                if (file && fileInputRef.current) {
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  fileInputRef.current.files = dt.files;
                  fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
                }
              }}
              className={`mb-2 p-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                running
                  ? "border-gray-700 text-gray-600 cursor-not-allowed"
                  : "border-[var(--border)] text-gray-400 hover:border-indigo-500/50 hover:text-indigo-400"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.text,.novel,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                disabled={running}
              />
              {fileLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span>Reading file...</span>
                </div>
              ) : fileName ? (
                <div>
                  <p className="text-indigo-400 font-medium">{fileName}</p>
                  <p className="text-xs text-gray-500 mt-1">Click to choose a different file</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">Click to upload or drag & drop</p>
                  <p className="text-xs mt-1">Supports .txt, .md, .pdf (up to 50MB)</p>
                </div>
              )}
            </div>

            {/* Truncation warning */}
            {truncatedInfo && (
              <div className="mb-2 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                <p className="text-xs text-yellow-400">{truncatedInfo}</p>
              </div>
            )}

            {/* Text area for paste or edit */}
            <textarea
              value={novelText}
              onChange={(e) => {
                setNovelText(e.target.value);
                setTruncatedInfo("");
              }}
              placeholder="Or paste the novel text, synopsis, or detailed description here..."
              className="w-full h-48 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none font-mono text-sm"
              disabled={running}
            />
            <p className="text-xs text-gray-500 mt-1">
              {novelText.length.toLocaleString()} characters
              {novelText.length > MAX_TEXT_FOR_API && (
                <span className="text-yellow-400">
                  {" "}(will send first {(MAX_TEXT_FOR_API / 1000).toFixed(0)}k to AI)
                </span>
              )}
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
                    <span className={`text-lg ${statusColor(stage.status)}`}>
                      {statusIcon(stage.status)}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{stage.name}</div>
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
                  <p className="text-green-400 font-medium">Pipeline Complete!</p>
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
