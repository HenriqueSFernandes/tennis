// Empty state component

import type React from "react";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 mx-auto mb-4 flex items-center justify-center text-slate-600">
        {icon}
      </div>
      <h3 className="text-white font-medium mb-1">{title}</h3>
      <p className="text-slate-500 text-sm mb-4">{description}</p>
      {action}
    </div>
  );
}
