import React from 'react';

/**
 * Dashboard Container Component
 * Acts as a wrapper for layout items.
 */
export default function Dashboard({ children }) {
  return (
    <div className="w-full">
      {children}
    </div>
  );
}
