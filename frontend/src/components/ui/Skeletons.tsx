// Shared skeleton components

export function AccountCardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-4 border border-slate-700/30">
      <div className="w-12 h-12 rounded-full bg-slate-700 shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-700 rounded-lg shimmer w-2/3" />
        <div className="h-3 bg-slate-700 rounded-lg shimmer w-1/2" />
      </div>
      <div className="w-8 h-8 bg-slate-700 rounded-lg shimmer" />
    </div>
  );
}

export function BookingCardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-4 border border-slate-700/30">
      <div className="w-14 h-14 rounded-xl bg-slate-700 shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-700 rounded-lg shimmer w-1/3" />
        <div className="h-3 bg-slate-700 rounded-lg shimmer w-1/4" />
        <div className="h-3 bg-slate-700 rounded-lg shimmer w-1/2" />
      </div>
    </div>
  );
}

export function CourtGridSkeleton() {
  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700/30">
      <div className="px-4 py-4 border-b border-slate-700/50">
        <div className="h-5 bg-slate-700 rounded-lg shimmer w-1/4" />
      </div>
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-12 h-8 bg-slate-700 rounded-lg shimmer" />
            {[1, 2, 3, 4, 5, 6, 7].map((j) => (
              <div
                key={j}
                className="flex-1 h-8 bg-slate-700 rounded-lg shimmer"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
