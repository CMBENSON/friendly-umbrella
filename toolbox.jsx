/* O11Y Command — Toolbox: floating radial tool launcher.
   3 wheel styles (orbit / fan / dual-ring), mocked deep-link launch. */
const { useState: tbxUseState, useEffect: tbxUseEffect, useRef: tbxUseRef, useMemo: tbxUseMemo } = React;

/* ---- the day-to-day + investigation toolset ----
   monogram tiles in brand-adjacent colors (original marks, not logos) */
const TOOLS = [
  { id: 'grafana',   name: 'Grafana',      mono: 'Gr', color: '#F46800', cat: 'Observe',     url: 'grafana.o11y.io/d/checkout-api',        live: 'crit' },
  { id: 'prometheus',name: 'Prometheus',   mono: 'Pr', color: '#E6522C', cat: 'Observe',     url: 'prom.o11y.io/graph?expr=rate(5xx)' },
  { id: 'datadog',   name: 'Datadog',      mono: 'Dd', color: '#7A37C9', cat: 'Observe',     url: 'app.datadoghq.com/apm/services' },
  { id: 'splunk',    name: 'Splunk',       mono: 'Sp', color: '#D5471F', cat: 'Observe',     url: 'o11y.splunkcloud.com/search' },
  { id: 'kibana',    name: 'Kibana',       mono: 'Kb', color: '#00A99D', cat: 'Observe',     url: 'kibana.o11y.io/app/discover' },
  { id: 'cloudwatch',name: 'CloudWatch',   mono: 'Cw', color: '#C7205E', cat: 'Observe',     url: 'console.aws.amazon.com/cloudwatch',     live: 'warn' },
  { id: 'pagerduty', name: 'PagerDuty',    mono: 'Pd', color: '#06AC38', cat: 'Respond',     url: 'o11y.pagerduty.com/incidents',          live: 'crit' },
  { id: 'servicenow',name: 'ServiceNow',   mono: 'Sn', color: '#1C8C6B', cat: 'Respond',     url: 'o11y.service-now.com/nav/incidents' },
  { id: 'statuspage',name: 'Status page',  mono: 'St', color: '#2E9E54', cat: 'Respond',     url: 'status.o11y.io/manage' },
  { id: 'slack',     name: 'Slack',        mono: 'Sl', color: '#5B1A56', cat: 'Respond',     url: 'o11y.slack.com/archives/inc-4821' },
  { id: 'jira',      name: 'Jira',         mono: 'Ji', color: '#2684FF', cat: 'Ship',        url: 'o11y.atlassian.net/jira/board' },
  { id: 'github',    name: 'GitHub',       mono: 'Gh', color: '#30363D', cat: 'Ship',        url: 'github.com/o11y/checkout' },
  { id: 'kubectl',   name: 'Terminal',     mono: '›_', color: '#326CE5', cat: 'Ship',        url: 'kubectl get pods -n production' },
  { id: 'runbooks',  name: 'Runbooks',     mono: 'Rb', color: '#0C66E4', cat: 'Ship',        url: 'o11y.atlassian.net/wiki/runbooks' },
];

const CAT_ORDER = ['Observe', 'Respond', 'Ship'];

/* polar → cartesian; angle in degrees, 0° = up, clockwise */
function tbxPolar(deg, r) {
  const a = (deg - 90) * Math.PI / 180;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

function ToolTile({ tool, x, y, idx, shown, dim, labels, onHover, onLeave, onPick, anchorCenter }) {
  const tx = anchorCenter ? `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
                          : `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  const hidden = `translate(-50%, -50%) scale(.3)`;
  return (
    <button
      className={'tbx-tile' + (dim ? ' dim' : '') + (labels ? ' labels' : '')}
      style={{ transform: shown ? tx : hidden, transitionDelay: (shown ? idx * 22 : 0) + 'ms' }}
      onMouseEnter={() => onHover(tool)}
      onMouseLeave={onLeave}
      onFocus={() => onHover(tool)}
      onClick={() => onPick(tool)}
      title={tool.name}
    >
      <span className="disc" style={{ background: tool.color }}>
        {tool.mono}
        {tool.live && <span className="badge-dot" style={{ background: 'var(--' + tool.live + ')' }} />}
      </span>
      <span className="lbl">{tool.name}</span>
    </button>
  );
}

function Toolbox({ style = 'orbit', wantLabels = false, scrim = true }) {
  const [open, setOpen] = tbxUseState(false);
  const [shown, setShown] = tbxUseState(false);
  const [hover, setHover] = tbxUseState(null);
  const [q, setQ] = tbxUseState('');
  const [toast, setToast] = tbxUseState(null);
  const searchRef = tbxUseRef(null);

  // animate-in flag
  tbxUseEffect(() => {
    if (open) {
      const id = setTimeout(() => setShown(true), 24);
      return () => clearTimeout(id);
    }
    setShown(false); setHover(null); setQ('');
  }, [open]);

  // global key handling: T toggles, Esc closes
  tbxUseEffect(() => {
    const onKey = (e) => {
      const typing = /^(input|textarea|select)$/i.test(document.activeElement?.tagName || '');
      if (e.key === 'Escape' && open) { setOpen(false); return; }
      if (!open && !typing && (e.key === 't' || e.key === 'T') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // focus search shortly after centered wheels open
  tbxUseEffect(() => {
    if (open && shown && style !== 'fan') {
      const id = setTimeout(() => searchRef.current?.focus(), 360);
      return () => clearTimeout(id);
    }
  }, [open, shown, style]);

  const matches = (tool) => !q.trim() || (tool.name + ' ' + tool.cat).toLowerCase().includes(q.trim().toLowerCase());
  const filtered = tbxUseMemo(() => TOOLS.filter(matches), [q]);

  const pick = (tool) => {
    setToast({ tool, n: Date.now() });
    setOpen(false);
  };

  // ---- geometry per style ----
  let placed = [];      // { tool, x, y, idx }
  let cats = [];        // { label, y }
  let wheelSize = 540;

  if (style === 'orbit') {
    const r = 200; wheelSize = 540;
    TOOLS.forEach((tool, i) => {
      const { x, y } = tbxPolar((360 / TOOLS.length) * i, r);
      placed.push({ tool, x, y, idx: i });
    });
  } else if (style === 'dual') {
    wheelSize = 620;
    const observe = TOOLS.filter(t => t.cat === 'Observe');
    const rest = TOOLS.filter(t => t.cat !== 'Observe');
    const rIn = 132, rOut = 252;
    observe.forEach((tool, i) => {
      const { x, y } = tbxPolar((360 / observe.length) * i, rIn);
      placed.push({ tool, x, y, idx: i });
    });
    rest.forEach((tool, i) => {
      const { x, y } = tbxPolar((360 / rest.length) * i + 16, rOut);
      placed.push({ tool, x, y, idx: observe.length + i });
    });
    cats = [{ label: 'Observe', y: -rIn - 34 }, { label: 'Respond · Ship', y: -rOut - 30 }];
  } else { // fan — graduated arcs opening up-and-left from the bottom-right FAB
    const rows = [
      { r: 106, items: TOOLS.slice(0, 3) },
      { r: 178, items: TOOLS.slice(3, 8) },
      { r: 250, items: TOOLS.slice(8) },
    ];
    let n0 = 0;
    rows.forEach((row) => {
      const n = row.items.length;
      row.items.forEach((tool, i) => {
        // 0°=up, 270°=left → sweep the up-left quadrant
        const deg = n === 1 ? 315 : 272 + (i / (n - 1)) * 86;
        const { x, y } = tbxPolar(deg, row.r);
        placed.push({ tool, x, y, idx: n0 + i });
      });
      n0 += n;
    });
  }

  const active = hover;
  const centered = style !== 'fan';

  return (
    <>
      {/* FAB */}
      <div className="tbx-fab-wrap">
        <div className="tbx-fab-tip">Toolbox <span className="kbd">T</span></div>
        <button
          className={'tbx-fab' + (open ? ' open' : '') + (!open ? ' pinging' : '')}
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close toolbox' : 'Open toolbox'}
          aria-expanded={open}
        >
          <span className="fab-ring" />
          <span className="glyph"><Icon name={open ? 'x' : 'grid'} size={23} /></span>
        </button>
      </div>

      {/* Overlay + wheel */}
      {open && (
        <>
          <div className={'tbx-overlay' + (scrim ? ' scrim' : '')} onClick={() => setOpen(false)} />

          {centered ? (
            <div className="tbx-stage">
              <div className={'tbx-wheel' + (shown ? ' shown' : '')} style={{ width: wheelSize, height: wheelSize }}>
                {/* connector to hovered tile */}
                <svg className="tbx-conn" width={wheelSize} height={wheelSize} viewBox={`0 0 ${wheelSize} ${wheelSize}`}>
                  {active && shown && (() => {
                    const p = placed.find(pl => pl.tool.id === active.id);
                    if (!p) return null;
                    return <line x1={wheelSize / 2} y1={wheelSize / 2} x2={wheelSize / 2 + p.x} y2={wheelSize / 2 + p.y}
                      stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.55" />;
                  })()}
                </svg>

                {cats.map((c, i) => (
                  <div key={i} className="tbx-cat" style={{ top: `calc(50% + ${c.y}px)` }}>{c.label}</div>
                ))}

                {/* hub */}
                <div className="tbx-hub">
                  {active ? (
                    <>
                      <div className="hub-kicker">{active.cat}</div>
                      <div className="hub-name">{active.name}</div>
                      <div className="hub-url">{active.url}</div>
                      <div className="hub-go"><Icon name="externalLink" size={12} /> Open in new tab</div>
                    </>
                  ) : (
                    <>
                      <div className="hub-kicker">Toolbox</div>
                      <input
                        ref={searchRef}
                        className="hub-search"
                        placeholder="Filter tools…"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        onClick={e => e.stopPropagation()}
                      />
                      <div className="hub-count">{filtered.length} of {TOOLS.length} tools</div>
                    </>
                  )}
                </div>

                {/* tiles */}
                {placed.map(p => (
                  <ToolTile
                    key={p.tool.id}
                    tool={p.tool} x={p.x} y={p.y} idx={p.idx}
                    shown={shown}
                    dim={!matches(p.tool)}
                    labels={wantLabels}
                    onHover={setHover} onLeave={() => setHover(null)} onPick={pick}
                    anchorCenter
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className={'tbx-fan tbx-wheel' + (shown ? ' shown' : '')}>
              {placed.map(p => (
                <ToolTile
                  key={p.tool.id}
                  tool={p.tool} x={p.x} y={p.y} idx={p.idx}
                  shown={shown}
                  dim={false}
                  labels={wantLabels}
                  onHover={setHover} onLeave={() => setHover(null)} onPick={pick}
                  anchorCenter
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* launch toast */}
      {toast && (
        <div className="tbx-toast" key={toast.n}>
          <span className="t-disc" style={{ background: toast.tool.color }}>{toast.tool.mono}</span>
          <div className="t-main">
            <div className="t-title"><Icon name="externalLink" size={13} /> Opening {toast.tool.name}</div>
            <div className="t-url">{toast.tool.url}</div>
          </div>
        </div>
      )}
    </>
  );
}

window.Toolbox = Toolbox;
window.TOOLBOX_TOOLS = TOOLS;
