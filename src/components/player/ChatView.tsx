"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { Blueprint, Scene, AIResponse } from "@/types";
import { useChat } from "@/hooks/useChat";
import { TIER_CONFIG } from "@/lib/utils/constants";

interface ChatViewProps {
  ipId: string;
  sceneId: string;
  blueprint: Blueprint;
  scene: Scene | null;
  onComplete: (result: unknown) => void;
}

export function ChatView({
  ipId,
  sceneId,
  blueprint,
  scene,
  onComplete,
}: ChatViewProps) {
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const tier = blueprint.tier as 1.5 | 2;
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG[1.5];
  const maxTurns = tierConfig.maxTurns;

  const { messages, gameState, loading, lastResponse, isComplete, sendMessage } =
    useChat({
      ipId,
      sceneId,
      initialState: { trust: 0, suspicion: 0, turn: 0 },
      maxTurns,
    });

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // On complete, pass result to parent
  useEffect(() => {
    if (isComplete && lastResponse) {
      setTimeout(() => {
        onComplete({
          title: lastResponse.emotion === "warm" ? "Trust Earned" : "Scene Complete",
          description: lastResponse.reply,
          emotion: lastResponse.emotion,
          trust: gameState.trust,
          turn: gameState.turn,
        });
      }, 1500);
    }
  }, [isComplete, lastResponse, gameState, onComplete]);

  // Parse AI response from message content
  const parsedMessages = useMemo(() => {
    return messages.map((msg) => {
      if (msg.role === "assistant") {
        try {
          return { ...msg, parsed: JSON.parse(msg.content) as AIResponse };
        } catch {
          return { ...msg, parsed: null };
        }
      }
      return { ...msg, parsed: null };
    });
  }, [messages]);

  // Get suggested responses
  const suggestedResponses =
    lastResponse?.suggested_responses || [];

  function handleSend(text?: string) {
    const msg = text || inputText.trim();
    if (!msg || loading) return;
    sendMessage(msg);
    setInputText("");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">
              {scene?.scene_title || sceneId}
            </h2>
            <p className="text-xs text-gray-500">
              Turn {gameState.turn}/{maxTurns}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span
              className={`px-2 py-0.5 rounded ${
                (gameState.trust as number) > 0
                  ? "bg-green-900/30 text-green-400"
                  : (gameState.trust as number) < 0
                    ? "bg-red-900/30 text-red-400"
                    : "bg-gray-800 text-gray-400"
              }`}
            >
              Trust: {gameState.trust as number}
            </span>
          </div>
        </div>
        {/* Turn progress */}
        <div className="mt-2 flex gap-0.5">
          {Array.from({ length: maxTurns }).map((_, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full ${
                i < (gameState.turn as number)
                  ? "bg-indigo-500"
                  : "bg-gray-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Hook message */}
      {messages.length === 0 && scene?.hook && (
        <div className="px-4 py-6">
          <div className="max-w-[85%] p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl rounded-tl-sm chat-bubble-enter">
            <p className="text-white text-sm">{scene.hook.text}</p>
          </div>
        </div>
      )}

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 chat-scroll">
        {parsedMessages.map((msg, i) => {
          const isUser = msg.role === "user";
          const parsed = msg.parsed;

          return (
            <div
              key={i}
              className={`flex ${isUser ? "justify-end" : "justify-start"} chat-bubble-enter`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl ${
                  isUser
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-[var(--surface)] border border-[var(--border)] text-white rounded-bl-sm"
                }`}
              >
                <p className="text-sm leading-relaxed">
                  {isUser
                    ? msg.content
                    : parsed?.reply || msg.content}
                </p>
                {parsed?.emotion && !isUser && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    [{parsed.emotion}]
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                <span
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <span
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested responses */}
      {suggestedResponses.length > 0 && !loading && !isComplete && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto">
          {suggestedResponses.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => handleSend(suggestion)}
              className="flex-shrink-0 px-3 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] text-gray-300 rounded-full hover:border-indigo-500/50 transition-colors tap-target"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      {!isComplete && (
        <div className="px-4 py-3 bg-[var(--surface)] border-t border-[var(--border)]">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-full text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || loading}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded-full transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Complete indicator */}
      {isComplete && (
        <div className="px-4 py-4 bg-[var(--surface)] border-t border-[var(--border)] text-center">
          <p className="text-indigo-400 text-sm font-medium">
            Scene complete! Loading your result...
          </p>
        </div>
      )}
    </div>
  );
}
