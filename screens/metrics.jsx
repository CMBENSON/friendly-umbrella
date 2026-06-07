/* O11Y Command — Metrics, SLOs & CMDB topology */

// ---- derived SLO health (burn rate, time-to-exhaustion, tone) ----
function sloMetrics(slo) {
  const tone = slo.budget < 0 ? 'crit' : slo.budget < 25 ? 'warn' : 'ok';
  let burn;
  if (slo.budget < 0) burn = 2 + Math.min(2, Math.abs(slo.budget) / 12);
  else if (slo.budget < 25) burn = 1 + (25 - slo.budget) / 25;
  else burn = Math.max(0.2, 0.9 - (slo.budget - 25) / 150);
  burn = +burn.toFixed(1);
  let ttx;
  if (slo.budget <= 0) ttx = 'Exhausted';
  else {
    const days = (slo.budget / 100) * 30 / burn; // % of a 30-day window at this rate
    if (days >= 30) ttx = '>30d';
    else if (days >= 2) ttx = '~' + Math.round(days) + 'd';
    else ttx = '~' + Math.max(1, Math.round(days * 24)) + 'h';
  }
  const met = slo.invert ? slo.current <= slo.target : slo.current >= slo.target;
  return { tone, burn, ttx, met };
}

// time-range → how many trailing points of the 48-pt trend to show
const RANGE_PTS = { '1h': 8, '6h': 16, '24h': 32, '7d': 48 };
const sliceR = (arr, range) => arr.slice(-(RANGE_PTS[range] || arr.length));
const TONE_LABEL = { crit: 'Breaching', warn: 'At risk', ok: 'Healthy' };

// ===================== summary band =====================
function MetricsSummary({ slos, onPick }) {
  const m = slos.map(s => ({ slo: s, ...sloMetrics(s) }));
  const crit = m.filter(x => x.tone === 'crit').length;
  const warn = m.filter(x => x.tone === 'warn').length;
  const ok = m.filter(x => x.tone === 'ok').length;
  const total = m.length || 1;
  const compliance = Math.round((ok / total) * 100);
  const avgBurn = +(m.reduce((s, x) => s + x.burn, 0) / total).toFixed(1);
  const fastBurn = m.filter(x => x.burn >= 2).length;
  const worst = m.slice().sort((a, b) => a.slo.budget - b.slo.budget)[0];
  const compTone = compliance >= 80 ? 'ok' : compliance >= 60 ? 'warn' : 'crit';

  return (
    <div className="card mx-summary">
      <div className="mx-cell">
        <span className="k">SLO compliance</span>
        <div className="mx-ringrow">
          <Gauge pct={compliance} color={compTone} size={62} label={compliance + '%'} />
          <div>
            <div className="big" style={{ color: 'var(--' + compTone + ')' }}>{ok}/{total}</div>
            <div className="sub">objectives<br />in budget</div>
          </div>
        </div>
      </div>

      <div className="mx-cell">
        <span className="k">Status breakdown</span>
        <div className="mx-counts">
          <div><div className="n" style={{ color: 'var(--crit)' }}>{crit}</div><div className="l"><span className="dot crit" />Breaching</div></div>
          <div><div className="n" style={{ color: 'var(--warn)' }}>{warn}</div><div className="l"><span className="dot degraded" />At risk</div></div>
          <div><div className="n" style={{ color: 'var(--ok)' }}>{ok}</div><div className="l"><span className="dot healthy" />Healthy</div></div>
        </div>
        <div className="mx-statbar">
          <span style={{ width: (crit / total * 100) + '%', background: 'var(--crit)' }} />
          <span style={{ width: (warn / total * 100) + '%', background: 'var(--warn)' }} />
          <span style={{ width: (ok / total * 100) + '%', background: 'var(--ok)' }} />
        </div>
      </div>

      <div className="mx-cell">
        <span className="k">Avg burn rate</span>
        <div className="mx-ringrow">
          <div className="big" style={{ color: avgBurn >= 1 ? 'var(--warn)' : 'var(--ink)' }}>{avgBurn}×</div>
          <Icon name={avgBurn >= 1 ? 'trendUp' : 'trendDown'} size={20} style={{ color: avgBurn >= 1 ? 'var(--crit)' : 'var(--ok)' }} />
        </div>
        <div className="sub" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          {fastBurn > 0 ? <span style={{ color: 'var(--crit)', fontWeight: 600 }}>{fastBurn} burning fast</span> : 'all within tolerance'}
        </div>
      </div>

      <div className="mx-cell">
        <span className="k">Fastest-burning objective</span>
        <div className="mx-worst">
          <Gauge pct={Math.max(0, worst.slo.budget)} color={worst.tone} size={54} label={worst.slo.budget + '%'} />
          <div className="wmeta">
            <div className="wsvc">{worst.slo.service}</div>
            <div className="wobj">{worst.slo.name} · {worst.slo.sli}</div>
            <div className="row" style={{ gap: 6, marginTop: 6 }}>
              <span className={'mx-burn ' + worst.tone}><Icon name="zap" size={11} />{worst.burn}× burn</span>
              <span className="tnum" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{worst.ttx}</span>
            </div>
          </div>
          <button className="btn sm" onClick={() => onPick(worst.slo)}><Icon name="activity" size={14} />Inspect</button>
        </div>
      </div>
    </div>
  );
}

// ===================== SLO card =====================
function SloCard({ slo, range, onPick }) {
  const m = sloMetrics(slo);
  const data = sliceR(slo.trend, range);
  const budgetW = Math.max(3, Math.min(100, slo.budget));
  return (
    <div className={'mx-slo ' + m.tone} onClick={() => onPick(slo)}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 13 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em' }}>{slo.service}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{slo.name} · {slo.sli}</div>
        </div>
        <span className={'mx-burn ' + m.tone}><Icon name={m.burn >= 1 ? 'trendUp' : 'trendDown'} size={11} />{m.burn}×</span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>Error budget</span>
          <span className="tnum" style={{ fontSize: 12, fontWeight: 700, color: 'var(--' + m.tone + ')' }}>
            {slo.budget < 0 ? slo.budget + '% over' : slo.budget + '% left'}
          </span>
        </div>
        <div className="mx-bbar">
          <span className="fill" style={{ width: budgetW + '%', background: 'var(--' + m.tone + ')' }} />
          <span className="tick" style={{ left: '25%' }} title="At-risk threshold" />
        </div>
      </div>

      <AreaChart data={data} color={m.tone} h={56} threshold={slo.target} />

      <div className="mx-foot" style={{ marginTop: 12 }}>
        <div className="s"><div className="k">Target</div><div className="v">{slo.target}{slo.unit}</div></div>
        <div className="s" style={{ textAlign: 'center' }}><div className="k">Current</div><div className="v" style={{ color: 'var(--' + m.tone + ')' }}>{slo.current}{slo.unit}</div></div>
        <div className="s" style={{ textAlign: 'right' }}><div className="k">Exhausts</div><div className="v">{m.ttx}</div></div>
      </div>
    </div>
  );
}

// ===================== Grafana panel card =====================
function PanelCard({ p, range }) {
  const data = sliceR(p.data, range);
  const first = data[0], last = data[data.length - 1];
  const deltaPct = first ? ((last - first) / first) * 100 : 0;
  const up = deltaPct >= 0;
  // for error/latency/saturation, up is bad; for rate/apdex, neutral-ish
  const badUp = /error|latency|saturation|connection/i.test(p.title);
  const deltaTone = Math.abs(deltaPct) < 1 ? 'var(--ink-faint)' : (up === badUp ? 'var(--crit)' : 'var(--ok)');
  return (
    <div className="mx-panel">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.title}</div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{p.service}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="tnum" style={{ fontSize: 22, fontWeight: 700, color: 'var(--' + p.color + ')', lineHeight: 1 }}>{p.value}</div>
          <div className="mx-delta" style={{ color: deltaTone, justifyContent: 'flex-end', marginTop: 3 }}>
            <Icon name={up ? 'arrowUp' : 'arrowDown'} size={11} />{Math.abs(deltaPct).toFixed(1)}%
          </div>
        </div>
      </div>
      <AreaChart data={data} color={p.color} h={92} />
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>{p.unit || '—'}</span>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>last {range}</span>
      </div>
    </div>
  );
}

// ===================== topology (kept, lightly polished) =====================
const TOPO_POS = {
  'svc-checkout': { x: 50, y: 10 }, 'svc-payments': { x: 24, y: 33 }, 'svc-cart': { x: 50, y: 33 },
  'svc-identity': { x: 78, y: 33 }, 'svc-ledger': { x: 16, y: 58 }, 'svc-fraud': { x: 34, y: 58 },
  'svc-catalog': { x: 52, y: 58 }, 'svc-redis': { x: 68, y: 58 }, 'svc-postgres': { x: 26, y: 84 },
  'svc-kafka': { x: 45, y: 84 }, 'svc-elastic': { x: 60, y: 84 }, 'svc-notify': { x: 86, y: 60 },
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

// ===================== detail drawer =====================
function SloDetail({ slo, range, onClose }) {
  if (!slo) return null;
  const m = sloMetrics(slo);
  const data = sliceR(slo.trend, range);
  return (
    <div className="drawer-scrim" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'oklch(0.2 0.02 270 / 0.4)', backdropFilter: 'blur(3px)', animation: 'cpfade .2s ease' }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 440, maxWidth: '92vw', borderRadius: 0, boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'auto', animation: 'cpslide .26s cubic-bezier(.2,.85,.3,1)' }}>
        <div style={{ padding: 'var(--pad)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row" style={{ gap: 8, marginBottom: 4 }}>
              <Badge tone={m.tone} dot>{TONE_LABEL[m.tone]}</Badge>
              <span className={'mx-burn ' + m.tone}><Icon name="zap" size={11} />{m.burn}× burn</span>
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em' }}>{slo.service}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{slo.name} · {slo.sli}</div>
          </div>
          <button className="btn sm ghost" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: 'var(--pad)', display: 'grid', gap: 16 }}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[['Target', slo.target + slo.unit, 'ink'], ['Current', slo.current + slo.unit, m.tone], ['Budget left', Math.max(0, slo.budget) + '%', m.tone]].map(([k, v, t]) => (
              <div key={k} className="card" style={{ padding: 12, background: 'var(--surface-2)', boxShadow: 'none' }}>
                <div className="stat-l" style={{ fontSize: 10.5 }}>{k}</div>
                <div className="tnum" style={{ fontSize: 17, fontWeight: 700, marginTop: 3, color: t === 'ink' ? 'var(--ink)' : 'var(--' + t + ')' }}>{v}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="stat-l" style={{ marginBottom: 8 }}>{slo.sli} · last {range}<span style={{ float: 'right' }}>target {slo.target}{slo.unit}</span></div>
            <AreaChart data={data} color={m.tone} h={120} threshold={slo.target} />
          </div>
          <div className="card" style={{ padding: 14, background: 'var(--surface-2)', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon name={m.tone === 'crit' ? 'alertOctagon' : m.tone === 'warn' ? 'alertTriangle' : 'checkCircle'} size={20} style={{ color: 'var(--' + m.tone + ')', flex: 'none' }} />
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>
              {m.tone === 'crit'
                ? <>Budget is <strong>exhausted</strong>. At the current {m.burn}× burn rate this objective is actively breaching — page the owning team.</>
                : m.tone === 'warn'
                  ? <>Burning at <strong>{m.burn}×</strong>. Budget exhausts in <strong>{m.ttx}</strong> if the trend holds.</>
                  : <>Comfortably in budget. Roughly <strong>{m.ttx}</strong> of runway at the current rate.</>}
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn primary" style={{ flex: 1 }}><Icon name="externalLink" size={14} />Open in Grafana</button>
            <button className="btn" style={{ flex: 1 }}><Icon name="bell" size={14} />Burn-rate alert</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== main =====================
function Metrics({ go, params }) {
  const D = window.DB;
  const [view, setView] = useState('slos');
  const [range, setRange] = useState('6h');
  const [sort, setSort] = useState('severity');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detail, setDetail] = useState(null);
  const focus = params && params.service;

  const TONE_RANK = { crit: 0, warn: 1, ok: 2 };
  const sloRows = D.slos
    .map(s => ({ slo: s, ...sloMetrics(s) }))
    .filter(x => statusFilter === 'all' || x.tone === statusFilter)
    .sort((a, b) => {
      if (sort === 'severity') return (TONE_RANK[a.tone] - TONE_RANK[b.tone]) || (a.slo.budget - b.slo.budget);
      if (sort === 'burn') return b.burn - a.burn;
      if (sort === 'budget') return a.slo.budget - b.slo.budget;
      return a.slo.service.localeCompare(b.slo.service);
    });

  const counts = D.slos.reduce((acc, s) => { acc[sloMetrics(s).tone]++; return acc; }, { crit: 0, warn: 0, ok: 0 });

  return (
    <div className="screen grid" style={{ gap: 'var(--gap)' }}>
      {/* view switch + range */}
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
        <>
          <MetricsSummary slos={D.slos} onPick={setDetail} />

          {/* filter + sort toolbar */}
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div className="mx-controls">
              {[['all', 'All', null], ['crit', 'Breaching', 'crit'], ['warn', 'At risk', 'warn'], ['ok', 'Healthy', 'ok']].map(([id, l, tone]) => (
                <button key={id} className={'mx-chip' + (statusFilter === id ? ' on' : '')} onClick={() => setStatusFilter(id)}>
                  {tone && <span className="cdot" style={{ background: 'var(--' + tone + ')' }} />}
                  {l}<span className="cn">{id === 'all' ? D.slos.length : counts[id]}</span>
                </button>
              ))}
            </div>
            <div className="mx-select">
              <select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="severity">Sort: Severity</option>
                <option value="burn">Sort: Burn rate</option>
                <option value="budget">Sort: Budget remaining</option>
                <option value="name">Sort: Name</option>
              </select>
              <Icon name="chevronDown" size={14} />
            </div>
          </div>

          {sloRows.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
              <Icon name="checkCircle" size={24} style={{ color: 'var(--ok)' }} />
              <div style={{ marginTop: 8, fontSize: 14 }}>No objectives match this filter.</div>
            </div>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {sloRows.map(x => <SloCard key={x.slo.id} slo={x.slo} range={range} onPick={setDetail} />)}
            </div>
          )}
        </>
      )}

      {view === 'panels' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {D.panels.map(p => <PanelCard key={p.id} p={p} range={range} />)}
        </div>
      )}

      {view === 'topology' && <Topology go={go} />}

      <SloDetail slo={detail} range={range} onClose={() => setDetail(null)} />
    </div>
  );
}

window.Metrics = Metrics;
