/* O11Y Command — Copilot slide-over drawer */

function CopilotDrawer({ open, onClose, request, go }) {
  const D = window.DB;
  const greeting = {
    role: 'ai',
    text: 'Hi Priya — I\u2019m tracking **INC-4821 (SEV1)** on Checkout. My current read: a **Payments v4.2 deploy (CHG0048213)** is the likely trigger and error rate is already easing after the Ledger DB scale-out.\n\nAsk me anything, or pick a prompt below.',
  };
  const [messages, setMessages] = useState([greeting]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);
  const lastReq = useRef(0);

  const scrollDown = () => requestAnimationFrame(() => { const b = bodyRef.current; if (b) b.scrollTop = b.scrollHeight; });

  const send = async (text) => {
    const q = (text || '').trim();
    if (!q || busy) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: q }, { role: 'ai', typing: true }]);
    setBusy(true);
    scrollDown();
    const answer = await window.askCopilot(q);
    setMessages(m => { const c = m.slice(); c[c.length - 1] = { role: 'ai', text: answer }; return c; });
    setBusy(false);
    scrollDown();
  };

  // external prefill requests (from insight "Ask" buttons, etc.)
  useEffect(() => {
    if (request && request.n && request.n !== lastReq.current) {
      lastReq.current = request.n;
      if (request.q) send(request.q);
    }
  }, [request]);

  useEffect(() => { scrollDown(); }, [open]);

  if (!open) return null;
  const showPrompts = messages.length <= 1;

  return (
    <>
      <div className="cp-overlay" onClick={onClose} />
      <aside className="cp-drawer" role="dialog" aria-label="O11Y Copilot">
        <div className="cp-head">
          <span className="ai-mark ai-grad" style={{ width: 32, height: 32 }}><Icon name="sparkles" size={17} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em' }}>O11Y Copilot</div>
            <div className="row" style={{ gap: 6 }}>
              <span className="dot ok" style={{ width: 6, height: 6 }} />
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Grounded in live production state</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close"><Icon name="x" size={16} /></button>
        </div>

        <div className="cp-body" ref={bodyRef}>
          {messages.map((m, i) => (
            <div key={i} className={'msg' + (m.role === 'user' ? ' me' : '')}>
              <span className={'msg-av' + (m.role === 'ai' ? ' ai-grad' : '')}>
                {m.role === 'ai' ? <Icon name="sparkles" size={15} /> : 'PN'}
              </span>
              <div className={'bubble ' + m.role}>
                {m.typing ? <span className="typing"><i /><i /><i /></span> : <Markdown text={m.text} />}
              </div>
            </div>
          ))}

          {showPrompts && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
              {D.ai.copilotSuggestions.map(s => (
                <button key={s} className="cp-prompt" onClick={() => send(s)}><Icon name="sparkles" size={13} style={{ color: 'var(--ai)', marginRight: 6, verticalAlign: '-2px' }} />{s}</button>
              ))}
            </div>
          )}
        </div>

        <div className="cp-foot">
          <div className="cp-input">
            <textarea rows={1} value={input} placeholder="Ask the copilot…" disabled={busy}
              onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }} />
            <button className="cp-send" disabled={busy || !input.trim()} onClick={() => send(input)}><Icon name="send" size={15} /></button>
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', textAlign: 'center' }}>Copilot can take actions on your behalf — review before confirming.</div>
        </div>
      </aside>
    </>
  );
}

window.CopilotDrawer = CopilotDrawer;
