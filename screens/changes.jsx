/* O11Y Command — Change calendar (ServiceNow CHG + Jira releases) */

const RISK_TONE = { High: 'crit', Medium: 'warn', Low: 'ok' };
const STATUS_TONE_CHG = { 'In Progress': 'accent', 'Scheduled': 'info', 'Pending Approval': 'warn', 'Completed': 'ok' };

function Changes({ go }) {
  const D = window.DB;
  const todayDay = 5;
  const [srcFilter, setSrcFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sel, setSel] = useState(D.changes[0].id);

  const visible = D.changes.filter(c =>
    (srcFilter === 'all' || c.src === srcFilter) &&
    (riskFilter === 'all' || c.risk === riskFilter)
  );
  const selChg = D.changes.find(c => c.id === sel);
  const byDay = d => visible.filter(c => c.day === d);

  const stats = {
    inProgress: D.changes.filter(c => c.status === 'In Progress').length,
    scheduled: D.changes.filter(c => c.status === 'Scheduled').length,
    approval: D.changes.filter(c => c.status === 'Pending Approval').length,
    highRisk: D.changes.filter(c => c.risk === 'High').length,
  };

  return (
    <div className="screen grid" style={{ gap: 'var(--gap)' }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <KpiCard icon="play" label="In progress" value={stats.inProgress} tone="accent" foot="active change windows" />
        <KpiCard icon="calendar" label="Scheduled" value={stats.scheduled} tone="info" foot="next 7 days" />
        <KpiCard icon="clock" label="Awaiting CAB" value={stats.approval} tone="warn" foot="pending approval" />
        <KpiCard icon="alertTriangle" label="High risk" value={stats.highRisk} tone="crit" foot="needs review" />
      </div>

      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div className="row" style={{ gap: 8 }}>
          <div className="seg">
            {['all', 'ServiceNow', 'Jira'].map(s => <button key={s} className={srcFilter === s ? 'on' : ''} onClick={() => setSrcFilter(s)}>{s === 'all' ? 'All sources' : s}</button>)}
          </div>
          <div className="seg">
            {['all', 'High', 'Medium', 'Low'].map(r => <button key={r} className={riskFilter === r ? 'on' : ''} onClick={() => setRiskFilter(r)}>{r === 'all' ? 'All risk' : r}</button>)}
          </div>
        </div>
        <div className="row" style={{ gap: 14, fontSize: 11, color: 'var(--ink-3)' }}>
          <span className="row" style={{ gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--crit)' }} />High</span>
          <span className="row" style={{ gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--warn)' }} />Medium</span>
          <span className="row" style={{ gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--ok)' }} />Low</span>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', alignItems: 'start' }}>
        {/* calendar */}
        <div className="card" style={{ padding: 'var(--pad)', minWidth: 0 }}>
          <div className="cal-grid">
            {D.rotationDays.map((d, i) => (
              <div key={d} className="cal-cell" style={{ minHeight: 28, padding: '7px 8px' }}>
                <div className="num" style={{ color: i + 1 === todayDay ? 'var(--accent-ink)' : 'var(--ink-3)' }}>{d}</div>
              </div>
            ))}
            {D.rotationDays.map((d, i) => {
              const day = i + 1;
              const items = byDay(day);
              return (
                <div key={'c' + d} className={'cal-cell' + (day === todayDay ? ' today' : '')}>
                  {items.map(c => (
                    <button key={c.id} className="chg-pill" onClick={() => setSel(c.id)}
                      style={{ borderLeftColor: 'var(--' + RISK_TONE[c.risk] + ')', textAlign: 'left', fontFamily: 'var(--font)', outline: sel === c.id ? '2px solid var(--accent)' : 'none' }}>
                      <div className="row" style={{ gap: 4, marginBottom: 2 }}>
                        <Icon name={c.src === 'Jira' ? 'gitBranch' : 'server'} size={10} style={{ color: 'var(--ink-faint)' }} />
                        <span className="mono" style={{ fontSize: 9, color: 'var(--ink-faint)' }}>{c.id}</span>
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--ink)', lineHeight: 1.25 }}>{c.title}</div>
                      <div className="mono" style={{ fontSize: 9, color: 'var(--ink-faint)', marginTop: 2 }}>{c.when.replace(/^(Today|Mon|Tue|Wed|Thu|Fri|Sat|Sun) /, '')}</div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* detail */}
        {selChg && (
          <Card title="Change detail" src={selChg.src} srcIcon={selChg.src === 'Jira' ? 'gitBranch' : 'server'}>
            <div className="grid" style={{ gap: 14 }}>
              <div>
                <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                  <Badge tone={RISK_TONE[selChg.risk]}>{selChg.risk} risk</Badge>
                  <Badge tone={STATUS_TONE_CHG[selChg.status]}>{selChg.status}</Badge>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>{selChg.title}</div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{selChg.id}</div>
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[['Type', selChg.type], ['Window', selChg.when], ['Owner', selChg.owner], ['Source', selChg.src]].map(([k, v]) => (
                  <div key={k}><div className="stat-l" style={{ marginBottom: 2 }}>{k}</div><div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div></div>
                ))}
              </div>
              <div className="row" style={{ gap: 10, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                <Avatar name={selChg.owner} size="sm" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{selChg.owner}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Change owner · {D.people[selChg.owner] ? D.people[selChg.owner].team : ''}</div>
                </div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn primary" style={{ flex: 1 }}><Icon name="externalLink" size={14} />Open in {selChg.src}</button>
                {selChg.status === 'Pending Approval' && <button className="btn"><Icon name="check" size={15} />Approve</button>}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

window.Changes = Changes;
