export function DashboardSkeleton() {
  return (
    <div className="admin-loading">
      <div className="loading-grid">
        <span /><span /><span /><span />
      </div>
      <div className="loading-bar" />
      <div className="loading-bar" />
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="customer-mobile-stats">
      <div className="loading-bar" style={{ height: 118 }} />
      <div className="loading-bar" style={{ height: 118 }} />
      <div className="loading-bar" style={{ height: 118 }} />
      <div className="loading-bar" style={{ height: 118 }} />
    </div>
  );
}
