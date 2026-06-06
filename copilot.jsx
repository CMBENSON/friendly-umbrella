/* O11Y Command — app shell & routing */
const { useState, useEffect, useMemo, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#6366f1",
  "dark": false,
  "density": "comfortable",
  "toolboxStyle": "orbit",
  "toolLabels": false,
  "toolboxScrim": true
}/*EDITMODE-END*/;

const NAV = [
  { group: 'Monitor', items: [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'alerts', label: 'Alerts', icon: 'bell' },
    { id: 'incident', label: 'Incidents', icon: 'flame' },
  ]},
  { group: 'Operate', items: [
    { id: 'metrics', label: 'Metrics & SLOs', icon: 'activity' },
    { id: 'jira', label: 'Project board', icon: 'board' },
    { id: 'oncall', label: 'On-call', icon: 'calendarClock' },
    { id: 'changes', label: 'Change calendar', icon: 'calendar' },
  ]},
];

const TITLES = {
  overview: { t: 'Operations overview', s: 'Production · us-east-1 · live' },
  alerts: { t: 'Alerts inbox', s: 'Aggregated alert feed across all sources' },
  incident: { t: 'Incident war room', s: 'Active incident coordination' },
  metrics: { t: 'Metrics & SLOs', s: 'Grafana panels · service topology' },
  jira: { t: 'Project board', s: 'Jira · SRE sprint & project work' },
  oncall: { t: 'On-call schedule', s: 'Rotations · escalation policy' },
  changes: { t: 'Change calendar', s: 'ServiceNow changes · Jira releases' },
};

function App() {
  const D = window.DB;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState({ screen: 'overview', params: {} });
  const go = (screen, params = {}) => { setRoute({ screen, params }); document.querySelector('.content')?.scrollTo(0, 0); };

  useEffect(() => {
    const r = document.documentElement;
    r.dataset.theme = t.dark ? 'dark' : 'light';
    r.dataset.density = t.density === 'compact' ? 'compact' : 'comfortable';
    r.style.setProperty('--accent', t.accent);
  }, [t.dark, t.density, t.accent]);

  const firing = D.alerts.filter(a => a.status === 'firing').length;
  const activeInc = D.incidents.length;
  const [cpOpen, setCpOpen] = useState(false);
  const [cpReq, setCpReq] = useState({ q: null, n: 0 });
  const openCopilot = (q) => { setCpOpen(true); if (q) setCpReq(r => ({ q, n: r.n + 1 })); };

  const Screen = window[route.screen.charAt(0).toUpperCase() + route.screen.slice(1)];
  const title = TITLES[route.screen] || { t: '', s: '' };

  return (
    <div className="app">
      {/* sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Icon name="shield" size={19} /></div>
          <div>
            <div className="brand-name">O11Y Command</div>
            <div className="brand-sub">SRE control center</div>
          </div>
        </div>
        <nav className="nav">
          {NAV.map(g => (
            <React.Fragment key={g.group}>
              <div className="nav-label">{g.group}</div>
              {g.items.map(it => {
                const active = route.screen === it.id;
                let count = null, crit = false;
                if (it.id === 'alerts') { count = firing; crit = true; }
                if (it.id === 'incident') { count = activeInc; crit = true; }
                return (
                  <button key={it.id} className={'nav-item' + (active ? ' active' : '')} onClick={() => go(it.id)}>
                    <Icon name={it.icon} size={17} />
                    <span>{it.label}</span>
                    {count != null && <span className={'count' + (crit ? ' crit' : '')}>{count}</span>}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="oncall-chip">
            <Avatar name="Priya Nair" size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="lbl">You're on-call</div>
              <div className="nm">Priya Nair · Payments</div>
            </div>
            <span className="dot ok" />
          </div>
        </div>
      </aside>

      {/* main */}
      <div className="main">
        <header className="topbar">
          <div>
            <div className="page-title">{title.t}</div>
            <div className="page-sub">{title.s}</div>
          </div>
          <div className="search" style={{ marginLeft: 24 }}>
            <Icon name="search" size={15} />
            <input placeholder="Search services, incidents, tickets…" />
            <span className="kbd">/</span>
          </div>
          <div className="topbar-actions">
            <button className="ai-btn" onClick={() => openCopilot()}><Icon name="sparkles" size={16} />Ask Copilot</button>
            <button className="env-pill"><span className="dot ok" />Production<Icon name="chevronDown" size={14} /></button>
            <button className="icon-btn" title="Refresh"><Icon name="refresh" size={16} /></button>
            <button className="icon-btn" title="Notifications"><Icon name="bell" size={16} /><span className="dot" /></button>
            <Avatar name="Priya Nair" />
          </div>
        </header>
        <main className="content">
          {Screen ? <Screen go={go} params={route.params} copilot={openCopilot} /> : <div style={{ padding: 40, color: 'var(--ink-3)' }}>Screen not found.</div>}
        </main>
      </div>

      <CopilotDrawer open={cpOpen} onClose={() => setCpOpen(false)} request={cpReq} go={go} />

      <Toolbox style={t.toolboxStyle} wantLabels={t.toolLabels} scrim={t.toolboxScrim} />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme" />
        <TweakToggle label="Dark mode" value={t.dark} onChange={v => setTweak('dark', v)} />
        <TweakColor label="Accent" value={t.accent}
          options={['#6366f1', '#2563eb', '#0d9488', '#7c3aed', '#e6562a']}
          onChange={v => setTweak('accent', v)} />
        <TweakSection label="Layout" />
        <TweakRadio label="Density" value={t.density} options={['comfortable', 'compact']}
          onChange={v => setTweak('density', v)} />
        <TweakSection label="Toolbox" />
        <TweakSelect label="Wheel style" value={t.toolboxStyle}
          options={[{ value: 'orbit', label: 'Orbit — full ring' }, { value: 'fan', label: 'Fan — corner dial' }, { value: 'dual', label: 'Dual-ring — grouped' }]}
          onChange={v => setTweak('toolboxStyle', v)} />
        <TweakToggle label="Always show labels" value={t.toolLabels} onChange={v => setTweak('toolLabels', v)} />
        <TweakToggle label="Dim background" value={t.toolboxScrim} onChange={v => setTweak('toolboxScrim', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
