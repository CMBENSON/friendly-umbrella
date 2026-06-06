/* O11Y Command — Incident war room */

function durationFrom(start) {
  const ms = window.DB.now - start;
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h > 0 ? h + 'h ' + (m % 60) + 'm' : m + 'm';
}

function TimelineItem({ ev }) {
  const D = window.DB;
  const map = {
    alert: { icon: 'bell', tone: 'crit' },
    system: { icon: 'activity', tone: 'info' },
    note: { icon: 'message', tone: 'accent' },
    action: { icon: 'zap', tone: 'warn' },
  };
  const m = map[ev.kind] || map.note;
  const isPerson = D.people[ev.who];
  return (
    <div className="tl-item">
      <div className="tl-dot" style={{ background: 'var(--' + m.tone + '-soft)', color: 'var(--' + m.tone + ')' }}>
        <Icon name={m.icon} size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <div className="row" style={{ gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>{ev.who}</span>
          {!isPerson && <Badge tone="neutral">{ev.kind}</Badge>}
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginLeft: 'auto' }}>{D.fmtTime(ev.t)} · {D.fmtAgo(ev.t)}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 3 }}>{ev.text}</div>
      </div>
    </div>
  );
}

function Incident({ go, params, copilot }) {
  const D = window.DB;
  const incId = (params && params.id) || D.incidents[0].id;
  const base = D.incidents.find(i => i.id === incId) || D.incidents[0];
  const [tab, setTab] = useState('timeline');
  const [status, setStatus] = useState(base.status);
  const [events, setEvents] = useState(base.timeline);
  const [note, setNote] = useState('');
  const [showRca, setShowRca] = useState(false);

  useEffect(() => { setStatus(base.status); setEvents(base.timeline); setTab('timeline'); }, [incId]);

  const relAlerts = D.alerts.filter(a => a.inc === base.id);
  const sevSvcs = base.services.map(name => D.services.find(s => s.name === name)).filter(Boolean);
  const STAGES = ['Investigating', 'Identified', 'Monitoring', 'Resolved'];

  const addNote = () => {
    if (!note.trim()) return;
    setEvents(e => [...e, { t: D.now, who: 'Priya Nair', kind: 'note', text: note.trim() }]);
    setNote('');
  };

  return (
    <div className="screen grid" style={{ gap: 'var(--gap)' }}>
      {/* incident switcher */}
      <div className="row" style={{ gap: 8 }}>
        {D.incidents.map(i => (
          <button key={i.id} className="btn sm" onClick={() => go('incident', { id: i.id })}
            style={i.id === base.id ? { borderColor: 'var(--accent)', color: 'var(--accent-ink)', background: 'var(--accent-soft)' } : null}>
            <span className={'dot ' + (i.severity === 'SEV1' ? 'crit' : 'warn')} />{i.id} · {i.severity}
          </button>
        ))}
      </div>

      {/* header */}
      <div className="card" style={{ overflow: 'hidden', borderColor: base.severity === 'SEV1' ? 'color-mix(in oklab, var(--crit) 30%, var(--border))' : 'var(--border)' }}>
        <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <Badge tone="crit" dot>{base.severity}</Badge>
            <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{base.id}</span>
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', flex: 1, minWidth: 200 }}>{base.title}</span>
            <button className="btn"><Icon name="message" size={15} />{base.slack}</button>
            <button className="btn primary" onClick={() => { setStatus('Resolved'); setShowRca(true); }}><Icon name="checkCircle" size={15} />Resolve incident</button>
          </div>
          {/* status stepper */}
          <div className="row" style={{ gap: 0, flexWrap: 'wrap' }}>
            {STAGES.map((st, i) => {
              const curIdx = STAGES.indexOf(status);
              const done = i < curIdx, cur = i === curIdx;
              return (
                <React.Fragment key={st}>
                  <button onClick={() => setStatus(st)} className="row" style={{ gap: 7, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                    <span style={{ width: 22, height: 22, borderRadius: 99, display: 'grid', placeItems: 'center', flex: 'none',
                      background: done ? 'var(--ok)' : cur ? 'var(--accent)' : 'var(--surface-2)', color: done || cur ? '#fff' : 'var(--ink-faint)',
                      border: done || cur ? 'none' : '1px solid var(--border)' }}>
                      {done ? <Icon name="check" size={13} /> : <span style={{ fontSize: 11, fontWeight: 700 }}>{i + 1}</span>}
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: cur ? 700 : 500, color: cur ? 'var(--ink)' : done ? 'var(--ink-2)' : 'var(--ink-faint)' }}>{st}</span>
                  </button>
                  {i < STAGES.length - 1 && <span style={{ flex: 1, height: 2, background: i < curIdx ? 'var(--ok)' : 'var(--border)', margin: '0 10px', minWidth: 20 }} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 340px', alignItems: 'start' }}>
        {/* left: tabs */}
        <div className="card" style={{ minWidth: 0 }}>
          <div className="tabs" style={{ padding: '0 var(--pad)' }}>
            {[['timeline', 'Timeline'], ['impact', 'Impact'], ['telemetry', 'Telemetry']].map(([id, l]) => (
              <button key={id} className={'tab' + (tab === id ? ' on' : '')} onClick={() => setTab(id)}>{l}</button>
            ))}
          </div>
          <div className="card-b">
            {tab === 'timeline' && (
              <div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <Avatar name="Priya Nair" size="sm" />
                  <div style={{ flex: 1 }}>
                    <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add an update to the timeline…"
                      style={{ width: '100%', resize: 'none', minHeight: 38, border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '9px 12px', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--ink)', background: 'var(--surface-2)', outline: 'none' }}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); }} />
                    <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--ink-faint)', marginRight: 'auto' }}><span className="kbd">⌘</span> <span className="kbd">↵</span> to post</span>
                      <button className="btn sm primary" onClick={addNote}>Post update</button>
                    </div>
                  </div>
                </div>
                {events.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No timeline events yet.</div>}
                {[...events].reverse().map((ev, i) => <TimelineItem key={i} ev={ev} />)}
              </div>
            )}
            {tab === 'impact' && (
              <div className="grid" style={{ gap: 10 }}>
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{base.impact}</div>
                {sevSvcs.map(s => (
                  <div key={s.id} className="row" style={{ gap: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                    <StatusDot status={s.status} pulse={s.status === 'critical'} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.name}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{s.tier} · {s.owner} · {s.instances} instances · {s.region}</div>
                    </div>
                    <Badge tone={STATUS_TONE[s.status] === 'ok' ? 'ok' : STATUS_TONE[s.status] === 'warn' ? 'warn' : 'crit'}>{STATUS_LABEL[s.status]}</Badge>
                    <button className="btn sm ghost" onClick={() => go('metrics', { service: s.name })}>Metrics<Icon name="chevronRight" size={13} /></button>
                  </div>
                ))}
              </div>
            )}
            {tab === 'telemetry' && (
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {D.panels.slice(0, 4).map(p => (
                  <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 12 }}>
                    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{p.title}</span>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--' + p.color + ')' }}>{p.value}</span>
                    </div>
                    <AreaChart data={p.data} color={p.color} h={70} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* right: facts */}
        <div className="grid" style={{ gap: 'var(--gap)', minWidth: 0 }}>
          <AiIncidentPanel incId={base.id} go={go} copilot={copilot || (() => {})} />

          <Card title="Incident facts">
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[['Status', status], ['Duration', durationFrom(base.startedAt)], ['Started', D.fmtTime(base.startedAt)], ['Severity', base.severity]].map(([k, v]) => (
                <div key={k}><div className="stat-l" style={{ marginBottom: 2 }}>{k}</div><div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div></div>
              ))}
            </div>
          </Card>

          <Card title="Responders" action={<button className="btn sm ghost"><Icon name="plus" size={14} />Page</button>}>
            <div className="grid" style={{ gap: 10 }}>
              {base.responders.map((r, i) => (
                <div key={r} className="row" style={{ gap: 10 }}>
                  <Avatar name={r} size="sm" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{D.people[r] ? D.people[r].team : ''}</div>
                  </div>
                  <Badge tone={i === 0 ? 'accent' : 'neutral'}>{i === 0 ? 'Commander' : 'Responder'}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Linked records">
            <div className="grid" style={{ gap: 8 }}>
              {[['Jira', base.jira, 'externalLink'], ['ServiceNow', base.snow, 'externalLink'], ['Slack', base.slack, 'message']].map(([sys, id, ic]) => (
                <a key={sys} href="#" onClick={e => e.preventDefault()} className="lrow click"
                  style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 12px', textDecoration: 'none', color: 'inherit' }}>
                  <Icon name={ic} size={15} style={{ color: 'var(--ink-3)' }} />
                  <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{sys}</div><div className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{id}</div></div>
                  <Icon name="chevronRight" size={15} style={{ color: 'var(--ink-faint)' }} />
                </a>
              ))}
            </div>
          </Card>

          {relAlerts.length > 0 && (
            <Card title="Correlated alerts" sub={relAlerts.length + ''} pad={false} src="RSS" srcIcon="bell">
              <div>{relAlerts.map(a => <AlertRow key={a.id} a={a} go={go} compact />)}</div>
            </Card>
          )}
        </div>
      </div>

      {showRca && <RcaModal incId={base.id} onClose={() => setShowRca(false)} go={go} />}
    </div>
  );
}

window.Incident = Incident;
