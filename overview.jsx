/* O11Y Command — On-call schedule & rotation */

function Oncall({ go }) {
  const D = window.DB;
  const todayIdx = 4; // Fri 5
  const [team, setTeam] = useState('all');
  const teams = D.onCallNow.map(o => o.team);
  const rows = team === 'all' ? D.rotation : D.rotation.filter(r => r.team === team);

  return (
    <div className="screen grid" style={{ gap: 'var(--gap)' }}>
      {/* on-call now cards */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {D.onCallNow.map(o => (
          <div key={o.team} className="card" style={{ padding: 'var(--pad)' }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="stat-l" style={{ fontWeight: 600 }}>{o.team}</span>
              <span className="dot ok pulse" style={{ color: 'var(--ok)' }} />
            </div>
            <div className="row" style={{ gap: 10, marginBottom: 10 }}>
              <Avatar name={o.primary} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{o.primary}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Primary</div>
              </div>
            </div>
            <div className="row" style={{ gap: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <Avatar name={o.secondary} size="sm" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{o.secondary}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Secondary</div>
              </div>
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 12 }}>Until {o.until}</div>
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', alignItems: 'start' }}>
        {/* rotation timeline */}
        <Card title="Rotation — this week" sub="weekly handoff Fri 09:00" src="PagerDuty" srcIcon="calendarClock"
          action={
            <div className="seg">
              <button className={team === 'all' ? 'on' : ''} onClick={() => setTeam('all')}>All</button>
              {teams.map(t => <button key={t} className={team === t ? 'on' : ''} onClick={() => setTeam(t)}>{t}</button>)}
            </div>
          }>
          <div style={{ display: 'grid', gridTemplateColumns: '110px repeat(7, 1fr)', gap: 6 }}>
            <div />
            {D.rotationDays.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: i === todayIdx ? 'var(--accent-ink)' : 'var(--ink-3)', padding: '2px 0' }}>
                {d}{i === todayIdx && <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)' }}>TODAY</div>}
              </div>
            ))}
            {rows.map(r => (
              <React.Fragment key={r.team}>
                <div className="row" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{r.team}</div>
                {r.shifts.map((person, i) => {
                  const p = D.people[person] || {};
                  const isToday = i === todayIdx;
                  const prev = i > 0 ? r.shifts[i - 1] : null;
                  const handoff = prev && prev !== person;
                  return (
                    <div key={i} className="rot-cell" title={person}
                      style={{ background: isToday ? 'color-mix(in oklab, ' + (p.color || '#888') + ' 22%, var(--surface))' : 'color-mix(in oklab, ' + (p.color || '#888') + ' 11%, var(--surface))',
                        border: isToday ? '1.5px solid ' + (p.color || 'var(--accent)') : '1px solid var(--border)',
                        borderLeft: handoff ? '3px solid ' + (p.color || 'var(--accent)') : undefined }}>
                      <span className="avatar sm" style={{ background: p.color || 'var(--accent)', width: 20, height: 20, fontSize: 8.5 }}>{p.initials || '?'}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11.5, color: 'var(--ink-2)' }}>{person.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          <div className="row" style={{ gap: 14, marginTop: 14, fontSize: 11, color: 'var(--ink-3)' }}>
            <span className="row" style={{ gap: 5 }}><span style={{ width: 14, height: 0, borderTop: '3px solid var(--accent)' }} />Handoff boundary</span>
            <span className="row" style={{ gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, border: '1.5px solid var(--accent)' }} />Today</span>
          </div>
        </Card>

        {/* escalation policy */}
        <div className="grid" style={{ gap: 'var(--gap)' }}>
          <Card title="Escalation policy" src="PagerDuty" srcIcon="phone">
            <div className="grid" style={{ gap: 0 }}>
              {D.escalation.map((e, i) => (
                <div key={e.level} style={{ display: 'flex', gap: 12, paddingBottom: i < D.escalation.length - 1 ? 16 : 0, position: 'relative' }}>
                  {i < D.escalation.length - 1 && <span style={{ position: 'absolute', left: 15, top: 30, bottom: 2, width: 2, background: 'var(--border)' }} />}
                  <span style={{ width: 32, height: 32, borderRadius: 99, flex: 'none', display: 'grid', placeItems: 'center', background: i === 0 ? 'var(--accent)' : 'var(--surface-2)', color: i === 0 ? '#fff' : 'var(--ink-3)', fontSize: 11, fontWeight: 700, border: i === 0 ? 'none' : '1px solid var(--border)', zIndex: 1 }}>{e.level}</span>
                  <div style={{ flex: 1, paddingTop: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e.who}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1 }}>{e.when} · {e.via}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Next handoff">
            <div className="row" style={{ gap: 10 }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="refresh" size={17} /></span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Friday 09:00</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Priya Nair → Marcus Webb (Payments)</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

window.Oncall = Oncall;
