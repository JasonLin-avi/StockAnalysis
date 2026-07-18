import React from 'react';

export default function SkeletonLoader({ height = 'h-32' }) {
  // Why: Provides a smooth, non-blocking visual placeholder while client-side fetches are pending.
  return (
    <div className={`w-full bg-slate-800/50 rounded-2xl animate-pulse ${height}`}></div>
  );
}
