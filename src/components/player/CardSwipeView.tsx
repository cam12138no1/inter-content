"use client";

import { useState, useMemo } from "react";
import type { Blueprint, Scene } from "@/types";
import { useSwipe } from "@/hooks/useSwipe";

interface CardSwipeViewProps {
  ipId: string;
  blueprint: Blueprint;
  scene: Scene | null;
  onComplete: (result: unknown) => void;
}

export function CardSwipeView({
  blueprint,
  scene,
  onComplete,
}: CardSwipeViewProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Extract choice steps from interaction sequence
  const steps = useMemo(() => {
    return blueprint.interaction_sequence.filter(
      (s) =>
        s.action === "user_choice" ||
        s.action === "show_hook" ||
        s.action === "story_slide"
    );
  }, [blueprint]);

  const currentStepData = steps[currentStep];

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => handleChoice(null),
    onSwipeRight: () => handleChoice(null),
  });

  function startTimer(seconds: number) {
    setTimerActive(true);
    setTimeLeft(seconds);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimerActive(false);
          handleChoice(null); // Auto-advance on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleChoice(option: { id: string; tags?: string[]; scoring?: string } | null) {
    if (option?.tags) {
      setSelectedTags((prev) => [...prev, ...option.tags!]);
    }
    if (option?.scoring) {
      const match = option.scoring.match(/(\w+)\s*\+\s*(\d+)/);
      if (match) {
        setScores((prev) => ({
          ...prev,
          [match[1]]: (prev[match[1]] || 0) + parseInt(match[2]),
        }));
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
      // Check if next step has timer
      const nextStep = steps[currentStep + 1];
      const timer = nextStep?.content?.timer_seconds;
      if (typeof timer === 'number' && timer > 0) {
        startTimer(timer);
      }
    } else {
      // Calculate result
      computeResult();
    }
  }

  function computeResult() {
    const resultLogic = scene?.result_logic;
    if (!resultLogic) {
      onComplete({ title: "Complete!", description: "You finished the scene." });
      return;
    }

    const results = resultLogic.results;
    let bestResult = null;

    if (resultLogic.method === "tag_majority") {
      // Count tags and find majority
      const tagCounts: Record<string, number> = {};
      selectedTags.forEach((t) => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });

      let maxCount = 0;
      let maxTag = "";
      Object.entries(tagCounts).forEach(([tag, count]) => {
        if (count > maxCount) {
          maxCount = count;
          maxTag = tag;
        }
      });

      // Find matching result
      for (const [key, result] of Object.entries(results)) {
        if (
          result.condition?.includes(maxTag) ||
          key.includes(maxTag)
        ) {
          bestResult = { key, ...result };
          break;
        }
      }
    } else if (resultLogic.method === "score_sum") {
      let maxScore = -Infinity;
      for (const [key, result] of Object.entries(results)) {
        const scoreKey = result.condition?.match(/(\w+)\s*>=?\s*(\d+)/)?.[1];
        const score = scoreKey ? (scores[scoreKey] || 0) : 0;
        if (score > maxScore) {
          maxScore = score;
          bestResult = { key, ...result };
        }
      }
    }

    if (!bestResult) {
      // Fallback: pick first result
      const firstKey = Object.keys(results)[0];
      bestResult = { key: firstKey, ...results[firstKey] };
    }

    onComplete(bestResult);
  }

  if (!currentStepData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const content = currentStepData.content || {};
  const options = (content.options || []) as Array<{ id: string; text: string; tags?: string[]; scoring?: string }>;

  return (
    <div
      className="min-h-screen flex flex-col"
      {...swipeHandlers}
    >
      {/* Progress bar */}
      <div className="px-4 pt-4">
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= currentStep ? "bg-indigo-500" : "bg-gray-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Timer */}
      {timerActive && timeLeft > 0 && (
        <div className="flex justify-center pt-4">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="var(--border)"
                strokeWidth="4"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="4"
                strokeDasharray="283"
                className="timer-ring"
                style={{
                  animationDuration: `${(content.timer_seconds as number) || 10}s`,
                }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
              {timeLeft}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 py-8">
        {/* Hook or question text */}
        <div className="card-enter mb-8">
          <p className="text-xl font-semibold text-white text-center leading-relaxed">
            {(content.text as string) || (content.prompt as string) || ""}
          </p>
        </div>

        {/* Options */}
        {options.length > 0 && (
          <div className="space-y-3">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleChoice(opt)}
                className="w-full p-4 text-left bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-indigo-500/50 active:scale-[0.98] transition-all tap-target"
              >
                <span className="text-white">{opt.text}</span>
              </button>
            ))}
          </div>
        )}

        {/* For hook/slide steps without options, show continue button */}
        {options.length === 0 &&
          currentStepData.action !== "user_choice" && (
            <button
              onClick={() => handleChoice(null)}
              className="mx-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors tap-target"
            >
              Continue
            </button>
          )}
      </div>

      {/* Step counter */}
      <div className="pb-6 text-center text-sm text-gray-500">
        {currentStep + 1} / {steps.length}
      </div>
    </div>
  );
}
