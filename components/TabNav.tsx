// components/WindowToggle.tsx

"use client";

export type WindowValue = "week" | "quarter";

interface WindowToggleProps {
  value: WindowValue;
  onChange: (v: WindowValue) => void;
  color?: string;
}

export default function WindowToggle({
  value,
  onChange,
