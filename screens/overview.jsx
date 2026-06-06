/* O11Y Command — Overview dashboard (hero) */

function KpiCard({ icon, label, value, tone, foot }) {
  return (
    <div className="card" style={{ padding: 'var(--pad)', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="stat-l">{label}</span>
        <span style={{ color: 'var(--' + (tone || 'accent') + ')', display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 8, background: 'var(--' + (tone || 'accent') + '-soft)' }}>
          <Icon name={icon} size={15} />
        </span>
      </div>
      <div className="stat-v" style={tone === 'crit' ? { color: 'var(--crit)' } : null}>{value}</div>
      {foot && <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{foot}</div>}
    </div>
  );
}

function ServiceTile({ s, go }) {
  const tone = STATUS_TONE[s.status];
  return (
    <button className="svc-tile" onClick={() => go('metrics', { service: s.name })}>
      <div className="row" style={{ gap: 8 }}>
        <StatusDot status={s.status} pulse={s.status === 'critical'} />
        <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
      </div>
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{s.tier}</span>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{s.instances} inst</span>
      </div>
    </button>
  );
}

function AlertRow({ a, go, compact }) {
  const D = window.DB;
  return (
    <button className="lrow click" style={{ width: '100%', background: 'none', border: 'none', borderTop: '1px solid var(--border)', textAlign: 'left' }}
      onClick={() => a.inc ? go('incident', { id: a.inc }) : go('alerts')}>
      <StatusDot status={a.sev === 'critical' ? 'critical' : a.sev === 'warning' ? 'degraded' : 'info'} pulse={a.status === 'firing' && a.sev === 'critical'} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
        <div className="row" style={{ gap: 8, marginTop: 2 }}>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{a.source}</span>
          <span style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>·</span>
          <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{a.service}</span>
        </div>
      </div>
      {!compact && a.status === 'firing' && <Badge tone={a.sev === 'critical' ? 'crit' : 'warn'}>firing</Badge>}
      <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{D.fmtAgo(a.t)}</span>
    </button>
  );
}

function Overview({ go, copilot }) {
  const D = window.DB;
  const inc = D.incidents[0];
  const topAlerts = D.alerts.slice(0, 5);
  const todayChanges = D.changes.filter(c => c.day === 5);
  const featuredSlos = [D.slos[0], D.slos[1], D.slos[2]];

  return (
    <div className="screen grid" style={{ gap: 'var(--gap)' }}>
      {/* KPI strip */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        <KpiCard icon="flame" label="Active incidents" value={D.kpis.activeIncidents} tone="crit" foot="1 SEV1 · 1 monitoring" />
        <KpiCard icon="bell" label="Firing alerts" value={D.kpis.firingAlerts} tone="warn" foot="across 5 services" />
        <KpiCard icon="server" label="Services degraded" value={D.kpis.servicesDegraded} tone="warn" foot={D.services.length + ' total monitored'} />
        <KpiCard icon="activity" label="SLOs at risk" value={D.kpis.sloAtRisk} tone="crit" foot="budget < 25%" />
        <KpiCard icon="clock" label="MTTR today" value={D.kpis.mttrToday} tone="ok" foot="↓ 31% vs 30d avg" />
        <KpiCard icon="gitBranch" label="Deploys today" value={D.kpis.deploysToday} tone="accent" foot="1 in progress" />
      </div>

      {/* AI insights */}
      <AiInsightsCard go={go} copilot={copilot} />

      <div className="grid" style={{ gridTemplateColumns: '1fr 360px', alignItems: 'start' }}>
        {/* ---- left column ---- */}
        <div className="grid" style={{ gap: 'var(--gap)', minWidth: 0 }}>
          {/* active incident banner */}
          <div className="card" style={{ borderColor: 'color-mix(in oklab, var(--crit) 35%, var(--border))', overflow: 'hidden' }}>
            <div style={{ background: 'var(--crit-soft)', padding: '12px var(--pad)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <StatusDot status="critical" pulse />
              <span style={{ fontWeight: 700, color: 'var(--crit)', fontSize: 13 }}>Active incident</span>
              <Badge tone="crit">{inc.severity}</Badge>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{inc.id}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--ink-3)' }}>Opened {D.fmtAgo(inc.startedAt)}</span>
            </div>
            <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>{inc.title}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>{inc.impact}</div>
              </div>
              <div className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
                <div>
                  <div className="stat-l" style={{ marginBottom: 5 }}>Affected services</div>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    {inc.services.map(s => <Badge key={s} tone="neutral" dot>{s}</Badge>)}
                  </div>
                </div>
                <div>
                  <div className="stat-l" style={{ marginBottom: 5 }}>Responders</div>
                  <div className="row">
                    <div className="avatar-stack">{inc.responders.map(r => <Avatar key={r} name={r} size="sm" />)}</div>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)', marginLeft: 8 }}>IC: {inc.commander}</span>
                  </div>
                </div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn danger" onClick={() => go('incident', { id: inc.id })}><Icon name="flame" size={15} />Open war room</button>
                <button className="btn"><Icon name="message" size={15} />{inc.slack}</button>
                <a className="btn" href="#" onClick={e => e.preventDefault()}><Icon name="externalLink" size={14} />Jira {inc.jira}</a>
                <a className="btn" href="#" onClick={e => e.preventDefault()}><Icon name="externalLink" size={14} />SNOW {inc.snow}</a>
              </div>
            </div>
          </div>

          {/* service health (CMDB) */}
          <Card title="Service health" sub={D.kpis.servicesDegraded + ' need attention'} src="CMDB" srcIcon="network"
            action={<button className="btn sm ghost" onClick={() => go('metrics')}>Topology<Icon name="chevronRight" size={14} /></button>}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {D.services.map(s => <ServiceTile key={s.id} s={s} go={go} />)}
            </div>
          </Card>

          {/* SLO summary */}
          <Card title="SLO / error budget" sub="last 48h" src="Grafana" srcIcon="activity"
            action={<button className="btn sm ghost" onClick={() => go('metrics')}>All SLOs<Icon name="chevronRight" size={14} /></button>}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {featuredSlos.map(slo => {
                const tone = slo.budget < 0 ? 'crit' : slo.budget < 25 ? 'warn' : 'ok';
                return (
                  <div key={slo.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slo.service}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{slo.name}</div>
                      </div>
                      <Gauge pct={Math.max(0, slo.budget)} color={tone} size={48} label={slo.budget + '%'} />
                    </div>
                    <Sparkline data={slo.trend} color={tone} h={28} />
                    <div className="row" style={{ justifyContent: 'space-between', fontSize: 11 }}>
                      <span className="mono" style={{ color: 'var(--ink-faint)' }}>tgt {slo.target}{slo.unit}</span>
                      <span className="mono" style={{ color: 'var(--' + tone + ')', fontWeight: 600 }}>{slo.current}{slo.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ---- right column ---- */}
        <div className="grid" style={{ gap: 'var(--gap)', minWidth: 0 }}>
          {/* on-call now */}
          <Card title="On-call now" src="PagerDuty" srcIcon="phone"
            action={<button className="btn sm ghost" onClick={() => go('oncall')}>Schedule<Icon name="chevronRight" size={14} /></button>} pad={false}>
            <div>
              {D.onCallNow.map((o, i) => (
                <div key={o.team} className="lrow" style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                  <Avatar name={o.primary} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{o.primary}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{o.team} · 2nd {o.secondary}</div>
                  </div>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{o.until}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* live alerts */}
          <Card title="Live alerts" sub={D.kpis.firingAlerts + ' firing'} src="RSS" srcIcon="bell"
            action={<button className="btn sm ghost" onClick={() => go('alerts')}>Inbox<Icon name="chevronRight" size={14} /></button>} pad={false}>
            <div>{topAlerts.map(a => <AlertRow key={a.id} a={a} go={go} compact />)}</div>
          </Card>

          {/* today's changes */}
          <Card title="Today's changes" src="ServiceNow" srcIcon="calendar"
            action={<button className="btn sm ghost" onClick={() => go('changes')}>Calendar<Icon name="chevronRight" size={14} /></button>} pad={false}>
            <div>
              {todayChanges.map((c, i) => (
                <div key={c.id} className="lrow" style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                  <span style={{ width: 6, height: 28, borderRadius: 4, background: c.risk === 'High' ? 'var(--crit)' : c.risk === 'Medium' ? 'var(--warn)' : 'var(--ok)', flex: 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 2 }}>{c.id} · {c.when.replace('Today ', '')}</div>
                  </div>
                  <Badge tone={c.status === 'In Progress' ? 'accent' : 'neutral'}>{c.status}</Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* ticket queues */}
          <Card title="Ticket queues" src="ServiceNow · Jira" srcIcon="layers">
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {D.queues.map(q => (
                <div key={q.label} style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 'var(--r-sm)' }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="tnum" style={{ fontSize: 18, fontWeight: 700 }}>{q.open}</span>
                    <span style={{ fontSize: 10.5, color: q.trend[0] === '+' ? 'var(--crit)' : q.trend[0] === '\u2212' ? 'var(--ok)' : 'var(--ink-faint)', fontWeight: 600 }}>{q.trend}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{q.label}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

window.Overview = Overview;
window.AlertRow = AlertRow;
window.KpiCard = KpiCard;
