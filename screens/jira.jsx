/* O11Y Command — Jira sprint board (project work) */

const JTYPE = {
  Story: { c: '#22a06b', icon: 'check', label: 'Story' },
  Bug: { c: '#e5493a', icon: 'alertOctagon', label: 'Bug' },
  Task: { c: '#4688ec', icon: 'board', label: 'Task' },
  Incident: { c: '#8b5cf6', icon: 'flame', label: 'Incident' },
};
const JPRIO = { High: { c: 'crit', icon: 'arrowUp' }, Medium: { c: 'warn', icon: 'arrowUp' }, Low: { c: 'info', icon: 'arrowDown' } };

function JCard({ card, go }) {
  const ty = JTYPE[card.type] || JTYPE.Task;
  const pr = JPRIO[card.priority] || JPRIO.Medium;
  return (
    <button className="jcard" style={{ '--type-c': ty.c }}
      onClick={() => card.inc ? go('incident', { id: card.inc }) : null}>
      <div className="ttl">{card.title}</div>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        {card.labels.map(l => <span key={l} className="jlabel">{l}</span>)}
        {card.inc && <span className="jlabel" style={{ color: 'var(--crit)', borderColor: 'color-mix(in oklab,var(--crit) 30%,var(--border))' }}>{card.inc}</span>}
      </div>
      <div className="ft">
        <span style={{ display: 'grid', placeItems: 'center', width: 17, height: 17, borderRadius: 4, background: ty.c, color: '#fff', flex: 'none' }}>
          <Icon name={ty.icon} size={11} />
        </span>
        <span className="key">{card.key}</span>
        <span className="prio" style={{ color: 'var(--' + pr.c + ')' }} title={card.priority + ' priority'}><Icon name={pr.icon} size={13} /></span>
        <span style={{ flex: 1 }} />
        <span className="jlabel" style={{ fontFamily: 'var(--mono)' }}>{card.pts}</span>
        <Avatar name={card.who} size="sm" />
      </div>
    </button>
  );
}

function Jira({ go }) {
  const D = window.DB;
  const b = D.jiraBoard;
  const [assignee, setAssignee] = useState('all');
  const people = Array.from(new Set(b.columns.flatMap(c => c.cards.map(k => k.who))));
  const match = c => assignee === 'all' || c.who === assignee;
  const pct = Math.round(b.sprint.completed / b.sprint.committed * 100);

  return (
    <div className="screen grid" style={{ gap: 'var(--gap)' }}>
      {/* sprint header */}
      <div className="card" style={{ padding: 'var(--pad)' }}>
        <div className="row" style={{ gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="row" style={{ gap: 9 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: '#2684ff', display: 'grid', placeItems: 'center', color: '#fff', flex: 'none' }}><Icon name="board" size={16} /></span>
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>{b.sprint.name}</span>
                  <Badge tone="accent">{b.sprint.left}</Badge>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{b.sprint.range} · <span className="mono">SRE</span> project</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 12 }}><span style={{ fontWeight: 600, color: 'var(--ink)' }}>Goal&nbsp;·&nbsp;</span>{b.sprint.goal}</div>
          </div>

          {/* progress */}
          <div style={{ width: 230, flex: 'none' }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="stat-l">Sprint progress</span>
              <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{b.sprint.completed}/{b.sprint.committed} pts</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
              <div style={{ width: pct + '%', height: '100%', background: 'linear-gradient(90deg,var(--accent),oklch(0.6 0.2 320))', borderRadius: 99 }} />
            </div>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
              <div><div className="stat-l">Burndown</div></div>
              <div style={{ width: 130 }}><Sparkline data={b.sprint.burndown} color="accent" h={26} /></div>
            </div>
          </div>
        </div>

        {/* epics */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          {b.epics.map(e => (
            <div key={e.name}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="row" style={{ gap: 7, fontSize: 12.5, fontWeight: 600 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: e.color }} />{e.name}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{e.done}/{e.total}</span>
              </div>
              <div className="epic-bar"><span style={{ width: (e.done / e.total * 100) + '%', background: e.color }} /></div>
            </div>
          ))}
        </div>
      </div>

      {/* board toolbar */}
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="stat-l" style={{ fontWeight: 600 }}>Assignee</span>
          <div className="seg">
            <button className={assignee === 'all' ? 'on' : ''} onClick={() => setAssignee('all')}>Everyone</button>
          </div>
          <div className="avatar-stack" style={{ marginLeft: 2 }}>
            {people.map(p => (
              <button key={p} onClick={() => setAssignee(a => a === p ? 'all' : p)} title={p}
                style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', borderRadius: 99, outline: assignee === p ? '2px solid var(--accent)' : 'none', marginLeft: -8 }}>
                <Avatar name={p} size="sm" />
              </button>
            ))}
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn sm"><Icon name="filter" size={14} />Filter</button>
          <button className="btn sm primary"><Icon name="plus" size={14} />Create</button>
        </div>
      </div>

      {/* board */}
      <div className="board">
        {b.columns.map(col => {
          const cards = col.cards.filter(match);
          const pts = cards.reduce((s, c) => s + c.pts, 0);
          return (
            <div key={col.id} className={'board-col col-' + col.id}>
              <div className="board-col-h">
                <span className="nm">{col.name}</span>
                <span className="ct">{cards.length}</span>
                <span style={{ flex: 1 }} />
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{pts} pts</span>
              </div>
              <div className="board-col-b">
                {cards.map(c => <JCard key={c.key} card={c} go={go} />)}
                {cards.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center', padding: '16px 0' }}>No issues</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.Jira = Jira;
