/* O11Y Command — RCA / postmortem modal, auto-drafted on resolve */

function rcaDuration(start) {
  const m = Math.round((window.DB.now - start) / 60000);
  const h = Math.floor(m / 60);
  return (h > 0 ? h + 'h ' : '') + (m % 60) + 'm';
}

function RcaModal({ incId, onClose, go }) {
  const D = window.DB;
  const inc = D.incidents.find(i => i.id === incId);
  const r = D.ai.rca[incId];
  const [summary, setSummary] = useState(null); // null = drafting
  const [pub, setPub] = useState(false);
  const [jira, setJira] = useState(false);
  const [copied, setCopied] = useState(false);

  // draft the executive summary (live AI, with the canned summary as fallback)
  useEffect(() => {
    let alive = true;
    (async () => {
      let text = r.executiveSummary;
      try {
        if (window.claude && window.claude.complete) {
          const prompt = D.ai.buildContext() +
            '\n\nThe incident ' + incId + ' (' + inc.title + ') has just been resolved. Write a concise 2-3 sentence executive summary for its postmortem, in past tense, suitable for leadership. Plain prose, no markdown, no preamble.';
          const out = await window.claude.complete(prompt);
          if (out && out.trim()) text = out.trim();
        }
      } catch (e) { /* fallback */ }
      if (alive) setTimeout(() => alive && setSummary(text), 350);
    })();
    return () => { alive = false; };
  }, [incId]);

  const copyDoc = () => {
    const lines = [
      'POSTMORTEM — ' + incId + ': ' + inc.title,
      'Severity ' + r.severity + ' · Duration ' + rcaDuration(inc.startedAt) + ' · IC ' + inc.commander,
      '', 'EXECUTIVE SUMMARY', summary || r.executiveSummary,
      '', 'ROOT CAUSE', r.rootCause,
      '', 'CONTRIBUTING FACTORS', ...r.contributingFactors.map(x => '- ' + x),
      '', 'RESOLUTION', ...r.resolution.map(x => '- ' + x),
      '', 'ACTION ITEMS', ...r.actionItems.map(a => '- [' + a.jira + '] ' + a.task + ' (' + a.owner + ', due ' + a.due + ')'),
      '', 'LESSONS LEARNED', ...r.lessons.map(x => '- ' + x),
    ].join('\n');
    navigator.clipboard && navigator.clipboard.writeText(lines).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="rca-overlay" onClick={onClose}>
      <div className="rca-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="RCA draft">
        <div className="rca-head">
          <span className="ai-mark ai-grad" style={{ width: 32, height: 32 }}><Icon name="sparkles" size={17} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>Postmortem — RCA draft</div>
            <div className="row" style={{ gap: 7 }}>
              <Badge tone="ok" dot>Incident resolved</Badge>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{incId}</span>
              <span className="ai-chip"><Icon name="sparkles" size={11} />Auto-drafted by Copilot</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close"><Icon name="x" size={16} /></button>
        </div>

        <div className="rca-body">
          <div className="rca-doc">
            <div className="rca-title">{inc.title}</div>
            <div className="rca-meta">
              {[['Incident', incId], ['Severity', r.severity], ['Duration', rcaDuration(inc.startedAt)], ['Incident commander', inc.commander],
                ['Detected by', r.detectedBy], ['Affected services', inc.services.join(', ')]].map(([k, v]) => (
                <div key={k}><div className="k">{k}</div><div className="v">{v}</div></div>
              ))}
            </div>

            <div className="rca-sec">
              <h4><Icon name="sparkles" size={13} style={{ color: 'var(--ai)' }} />Executive summary</h4>
              {summary === null
                ? <div className="row" style={{ gap: 10, color: 'var(--ink-3)', fontSize: 13 }}><span className="typing"><i /><i /><i /></span> Copilot is drafting the summary…</div>
                : <p>{summary}</p>}
            </div>

            <div className="rca-sec">
              <h4>Impact</h4>
              <p>{r.impact}</p>
            </div>

            <div className="rca-sec">
              <h4>Timeline</h4>
              <div className="rca-tl">
                {inc.timeline.map((e, i) => (
                  <div key={i} className="rca-tl-row">
                    <span className="t">{D.fmtTime(e.t)}</span>
                    <span><strong style={{ fontWeight: 700 }}>{e.who}</strong> — {e.text}</span>
                  </div>
                ))}
                <div className="rca-tl-row"><span className="t">{D.fmtTime(D.now)}</span><span><strong style={{ fontWeight: 700 }}>{inc.commander}</strong> — Incident resolved and marked recovered.</span></div>
              </div>
            </div>

            <div className="rca-sec">
              <h4>Root cause</h4>
              <p>{r.rootCause}</p>
            </div>

            <div className="rca-sec">
              <h4>Contributing factors</h4>
              <ul>{r.contributingFactors.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>

            <div className="rca-sec">
              <h4>Resolution</h4>
              <ul>{r.resolution.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>

            <div className="rca-sec">
              <h4>Action items</h4>
              <table className="rca-ai-table">
                <thead><tr><th>Follow-up</th><th>Owner</th><th>Due</th><th>Priority</th></tr></thead>
                <tbody>
                  {r.actionItems.map((a, i) => (
                    <tr key={i}>
                      <td><div style={{ fontWeight: 600 }}>{a.task}</div><span className="mono" style={{ fontSize: 11, color: 'var(--accent-ink)' }}>{a.jira}</span></td>
                      <td>{a.owner}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{a.due}</td>
                      <td><Badge tone={a.priority === 'High' ? 'crit' : 'warn'}>{a.priority}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rca-sec">
              <h4>Lessons learned</h4>
              <ul>{r.lessons.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          </div>
        </div>

        <div className="rca-foot">
          <button className="btn sm" onClick={copyDoc}><Icon name={copied ? 'check' : 'copy'} size={14} />{copied ? 'Copied' : 'Copy'}</button>
          <div style={{ flex: 1 }} />
          <button className="btn sm" onClick={() => setJira(true)} disabled={jira}>
            <Icon name={jira ? 'check' : 'externalLink'} size={14} />{jira ? r.actionItems.length + ' Jira items created' : 'Create ' + r.actionItems.length + ' Jira follow-ups'}
          </button>
          <button className="btn sm primary" onClick={() => setPub(true)} disabled={pub}>
            <Icon name={pub ? 'check' : 'layers'} size={14} />{pub ? 'Published to Confluence' : 'Publish to Confluence'}
          </button>
        </div>
      </div>
    </div>
  );
}

window.RcaModal = RcaModal;
