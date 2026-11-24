"use client";

import { useState } from "react";

// Wraps a value and briefly highlights it whenever it changes (e.g. a live
// score update), but not on first render.
export default function Flash({ value, children, className = "" }) {
  const [prev, setPrev] = useState(value);
  const [n, setN] = useState(0);
  if (value !== prev) {
    setPrev(value);
    setN(n + 1);
  }
  return (
    <span key={n} className={`${n ? "flash" : ""} rounded-md ${className}`}>
      {children ?? value}
    </span>
  );
}
