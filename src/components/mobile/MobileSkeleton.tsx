import React from 'react';

export function MobileSkeletonCard() {
  return (
    <div className="space-y-3 animate-pulse rounded-lg border p-4">
      <div className="h-4 w-3/4 rounded bg-slate-200"></div>
      <div className="h-3 w-1/2 rounded bg-slate-200"></div>
      <div className="flex justify-between">
        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
        <div className="h-6 w-1/4 rounded bg-slate-200"></div>
      </div>
    </div>
  );
}

export function MobileSkeletonGrid({ count = 2 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg p-4 bg-slate-100">
          <div className="h-3 w-2/3 rounded bg-slate-200 mb-2"></div>
          <div className="h-6 w-1/2 rounded bg-slate-200"></div>
        </div>
      ))}
    </div>
  );
}

export function MobileSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <MobileSkeletonCard key={i} />
      ))}
    </div>
  );
}
