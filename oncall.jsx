/* O11Y Command — Metrics, SLOs & CMDB topology */

// topology layout (percentage coords within the canvas)
const TOPO_POS = {
  'svc-checkout': { x: 50, y: 10 },
  'svc-payments': { x: 24, y: 33 },
  'svc-cart': { x: 50, y: 33 },
  'svc-identity': { x: 78, y: 33 },
  'svc-ledger': { x: 16, y: 58 },
  'svc-fraud': { x: 34, y: 58 },
  'svc-catalog': { x: 52, y: 58 },
  'svc-redis': { x: 68, y: 58 },
  'svc-postgres': { x: 26, y: 84 },
  'svc-kafka': { x: 45, y: 84 },
  'svc-elastic': { x: 60, y: 84 },
  'svc-notify': { x: 86, y: 60 },
};

function Topology({ go }) {
  const D = window.DB;
  const [sel, setSel] = useState('svc-checkout');
  const byId = Object.fromEntries(D.services.map(s => [s.id, s]));
  const selSvc = byId[sel];
  const related = new Set([sel, ...(selSvc.deps || [])]);
  D.services.forEach(s => { if ((s.deps || []).includes(sel)) related.add(s.id); });

  const edges = [];
  D.services.forEach(s => (s.deps || []).forEach(d => { if (TOPO_POS[s.id] && TOPO_POS[d]) edges.push([s.id, d]); }));

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 'var(--gap)', alignItems: 'start' }}>
      <div className="card" style={{ position: 'relative', height: 460, overflow: 'hidden', minWidth: 0 }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {edges.map(([a, b], i) => {
            const pa = TOPO_POS[a], pb = TOPO_POS[b];
            const hot = related.has(a) && related.has(b);
            return <line key={i} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
              stroke={hot ? 'var(--accent)' : 'var(--border-strong)'} strokeWidth={hot ? 1.6 : 1}
              strokeOpacity={hot ? 0.9 : 0.5} vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
        {D.services.map(s => {
          const p = TOPO_POS[s.id];
          const dim = !related.has(s.id);
          return (
            <button key={s.id} className={'topo-node s-' + s.status + (sel === s.id ? ' sel' : '')}
              style={{ left: p.x + '%', top: p.y + '%', opacity: dim ? 0.4 : 1, fontFamily: 'var(--font)' }}
              onClick={() => setSel(s.id)}>
              <div className="row" style={{ gap: 6 }}>
                <StatusDot status={s.status} pulse={s.status === 'critical'} />
                <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{s.name}</span>
              </div>
            </button>
          );
        })}
        <div style={{ position: 'absolute', left: 14, bottom: 12, display: 'flex', gap: 12, fontSize: 11, color: 'var(--ink-3)', background: 'color-mix(in oklab, var(--surface) 80%, transparent)', padding: '6px 10px', borderRadius: 8, backdropFilter: 'blur(4px)' }}>
          <span className="row" style={{ gap: 5 }}><span className="dot healthy" />Healthy</span>
          <span className="row" style={{ gap: 5 }}><span className="dot degraded" />Degraded</span>
          <span className="row" style={{ gap: 5 }}><span className="dot crit" />Critical</span>
        </div>
      </div>

      <Card title={selSvc.name} src="CMDB" srcIcon="network">
        <div className="grid" style={{ gap: 14 }}>
          <div className="row" style={{ gap: 8 }}>
            <Badge tone={STATUS_TONE[selSvc.status] === 'ok' ? 'ok' : STATUS_TONE[selSvc.status] === 'warn' ? 'warn' : 'crit'} dot>{STATUS_LABEL[selSvc.status]}</Badge>
            <Badge tone="neutral">{selSvc.tier}</Badge>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['Owner', selSvc.owner], ['Region', selSvc.region], ['Instances', selSvc.instances], ['Dependencies', (selSvc.deps || []).length]].map(([k, v]) => (
              <div key={k}><div className="stat-l" style={{ marginBottom: 2 }}>{k}</div><div style={{ fontSize: 13.5, fontWeight: 600 }}>{v}</div></div>
            ))}
          </div>
          {(selSvc.deps || []).length > 0 && (
            <div>
              <div className="stat-l" style={{ marginBottom: 6 }}>Depends on</div>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {selSvc.deps.map(d => <button key={d} className="badge neutral" style={{ cursor: 'pointer', border: 'none' }} onClick={() => setSel(d)}><span className={'dot ' + byId[d].status} />{byId[d].name}</button>)}
              </div>
            </div>
          )}
          <button className="btn primary" onClick={() => go('metrics', { service: selSvc.name })}><Icon name="activity" size={15} />View metrics</button>
        </div>
      </Card>
    </div>
  );
}

function SloCard({ slo }) {
  const D = window.DB;
  const tone = slo.budget < 0 ? 'crit' : slo.budget < 25 ? 'warn' : 'ok';
  return (
    <div className="card" style={{ padding: 'var(--pad)' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{slo.service}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{slo.name} · {slo.sli}</div>
        </div>
        <Gauge pct={Math.max(0, slo.budget)} color={tone} size={56} label={slo.budget + '%'} />
      </div>
      <AreaChart data={slo.trend} color={tone} h={64} threshold={slo.invert ? null : undefined} />
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
        <div><div className="stat-l">Target</div><div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{slo.target}{slo.unit}</div></div>
        <div style={{ textAlign: 'center' }}><div className="stat-l">Current</div><div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--' + tone + ')' }}>{slo.current}{slo.unit}</div></div>
        <div style={{ textAlign: 'right' }}><div className="stat-l">Budget</div><div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--' + tone + ')' }}>{slo.budget}%</div></div>
      </div>
    </div>
  );
}

function PanelCard({ p }) {
  return (
    <div className="card" style={{ padding: 'var(--pad)' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.title}</div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{p.service}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="tnum" style={{ fontSize: 20, fontWeight: 700, color: 'var(--' + p.color + ')' }}>{p.value}</div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{p.unit}</div>
        </div>
      </div>
      <AreaChart data={p.data} color={p.color} h={96} />
    </div>
  );
}

function Metrics({ go, params }) {
  const D = window.DB;
  const [view, setView] = useState('slos');
  const [range, setRange] = useState('6h');
  const focus = params && params.service;

  return (
    <div className="screen grid" style={{ gap: 'var(--gap)' }}>
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div className="seg">
          {[['slos', 'SLOs'], ['panels', 'Grafana panels'], ['topology', 'Topology']].map(([id, l]) => (
            <button key={id} className={view === id ? 'on' : ''} onClick={() => setView(id)}>{l}</button>
          ))}
        </div>
        <div className="row" style={{ gap: 8 }}>
          {focus && <Badge tone="accent" dot>Focus: {focus}</Badge>}
          <div className="seg">
            {['1h', '6h', '24h', '7d'].map(r => <button key={r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>{r}</button>)}
          </div>
          <button className="btn sm"><Icon name="refresh" size={14} />Live</button>
        </div>
      </div>

      {view === 'slos' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {D.slos.map(s => <SloCard key={s.id} slo={s} />)}
        </div>
      )}
      {view === 'panels' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {D.panels.map(p => <PanelCard key={p.id} p={p} />)}
        </div>
      )}
      {view === 'topology' && <Topology go={go} />}
    </div>
  );
}

window.Metrics = Metrics;
