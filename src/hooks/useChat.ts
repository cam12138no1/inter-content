"use client";

import { useState, useCallback } from "react";
import type { ChatMessage, GameState, AIResponse } from "@/types";

interface UseChatOptions {
  ipId: string;
  sceneId: string;
  initialState: GameState;
  maxTurns: number;
}

export function useChat({
  ipId,
  sceneId,
  initialState,
  maxTurns,
}: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<AIResponse | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sceneExit, setSceneExit] = useState<any>(null);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (loading || isComplete) return;
      if (gameState.turn >= maxTurns) {
        setIsComplete(true);
        return;
      }

      const newUserMsg: ChatMessage = {
        role: "user",
        content: userMessage,
      };
      setMessages((prev) => [...prev, newUserMsg]);
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ip_id: ipId,
            scene_id: sceneId,
            user_message: userMessage,
            conversation_history: [...messages, newUserMsg].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            current_state: gameState,
          }),
        });

        const data = await res.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const aiMsg: ChatMessage = {
          role: "assistant",
          content: JSON.stringify(data.ai_response),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setGameState(data.new_state);
        setLastResponse(data.ai_response);

        if (data.scene_exit || data.ai_response?.is_final) {
          setIsComplete(true);
          setSceneExit(data.scene_exit);
        }
      } catch (err) {
        console.error("Chat error:", err);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: JSON.stringify({
              reply: "Something went wrong. Please try again.",
              suggested_responses: [],
              emotion: "neutral",
              trust_delta: 0,
              turn: gameState.turn,
              is_final: false,
              image_hint: null,
            }),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [ipId, sceneId, messages, gameState, loading, isComplete, maxTurns]
  );

  return {
    messages,
    gameState,
    loading,
    lastResponse,
    isComplete,
    sceneExit,
    sendMessage,
  };
}
