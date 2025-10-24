import React from "react";

interface CanvasSpinnerProps {
  visible?: boolean;
  message?: string;
}

export default function CanvasSpinner({ visible = false, message = "Initializing canvas..." }: CanvasSpinnerProps) {
  if (!visible) return null;
  return (
    <div
      aria-hidden={!visible}
      className="w-full flex flex-col items-center gap-3 p-4 bg-muted/5 rounded"
      data-testid="canvas-spinner-inline"
    >
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin border-gray-300 dark:border-slate-600" />
      <div className="text-sm text-gray-700 dark:text-gray-200">{message}</div>
    </div>
  );
}