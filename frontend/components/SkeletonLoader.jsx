import React from 'react';

export function DashboardSkeleton() {
  return (
    <div className="skeleton-container" aria-busy="true" aria-label="Loading train data">
      <div className="skeleton-tabs" />
      <div className="skeleton-grid-3">
        <div className="skeleton-card skeleton-train-card" />
        <div className="skeleton-card skeleton-eta-card" />
        <div className="skeleton-card skeleton-delay-card" />
      </div>
      <div className="skeleton-grid-2">
        <div className="skeleton-panel skeleton-table-panel" />
        <div className="skeleton-panel skeleton-side-panel" />
      </div>
    </div>
  );
}
