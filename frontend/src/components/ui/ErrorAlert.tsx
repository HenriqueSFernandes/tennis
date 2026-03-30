// Error alert component

import { AlertIcon } from "./Icons";

interface ErrorAlertProps {
  message: string;
  className?: string;
}

export function ErrorAlert({ message, className = "" }: ErrorAlertProps) {
  return (
    <div
      className={`bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-4 text-sm flex items-start gap-3 animate-shake ${className}`}
    >
      <AlertIcon className="w-5 h-5 shrink-0 mt-0.5" />
      {message}
    </div>
  );
}
