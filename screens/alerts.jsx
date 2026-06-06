/* O11Y Command — Alerts inbox (aggregated RSS feed) */

function Alerts({ go }) {
  const D = window.DB;
  const [list, setList] = useState(() => D.alerts.map(a => ({ ...a })));
  const [sev, setSev] = useState('all');
  const [status, setStatus] = useState('all');
  const [source, setSource] = useState('all');
  const [selId, setSelId] = useState(D.alerts[0].id);

  const setStatusOf = (id, s) => setList(l => l.map(a => a.id === id ? { ...a, status: s } : a));

  const filtered = list.filter(a =>
    (sev === 'all' || a.sev === sev) &&
    (status === 'all' || a.status === status) &&
    (source === 'all' || a.source === source)
  );
  const sel = list.find(a => a.id === selId) || filtered[0];

  const counts = {
    firing: list.filter(a => a.status === 'firing').length,
    acked: list.filter(a => a.status === 'acked').length,
    resolved: list.filter(a => a.status === 'resolved').length,
  };
  const sevTone = s => s === 'critical' ? 'critical' : s === 'warning' ? 'degraded' : 'info';

  return (
    <div className="screen grid" style={{ gap: 'var(--gap)' }}>
      {/* stat strip */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <KpiCard icon="bell" label="Firing" value={counts.firing} tone="crit" foot="needs triage" />
        <KpiCard icon="eye" label="Acknowledged" value={counts.acked} tone="warn" foot="being handled" />
        <KpiCard icon="checkCircle" label="Resolved (24h)" value={counts.resolved} tone="ok" foot="auto + manual" />
        <KpiCard icon="layers" label="Sources" value={D.alertSources.length} tone="accent" foot="Grafana, Prometheus, SNOW…" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 380px', alignItems: 'start' }}>
        {/* list */}
        <Card pad={false} title="Alert feed" sub={filtered.length + ' shown'} src="RSS · webhook" srcIcon="bell"
          action={
            <div className="row" style={{ gap: 8 }}>
              <div className="seg">
                {['all', 'firing', 'acked', 'resolved'].map(s => (
                  <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{s === 'all' ? 'All' : s[0].toUpperCase() + s.slice(1)}</button>
                ))}
              </div>
            </div>
          }>
          <div style={{ padding: '12px var(--pad)', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <div className="seg">
              {['all', 'critical', 'warning', 'info'].map(s => (
                <button key={s} className={sev === s ? 'on' : ''} onClick={() => setSev(s)}>
                  {s !== 'all' && <span className={'dot ' + sevTone(s)} style={{ display: 'inline-block', marginRight: 5, verticalAlign: 'middle' }} />}
                  {s === 'all' ? 'All severities' : s[0].toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <select value={source} onChange={e => setSource(e.target.value)} className="btn sm" style={{ appearance: 'none', paddingRight: 24 }}>
              <option value="all">All sources</option>
              {D.alertSources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
            {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No alerts match these filters.</div>}
            {filtered.map(a => (
              <button key={a.id} onClick={() => setSelId(a.id)}
                className="lrow click"
                style={{ width: '100%', textAlign: 'left', background: a.id === (sel && sel.id) ? 'var(--surface-2)' : 'none', border: 'none', borderTop: '1px solid var(--border)', borderLeft: '3px solid ' + (a.id === (sel && sel.id) ? 'var(--accent)' : 'transparent'), opacity: a.status === 'resolved' ? 0.6 : 1 }}>
                <StatusDot status={sevTone(a.sev)} pulse={a.status === 'firing' && a.sev === 'critical'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                  <div className="row" style={{ gap: 7, marginTop: 3 }}>
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{a.source}</span>
                    <span style={{ color: 'var(--ink-faint)' }}>·</span>
                    <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{a.service}</span>
                    {a.inc && <Badge tone="crit">{a.inc}</Badge>}
                  </div>
                </div>
                <Badge tone={a.status === 'firing' ? 'crit' : a.status === 'acked' ? 'warn' : 'ok'}>{a.status}</Badge>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)', whiteSpace: 'nowrap', width: 48, textAlign: 'right' }}>{D.fmtAgo(a.t)}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* detail panel */}
        {sel && (
          <Card pad={false} title="Alert detail" src={sel.source} srcIcon="bell">
            <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                  <Badge tone={sevTone(sel.sev) === 'critical' ? 'crit' : sevTone(sel.sev) === 'degraded' ? 'warn' : 'info'} dot>{sel.sev}</Badge>
                  <Badge tone={sel.status === 'firing' ? 'crit' : sel.status === 'acked' ? 'warn' : 'ok'}>{sel.status}</Badge>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>{sel.title}</div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[['Service', sel.service], ['Source', sel.source], ['First seen', D.fmtAgo(sel.t)], ['Fingerprint', sel.id.toUpperCase()]].map(([k, v]) => (
                  <div key={k}>
                    <div className="stat-l" style={{ marginBottom: 2 }}>{k}</div>
                    <div className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="stat-l" style={{ marginBottom: 6 }}>Signal (last 60m)</div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 10 }}>
                  <AreaChart data={D.series(40, 60, 30, sel.id.length + 3)} color={sevTone(sel.sev) === 'critical' ? 'crit' : 'warn'} h={90} />
                </div>
              </div>

              {sel.inc && (
                <button className="lrow click" onClick={() => go('incident', { id: sel.inc })}
                  style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 12, background: 'var(--crit-soft)', textAlign: 'left' }}>
                  <Icon name="flame" size={16} style={{ color: 'var(--crit)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>Correlated to {sel.inc}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Open the war room</div>
                  </div>
                  <Icon name="chevronRight" size={16} style={{ color: 'var(--ink-3)' }} />
                </button>
              )}

              <div className="row" style={{ gap: 8 }}>
                {sel.status === 'firing' && <button className="btn primary" style={{ flex: 1 }} onClick={() => setStatusOf(sel.id, 'acked')}><Icon name="eye" size={15} />Acknowledge</button>}
                {sel.status !== 'resolved' && <button className="btn" style={{ flex: 1 }} onClick={() => setStatusOf(sel.id, 'resolved')}><Icon name="check" size={15} />Resolve</button>}
                {sel.status === 'resolved' && <button className="btn ghost" style={{ flex: 1 }} onClick={() => setStatusOf(sel.id, 'firing')}><Icon name="refresh" size={15} />Reopen</button>}
                <button className="icon-btn" title="Create incident"><Icon name="flame" size={16} /></button>
                <button className="icon-btn" title="Snooze"><Icon name="clock" size={16} /></button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

window.Alerts = Alerts;
