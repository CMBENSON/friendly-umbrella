/* O11Y Command — shared primitives & charts */

const STATUS_LABEL = { critical: 'Critical', degraded: 'Degraded', healthy: 'Healthy' };
const STATUS_TONE = { critical: 'crit', degraded: 'warn', healthy: 'ok' };

function Badge({ tone = 'neutral', children, dot }) {
  return (
    <span className={'badge ' + tone}>
      {dot && <span className={'dot ' + tone} style={{ width: 6, height: 6 }} />}
      {children}
    </span>
  );
}

function StatusDot({ status, pulse }) {
  return <span className={'dot ' + status + (pulse ? ' pulse' : '')} style={pulse ? { color: 'var(--' + (STATUS_TONE[status] || status) + ')' } : null} />;
}

function Avatar({ name, size, people }) {
  const p = (people || (window.DB && window.DB.people) || {})[name] || {};
  const cls = 'avatar' + (size === 'sm' ? ' sm' : size === 'lg' ? ' lg' : '');
  const initials = p.initials || (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2);
  return <div className={cls} style={{ background: p.color || 'var(--accent)' }} title={name}>{initials}</div>;
}

function Card({ title, sub, src, srcIcon, action, children, pad = true, style, className }) {
  return (
    <div className={'card ' + (className || '')} style={style}>
      {(title || action || src) && (
        <div className="card-h">
          {title && <h3>{title}</h3>}
          {sub && <span className="sub">{sub}</span>}
          {src && <span className="src">{srcIcon && <Icon name={srcIcon} size={13} />}{src}</span>}
          {action && <div style={{ marginLeft: src ? 12 : 'auto' }}>{action}</div>}
        </div>
      )}
      <div className={pad ? 'card-b' : ''} style={pad ? null : { padding: 0 }}>{children}</div>
    </div>
  );
}

/* ---------------- charts ---------------- */
function colorVar(c) {
  const map = { accent: 'var(--accent)', crit: 'var(--crit)', critical: 'var(--crit)', warn: 'var(--warn)', warning: 'var(--warn)', ok: 'var(--ok)', info: 'var(--info)' };
  return map[c] || c || 'var(--accent)';
}

function buildPath(data, w, h, pad, domain) {
  const p = pad || 0;
  const min = domain ? domain[0] : Math.min(...data);
  const max = domain ? domain[1] : Math.max(...data);
  const span = max - min || 1;
  const iw = w - p * 2, ih = h - p * 2;
  const pts = data.map((v, i) => {
    const x = p + (i / (data.length - 1)) * iw;
    const y = p + ih - ((v - min) / span) * ih;
    return [x, y];
  });
  // smooth-ish line
  let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ' C' + cx.toFixed(1) + ' ' + y0.toFixed(1) + ' ' + cx.toFixed(1) + ' ' + y1.toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1);
  }
  return { d, pts, min, max };
}

function Sparkline({ data, color = 'accent', w = 120, h = 34, fill = true, strokeW = 2 }) {
  const id = React.useMemo(() => 'sp' + Math.random().toString(36).slice(2, 8), []);
  const { d } = buildPath(data, w, h, 3);
  const c = colorVar(color);
  const area = d + ' L' + (w - 3) + ' ' + (h - 3) + ' L3 ' + (h - 3) + ' Z';
  return (
    <svg className="spark" viewBox={'0 0 ' + w + ' ' + h} preserveAspectRatio="none" style={{ height: h }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.22" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={'url(#' + id + ')'} />}
      <path d={d} fill="none" stroke={c} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function AreaChart({ data, color = 'accent', h = 150, threshold, thLabel, unit }) {
  const id = React.useMemo(() => 'ac' + Math.random().toString(36).slice(2, 8), []);
  const w = 600;
  // when a threshold is given, expand the domain to include it (with breathing room)
  // so the reference line always sits inside the chart instead of clipping off-canvas.
  let domain = null, dmin, dmax, dspan;
  if (threshold != null) {
    dmin = Math.min(Math.min(...data), threshold);
    dmax = Math.max(Math.max(...data), threshold);
    const padv = (dmax - dmin) * 0.16 || 1;
    dmin -= padv; dmax += padv;
    domain = [dmin, dmax];
    dspan = dmax - dmin || 1;
  }
  const { d, min, max } = buildPath(data, w, h, 8, domain);
  const c = colorVar(color);
  const area = d + ' L' + (w - 8) + ' ' + (h - 8) + ' L8 ' + (h - 8) + ' Z';
  const span = domain ? dspan : (max - min || 1);
  const base = domain ? dmin : min;
  const thY = threshold != null ? (8 + (h - 16) - ((threshold - base) / span) * (h - 16)) : null;
  const grid = [0.25, 0.5, 0.75].map(f => 8 + (h - 16) * f);
  return (
    <svg viewBox={'0 0 ' + w + ' ' + h} preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.24" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid.map((y, i) => <line key={i} x1="8" x2={w - 8} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />)}
      {thY != null && <line x1="8" x2={w - 8} y1={thY} y2={thY} stroke="var(--crit)" strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />}
      <path d={area} fill={'url(#' + id + ')'} />
      <path d={d} fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* radial gauge for SLO error budget */
function Gauge({ pct, color = 'ok', size = 64, label }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const c = colorVar(color);
  const off = circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <span className="tnum" style={{ fontSize: size > 56 ? 15 : 12, fontWeight: 700 }}>{label != null ? label : pct + '%'}</span>
      </div>
    </div>
  );
}

/* small horizontal segmented bar */
function SegBar({ parts }) {
  const total = parts.reduce((s, p) => s + p.v, 0) || 1;
  return (
    <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', background: 'var(--surface-2)' }}>
      {parts.map((p, i) => <div key={i} title={p.label} style={{ width: (p.v / total * 100) + '%', background: colorVar(p.color) }} />)}
    </div>
  );
}

window.Badge = Badge;
window.StatusDot = StatusDot;
window.Avatar = Avatar;
window.Card = Card;
window.Sparkline = Sparkline;
window.AreaChart = AreaChart;
window.Gauge = Gauge;
window.SegBar = SegBar;
window.STATUS_LABEL = STATUS_LABEL;
window.STATUS_TONE = STATUS_TONE;
window.colorVar = colorVar;
