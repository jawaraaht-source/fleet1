function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export default function Header({ planDate, view, onViewChange, stats }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="app-logo">🔧</div>
        <div>
          <h1 className="app-title">Maintenance Planner</h1>
          <div className="app-subtitle">Fleet Day Planning — {formatDate(planDate)}</div>
        </div>
      </div>

      <div className="header-right">
        <div className="view-toggle">
          <button className={view === 'tasks'   ? 'active' : ''} onClick={() => onViewChange('tasks')}>Tasks</button>
          <button className={view === 'dayplan' ? 'active' : ''} onClick={() => onViewChange('dayplan')}>Day Plan</button>
        </div>
      </div>
    </header>
  )
}
