"use client";

import { useEffect, useRef, useState } from "react";

interface PinPadProps {
  value: string;
  onChange: (v: string) => void;
  onConfirm?: () => void;
  maxLength?: number;
  disabled?: boolean;
  error?: string | null;
}

export function PinPad({
  value,
  onChange,
  onConfirm,
  maxLength = 6,
  disabled = false,
  error = null,
}: PinPadProps) {
  const [shake, setShake] = useState(false);
  const prevError = useRef<string | null>(null);

  useEffect(() => {
    if (error && error !== prevError.current) {
      setShake(true);
      const t = window.setTimeout(() => setShake(false), 500);
      prevError.current = error;
      return () => window.clearTimeout(t);
    }
    if (!error) {
      prevError.current = null;
    }
  }, [error]);

  function handleDigit(digit: string) {
    if (disabled || value.length >= maxLength) return;
    const next = value + digit;
    onChange(next);
    if (next.length === maxLength && onConfirm) {
      // slight delay so the last dot fills in visually
      setTimeout(() => onConfirm(), 80);
    }
  }

  function handleBack() {
    if (disabled || value.length === 0) return;
    onChange(value.slice(0, -1));
  }

  function handleConfirm() {
    if (disabled || value.length !== maxLength) return;
    onConfirm?.();
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="flex flex-col items-center gap-8 select-none">
      {/* Dot indicators */}
      <div
        className={`flex gap-4 transition-transform ${shake ? "animate-[shake_0.4s_ease]" : ""}`}
      >
        {Array.from({ length: maxLength }).map((_, i) => (
          <span
            key={i}
            className={`h-4 w-4 rounded-full border-2 transition-all duration-150 ${
              i < value.length
                ? "border-emerald-400 bg-emerald-400 scale-110"
                : "border-slate-600 bg-transparent"
            }`}
          />
        ))}
      </div>

      {error ? (
        <p className="text-sm text-rose-300 -mt-4">{error}</p>
      ) : null}

      {/* Number grid */}
      <div className="grid grid-cols-3 gap-3">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => handleDigit(k)}
            disabled={disabled}
            className="h-16 w-16 rounded-full border border-slate-700 bg-slate-800/70 text-xl font-semibold text-white transition active:scale-95 active:bg-slate-700 disabled:opacity-40"
          >
            {k}
          </button>
        ))}

        {/* Backspace */}
        <button
          type="button"
          onClick={handleBack}
          disabled={disabled || value.length === 0}
          aria-label="Backspace"
          className="h-16 w-16 rounded-full border border-slate-700 bg-slate-800/70 text-xl text-slate-300 transition active:scale-95 active:bg-slate-700 disabled:opacity-40"
        >
          ⌫
        </button>

        {/* 0 */}
        <button
          type="button"
          onClick={() => handleDigit("0")}
          disabled={disabled}
          className="h-16 w-16 rounded-full border border-slate-700 bg-slate-800/70 text-xl font-semibold text-white transition active:scale-95 active:bg-slate-700 disabled:opacity-40"
        >
          0
        </button>

        {/* Confirm — only visible when full */}
        {value.length === maxLength ? (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={disabled}
            aria-label="Confirm"
            className="h-16 w-16 rounded-full bg-emerald-500 text-xl text-slate-950 font-bold transition active:scale-95 active:bg-emerald-400 disabled:opacity-40"
          >
            ✓
          </button>
        ) : (
          <span className="h-16 w-16" />
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
