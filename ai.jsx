/* O11Y Command — AI copilot, insights & war-room panel */

const INSIGHT_META = {
  correlation: { icon: 'link', label: 'Correlation' },
  prediction: { icon: 'trendUp', label: 'Prediction' },
  recommendation: { icon: 'lightbulb', label: 'Recommendation' },
  anomaly: { icon: 'activity', label: 'Anomaly' },
};

/* ---- tiny markdown renderer for chat bubbles ---- */
function mdInline(s, key) {
  const parts = s.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p, i) => p.startsWith('**') && p.endsWith('**')
    ? <strong key={i}>{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>);
}
function Markdown({ text }) {
  const lines = text.split('\n');
  const blocks = [];
  let list = null;
  lines.forEach((ln, i) => {
    const t = ln.trim();
    if (/^[-•]\s+/.test(t)) { (list = list || []).push(t.replace(/^[-•]\s+/, '')); }
    else { if (list) { blocks.push({ type: 'ul', items: list }); list = null; } if (t) blocks.push({ type: 'p', text: t }); }
  });
  if (list) blocks.push({ type: 'ul', items: list });
  return <>{blocks.map((b, i) => b.type === 'ul'
    ? <ul key={i}>{b.items.map((it, j) => <li key={j}>{mdInline(it)}</li>)}</ul>
    : <p key={i}>{mdInline(b.text)}</p>)}</>;
}

/* ---- grounded offline fallback ---- */
function cannedAnswer(q) {
  const D = window.DB; const s = q.toLowerCase();
  const inc = D.incidents[0];
  if (/(status update|draft|comms|customer)/.test(s))
    return 'Here\u2019s a draft you can post:\n\n"' + D.ai.incidentCopilot[inc.id].draft + '"\n\nWant me to tailor the tone or add an ETA?';
  if (/(who|page|escalat)/.test(s))
    return '**' + inc.id + '** is owned by **' + inc.commander + '** (Payments primary). If you need deeper DB help, page **Dana Liu** (Platform primary) \u2014 she\u2019s already scaling Ledger replicas. Next escalation tier is the team lead after 15 min unacked.';
  if (/(budget|slo|risk|burn)/.test(s)) {
    const r = D.slos.filter(x => x.budget < 25).map(x => '- **' + x.service + ' ' + x.name + '** \u2014 ' + x.budget + '% budget left').join('\n');
    return 'Two SLOs are at risk right now:\n\n' + r + '\n\nAt the current burn rate, Checkout availability breaches before ~18:15 today.';
  }
  if (/(chang|before|cause|why|deploy)/.test(s))
    return 'Most likely trigger: **CHG0048213** (Payments v4.2 deploy), which entered its window at 13:30.\n\n- Checkout 5xx onset at 13:46 (+16m)\n- Ledger DB connection pool saturated by 13:50\n- Error rate now easing after replicas were scaled 3\u21926\n\nConfidence ~92%. Rolling back the change is the fastest path if the scale-out doesn\u2019t hold.';
  if (/(summar|incident|happen|going on)/.test(s))
    return D.ai.incidentCopilot[inc.id].summary;
  return 'Right now the headline is **' + inc.id + ' (' + inc.severity + ')** \u2014 ' + inc.title + '. ' + D.kpis.firingAlerts + ' alerts are firing across ' + D.kpis.servicesDegraded + ' degraded services. Ask me to summarize the incident, explain what changed, draft an update, or check error budgets.';
}

async function askCopilot(question) {
  const D = window.DB;
  const prompt = D.ai.buildContext() + '\n\nUser question: ' + question +
    '\n\nAnswer as O11Y Copilot in 2\u20135 sentences or a short bullet list. Be specific and reference the data above. Use **bold** for key entities. Do not invent metrics.';
  try {
    if (window.claude && window.claude.complete) {
      const out = await window.claude.complete(prompt);
      if (out && out.trim()) return out.trim();
    }
  } catch (e) { /* fall through */ }
  return cannedAnswer(question);
}

/* ---- insight card ---- */
function InsightCard({ ins, go, copilot }) {
  const m = INSIGHT_META[ins.type];
  const tone = ins.sev === 'critical' ? 'crit' : ins.sev === 'warning' ? 'warn' : 'info';
  return (
    <div className="insight" style={{ paddingLeft: 16 }}>
      <div className="row" style={{ gap: 8 }}>
        <span className="ai-chip"><Icon name={m.icon} size={12} />{m.label}</span>
        <span className="row" style={{ gap: 6, marginLeft: 'auto' }}>
          <span style={{ fontSize: 10.5, color: 'var(--ink-faint)', fontWeight: 600 }}>{ins.confidence}%</span>
          <span className="conf-bar" style={{ width: 44, flex: 'none' }}><span style={{ width: ins.confidence + '%' }} /></span>
        </span>
      </div>
      <div>
        <div className="row" style={{ gap: 7, alignItems: 'flex-start' }}>
          <span className={'dot ' + tone} style={{ marginTop: 6 }} />
          <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.3 }}>{ins.title}</div>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.5 }}>{ins.body}</div>
      </div>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        {ins.evidence.map((e, i) => <span key={i} className="badge neutral" style={{ fontWeight: 500 }}>{e}</span>)}
      </div>
      <div className="row" style={{ gap: 8, marginTop: 2 }}>
        <button className="btn sm primary" onClick={() => go(ins.link.screen, ins.link.params || {})}>
          <Icon name={ins.action.icon} size={14} />{ins.action.label}
        </button>
        <button className="btn sm ghost" onClick={() => copilot('Explain this insight: ' + ins.title)}>
          <Icon name="sparkles" size={14} />Ask
        </button>
      </div>
    </div>
  );
}

/* ---- overview AI insights section ---- */
function AiInsightsCard({ go, copilot }) {
  const D = window.DB;
  return (
    <Card pad={false}
      title="AI insights"
      action={
        <div className="row" style={{ gap: 10 }}>
          <span className="ai-chip"><Icon name="sparkles" size={12} />4 findings · updated 1m ago</span>
          <button className="btn sm ghost" onClick={() => copilot()}>Open copilot<Icon name="chevronRight" size={14} /></button>
        </div>
      }>
      <div className="card-h" style={{ paddingTop: 0, paddingBottom: 0, display: 'none' }} />
      <div className="card-b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {D.ai.insights.map(ins => <InsightCard key={ins.id} ins={ins} go={go} copilot={copilot} />)}
      </div>
    </Card>
  );
}

/* ---- war-room AI panel ---- */
function AiIncidentPanel({ incId, go, copilot }) {
  const D = window.DB;
  const c = D.ai.incidentCopilot[incId];
  if (!c) return null;
  return (
    <div className="card" style={{ overflow: 'hidden', border: '1px solid color-mix(in oklab, var(--ai) 30%, var(--border))' }}>
      <div className="card-h" style={{ paddingBottom: 0 }}>
        <span className="ai-mark ai-grad"><Icon name="sparkles" size={16} /></span>
        <h3>Copilot analysis</h3>
        <span className="ai-chip" style={{ marginLeft: 'auto' }}><Icon name="target" size={12} />{c.confidence}% confidence</span>
      </div>
      <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: 'var(--ai-soft)', border: '1px solid color-mix(in oklab, var(--ai) 16%, var(--border))', borderRadius: 'var(--r-md)', padding: 12 }}>
          <div className="stat-l" style={{ marginBottom: 4, color: 'var(--ai-ink)', fontWeight: 700 }}>Likely root cause</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>{c.hypothesis}</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>{c.summary}</div>

        <div>
          <div className="stat-l" style={{ marginBottom: 8 }}>Suggested actions</div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {c.actions.map((a, i) => (
              <button key={i} className={'btn sm' + (a.tone === 'crit' ? ' danger' : a.tone === 'accent' ? ' primary' : '')}>
                <Icon name={a.icon} size={14} />{a.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="stat-l" style={{ marginBottom: 8 }}>Similar past incidents</div>
          <div className="grid" style={{ gap: 8 }}>
            {c.similar.map(s => (
              <button key={s.id} className="lrow click" onClick={() => copilot('How was ' + s.id + ' resolved?')}
                style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '9px 12px', background: 'none', textAlign: 'left' }}>
                <Icon name="flame" size={14} style={{ color: 'var(--ink-faint)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.id} · {s.title}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{s.when}</div>
                </div>
                <Badge tone="ok">resolved {s.resolved}</Badge>
              </button>
            ))}
          </div>
        </div>
        <button className="ai-btn" style={{ justifyContent: 'center' }} onClick={() => copilot('Walk me through resolving ' + incId)}>
          <Icon name="sparkles" size={16} />Ask copilot about this incident
        </button>
      </div>
    </div>
  );
}

window.InsightCard = InsightCard;
window.AiInsightsCard = AiInsightsCard;
window.AiIncidentPanel = AiIncidentPanel;
window.askCopilot = askCopilot;
window.Markdown = Markdown;
