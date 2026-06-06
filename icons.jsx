/* O11Y Command — mock data layer. Plain global, no JSX. */
(function () {
  // ---- helpers to make time-relative data feel live ----
  const now = new Date('2026-06-05T14:23:00');
  const mins = (m) => new Date(now.getTime() - m * 60000);
  const fmtAgo = (d) => {
    const s = Math.round((now - d) / 1000);
    if (s < 60) return s + 's ago';
    const m = Math.round(s / 60);
    if (m < 60) return m + 'm ago';
    const h = Math.round(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.round(h / 24) + 'd ago';
  };
  const fmtTime = (d) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  // ---- seeded series generator for charts ----
  function series(n, base, vol, seed) {
    let s = seed || 1;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    const out = [];
    let v = base;
    for (let i = 0; i < n; i++) {
      v += (rnd() - 0.5) * vol;
      v = Math.max(base * 0.4, Math.min(base * 1.7, v));
      out.push(+v.toFixed(2));
    }
    return out;
  }

  // ---- CMDB: services & topology ----
  const services = [
    { id: 'svc-checkout', name: 'Checkout API', tier: 'Tier 1', status: 'critical', owner: 'Payments', deps: ['svc-payments', 'svc-cart', 'svc-identity'], instances: 24, region: 'us-east-1' },
    { id: 'svc-payments', name: 'Payments Gateway', tier: 'Tier 1', status: 'degraded', owner: 'Payments', deps: ['svc-ledger', 'svc-fraud'], instances: 18, region: 'us-east-1' },
    { id: 'svc-cart', name: 'Cart Service', tier: 'Tier 1', status: 'healthy', owner: 'Storefront', deps: ['svc-catalog', 'svc-redis'], instances: 32, region: 'us-east-1' },
    { id: 'svc-identity', name: 'Identity / SSO', tier: 'Tier 1', status: 'healthy', owner: 'Platform', deps: ['svc-postgres'], instances: 12, region: 'global' },
    { id: 'svc-ledger', name: 'Ledger DB', tier: 'Tier 1', status: 'degraded', owner: 'Payments', deps: ['svc-postgres'], instances: 6, region: 'us-east-1' },
    { id: 'svc-fraud', name: 'Fraud Engine', tier: 'Tier 2', status: 'healthy', owner: 'Risk', deps: ['svc-kafka'], instances: 8, region: 'us-east-1' },
    { id: 'svc-catalog', name: 'Catalog API', tier: 'Tier 2', status: 'healthy', owner: 'Storefront', deps: ['svc-elastic'], instances: 16, region: 'us-east-1' },
    { id: 'svc-redis', name: 'Redis Cluster', tier: 'Tier 1', status: 'healthy', owner: 'Platform', deps: [], instances: 9, region: 'us-east-1' },
    { id: 'svc-postgres', name: 'Postgres Primary', tier: 'Tier 1', status: 'degraded', owner: 'Platform', deps: [], instances: 3, region: 'us-east-1' },
    { id: 'svc-kafka', name: 'Kafka Broker', tier: 'Tier 1', status: 'healthy', owner: 'Platform', deps: [], instances: 5, region: 'us-east-1' },
    { id: 'svc-elastic', name: 'Elasticsearch', tier: 'Tier 2', status: 'healthy', owner: 'Platform', deps: [], instances: 7, region: 'us-east-1' },
    { id: 'svc-notify', name: 'Notifications', tier: 'Tier 3', status: 'healthy', owner: 'Growth', deps: ['svc-kafka'], instances: 6, region: 'us-east-1' },
  ];

  // ---- SLOs ----
  const slos = [
    { id: 'slo-checkout-avail', service: 'Checkout API', name: 'Availability', target: 99.95, current: 99.61, budget: 18, trend: series(48, 99.8, 0.4, 11), unit: '%', sli: 'Success rate' },
    { id: 'slo-checkout-lat', service: 'Checkout API', name: 'Latency p99', target: 300, current: 446, budget: -12, trend: series(48, 280, 60, 7), unit: 'ms', sli: 'Request latency', invert: true },
    { id: 'slo-payments-avail', service: 'Payments Gateway', name: 'Availability', target: 99.9, current: 99.82, budget: 41, trend: series(48, 99.85, 0.2, 3), unit: '%', sli: 'Success rate' },
    { id: 'slo-cart-avail', service: 'Cart Service', name: 'Availability', target: 99.9, current: 99.98, budget: 92, trend: series(48, 99.95, 0.1, 5), unit: '%', sli: 'Success rate' },
    { id: 'slo-identity-lat', service: 'Identity / SSO', name: 'Latency p95', target: 150, current: 118, budget: 64, trend: series(48, 120, 25, 9), unit: 'ms', sli: 'Auth latency', invert: true },
    { id: 'slo-catalog-avail', service: 'Catalog API', name: 'Availability', target: 99.5, current: 99.93, budget: 88, trend: series(48, 99.9, 0.15, 13), unit: '%', sli: 'Success rate' },
  ];

  // ---- Incidents ----
  const incidents = [
    {
      id: 'INC-4821',
      title: 'Checkout 5xx spike — payment authorization failures',
      severity: 'SEV1',
      status: 'Investigating',
      services: ['Checkout API', 'Payments Gateway', 'Ledger DB'],
      startedAt: mins(37),
      commander: 'Priya Nair',
      responders: ['Priya Nair', 'Marcus Webb', 'Dana Liu'],
      impact: 'Customers unable to complete checkout in us-east-1. ~3.1% of sessions affected.',
      jira: 'OPS-2391',
      snow: 'INC0094821',
      slack: '#inc-4821-checkout',
      timeline: [
        { t: mins(37), who: 'Grafana', kind: 'alert', text: 'Alert fired: Checkout API error rate > 5% (threshold 1%)' },
        { t: mins(35), who: 'PagerDuty', kind: 'system', text: 'Paged on-call: Priya Nair (Payments primary)' },
        { t: mins(33), who: 'Priya Nair', kind: 'note', text: 'Ack. Confirming blast radius — looks isolated to us-east-1.' },
        { t: mins(28), who: 'Marcus Webb', kind: 'note', text: 'Payments Gateway latency climbing, Ledger DB connection pool saturated.' },
        { t: mins(19), who: 'Dana Liu', kind: 'action', text: 'Scaling Ledger DB read replicas 3 → 6. Rolling out now.' },
        { t: mins(8), who: 'Grafana', kind: 'system', text: 'Error rate trending down: 5.2% → 2.1%' },
      ],
    },
    {
      id: 'INC-4818',
      title: 'Elevated latency on Identity / SSO login flow',
      severity: 'SEV3',
      status: 'Monitoring',
      services: ['Identity / SSO'],
      startedAt: mins(184),
      commander: 'Tom Okafor',
      responders: ['Tom Okafor'],
      impact: 'p95 login latency briefly exceeded 250ms. Mitigated via cache warmup.',
      jira: 'OPS-2388', snow: 'INC0094818', slack: '#inc-4818-sso',
      timeline: [],
    },
  ];

  // ---- Alerts (RSS feed) ----
  const alertSources = ['Grafana', 'Prometheus', 'ServiceNow', 'Datadog', 'CloudWatch'];
  const alerts = [
    { id: 'al-1', sev: 'critical', title: 'Checkout API error rate 5.2% (> 1%)', source: 'Grafana', service: 'Checkout API', t: mins(37), status: 'firing', inc: 'INC-4821' },
    { id: 'al-2', sev: 'critical', title: 'Ledger DB connection pool exhausted', source: 'Prometheus', service: 'Ledger DB', t: mins(34), status: 'firing', inc: 'INC-4821' },
    { id: 'al-3', sev: 'warning', title: 'Payments Gateway p99 latency 820ms', source: 'Grafana', service: 'Payments Gateway', t: mins(31), status: 'acked', inc: 'INC-4821' },
    { id: 'al-4', sev: 'warning', title: 'Postgres Primary replication lag 4.2s', source: 'Datadog', service: 'Postgres Primary', t: mins(52), status: 'firing', inc: null },
    { id: 'al-5', sev: 'critical', title: 'CHG0048213 change window started — Payments deploy', source: 'ServiceNow', service: 'Payments Gateway', t: mins(58), status: 'acked', inc: null },
    { id: 'al-6', sev: 'warning', title: 'Kafka consumer lag on fraud-events > 10k', source: 'Prometheus', service: 'Kafka Broker', t: mins(74), status: 'firing', inc: null },
    { id: 'al-7', sev: 'info', title: 'Redis Cluster failover completed cleanly', source: 'CloudWatch', service: 'Redis Cluster', t: mins(96), status: 'resolved', inc: null },
    { id: 'al-8', sev: 'warning', title: 'Catalog API CPU 84% on 3 nodes', source: 'Grafana', service: 'Catalog API', t: mins(112), status: 'acked', inc: null },
    { id: 'al-9', sev: 'info', title: 'Elasticsearch shard rebalance finished', source: 'Datadog', service: 'Elasticsearch', t: mins(140), status: 'resolved', inc: null },
    { id: 'al-10', sev: 'critical', title: 'Identity / SSO p95 latency 268ms (> 150ms)', source: 'Grafana', service: 'Identity / SSO', t: mins(184), status: 'resolved', inc: 'INC-4818' },
    { id: 'al-11', sev: 'warning', title: 'Notifications queue depth 8.4k growing', source: 'Prometheus', service: 'Notifications', t: mins(210), status: 'firing', inc: null },
    { id: 'al-12', sev: 'info', title: 'Nightly backup verified — Postgres Primary', source: 'CloudWatch', service: 'Postgres Primary', t: mins(360), status: 'resolved', inc: null },
  ];

  // ---- On-call ----
  const people = {
    'Priya Nair': { initials: 'PN', team: 'Payments', color: '#6366f1' },
    'Marcus Webb': { initials: 'MW', team: 'Payments', color: '#0ea5e9' },
    'Dana Liu': { initials: 'DL', team: 'Platform', color: '#10b981' },
    'Tom Okafor': { initials: 'TO', team: 'Platform', color: '#f59e0b' },
    'Sofia Reyes': { initials: 'SR', team: 'Storefront', color: '#ec4899' },
    'Ken Adachi': { initials: 'KA', team: 'Storefront', color: '#8b5cf6' },
    'Lena Frost': { initials: 'LF', team: 'Risk', color: '#14b8a6' },
    'Omar Haddad': { initials: 'OH', team: 'Risk', color: '#ef4444' },
  };
  const onCallNow = [
    { team: 'Payments', primary: 'Priya Nair', secondary: 'Marcus Webb', until: 'Fri 09:00' },
    { team: 'Platform', primary: 'Dana Liu', secondary: 'Tom Okafor', until: 'Fri 09:00' },
    { team: 'Storefront', primary: 'Sofia Reyes', secondary: 'Ken Adachi', until: 'Mon 09:00' },
    { team: 'Risk', primary: 'Lena Frost', secondary: 'Omar Haddad', until: 'Mon 09:00' },
  ];
  // rotation rows for the schedule timeline (7 days, who covers each)
  const rotationDays = ['Mon 1', 'Tue 2', 'Wed 3', 'Thu 4', 'Fri 5', 'Sat 6', 'Sun 7'];
  const rotation = [
    { team: 'Payments', shifts: ['Priya Nair', 'Priya Nair', 'Priya Nair', 'Priya Nair', 'Marcus Webb', 'Marcus Webb', 'Marcus Webb'] },
    { team: 'Platform', shifts: ['Tom Okafor', 'Tom Okafor', 'Dana Liu', 'Dana Liu', 'Dana Liu', 'Tom Okafor', 'Tom Okafor'] },
    { team: 'Storefront', shifts: ['Ken Adachi', 'Ken Adachi', 'Ken Adachi', 'Sofia Reyes', 'Sofia Reyes', 'Sofia Reyes', 'Sofia Reyes'] },
    { team: 'Risk', shifts: ['Lena Frost', 'Omar Haddad', 'Lena Frost', 'Omar Haddad', 'Lena Frost', 'Lena Frost', 'Omar Haddad'] },
  ];
  const escalation = [
    { level: 'L1', when: 'Immediately', who: 'Primary on-call', via: 'Push + SMS' },
    { level: 'L2', when: 'After 5 min unack', who: 'Secondary on-call', via: 'Push + Call' },
    { level: 'L3', when: 'After 15 min', who: 'Team lead', via: 'Call' },
    { level: 'L4', when: 'After 30 min', who: 'Incident manager', via: 'Call + Email' },
  ];

  // ---- Changes (ServiceNow CHG + Jira) ----
  const changes = [
    { id: 'CHG0048213', src: 'ServiceNow', title: 'Payments Gateway v4.2 rolling deploy', type: 'Normal', risk: 'High', status: 'In Progress', when: 'Today 13:30–15:30', owner: 'Marcus Webb', day: 5 },
    { id: 'CHG0048220', src: 'ServiceNow', title: 'Postgres minor version patch (15.4→15.5)', type: 'Standard', risk: 'Medium', status: 'Scheduled', when: 'Today 22:00', owner: 'Dana Liu', day: 5 },
    { id: 'OPS-2402', src: 'Jira', title: 'Catalog API autoscaling policy update', type: 'Normal', risk: 'Low', status: 'Scheduled', when: 'Fri 11:00', owner: 'Ken Adachi', day: 5 },
    { id: 'CHG0048231', src: 'ServiceNow', title: 'Kafka broker rolling restart', type: 'Standard', risk: 'Medium', status: 'Scheduled', when: 'Sat 02:00', owner: 'Tom Okafor', day: 6 },
    { id: 'OPS-2410', src: 'Jira', title: 'Redis cluster scale-out (+3 nodes)', type: 'Normal', risk: 'Low', status: 'Scheduled', when: 'Mon 10:00', owner: 'Dana Liu', day: 1 },
    { id: 'CHG0048240', src: 'ServiceNow', title: 'Fraud Engine model rollout', type: 'Normal', risk: 'Medium', status: 'Pending Approval', when: 'Tue 14:00', owner: 'Lena Frost', day: 2 },
    { id: 'CHG0048199', src: 'ServiceNow', title: 'Identity / SSO cert rotation', type: 'Emergency', risk: 'High', status: 'Completed', when: 'Wed 03:00', owner: 'Tom Okafor', day: 3 },
    { id: 'OPS-2395', src: 'Jira', title: 'Checkout feature flag cleanup', type: 'Standard', risk: 'Low', status: 'Completed', when: 'Thu 09:30', owner: 'Sofia Reyes', day: 4 },
  ];

  // ---- Jira project work (ServiceNow ticket queues too) ----
  const queues = [
    { label: 'Incidents (INC)', src: 'ServiceNow', open: 7, trend: '+2', tone: 'critical' },
    { label: 'Changes (CHG)', src: 'ServiceNow', open: 12, trend: '+1', tone: 'warning' },
    { label: 'Requests (RITM)', src: 'ServiceNow', open: 34, trend: '−5', tone: 'info' },
    { label: 'Problems (PRB)', src: 'ServiceNow', open: 4, trend: '0', tone: 'info' },
    { label: 'Sprint stories', src: 'Jira', open: 28, trend: '+3', tone: 'accent' },
    { label: 'Bugs', src: 'Jira', open: 9, trend: '−2', tone: 'warning' },
  ];
  const sprint = {
    name: 'SRE Sprint 41', ends: '4 days left', done: 19, inProgress: 6, todo: 11,
    items: [
      { key: 'OPS-2391', title: 'Auto-scale Ledger DB replicas on pool saturation', status: 'In Progress', who: 'Dana Liu', pts: 5 },
      { key: 'OPS-2388', title: 'SSO cache warmup on deploy', status: 'In Review', who: 'Tom Okafor', pts: 3 },
      { key: 'OPS-2402', title: 'Catalog autoscaling policy', status: 'In Progress', who: 'Ken Adachi', pts: 2 },
      { key: 'OPS-2377', title: 'Alert routing: dedupe Grafana + Datadog', status: 'To Do', who: 'Priya Nair', pts: 8 },
    ],
  };

  // ---- Grafana panels (metrics view) ----
  const panels = [
    { id: 'p1', title: 'Request rate', service: 'Checkout API', unit: 'req/s', data: series(60, 1200, 180, 21), color: 'accent', value: '1.18k' },
    { id: 'p2', title: 'Error rate', service: 'Checkout API', unit: '%', data: series(60, 2.4, 1.6, 4), color: 'critical', value: '5.2%' },
    { id: 'p3', title: 'p99 latency', service: 'Checkout API', unit: 'ms', data: series(60, 320, 70, 8), color: 'warning', value: '446ms' },
    { id: 'p4', title: 'Saturation (CPU)', service: 'Payments Gateway', unit: '%', data: series(60, 62, 14, 15), color: 'accent', value: '71%' },
    { id: 'p5', title: 'DB connections', service: 'Ledger DB', unit: 'conns', data: series(60, 180, 40, 33), color: 'warning', value: '236' },
    { id: 'p6', title: 'Apdex score', service: 'Checkout API', unit: '', data: series(60, 0.94, 0.06, 2).map(v => Math.min(1, v)), color: 'ok', value: '0.88' },
  ];

  // ---- Jira sprint board (project work) ----
  const jiraBoard = {
    sprint: { name: 'SRE Sprint 41', goal: 'Harden checkout DB resilience & cut alert noise', range: 'Jun 2 – Jun 13', left: '4 days left', committed: 45, completed: 17, burndown: series(11, 45, 6, 17).map((v, i) => Math.max(0, Math.round(45 - i * 3.2))) },
    columns: [
      { id: 'todo', name: 'To Do', cards: [
        { key: 'OPS-2377', type: 'Story', title: 'Alert routing: dedupe Grafana + Datadog signals', pts: 8, who: 'Priya Nair', priority: 'High', labels: ['alerting'] },
        { key: 'OPS-2415', type: 'Task', title: 'Add SLO burn-rate alerts for Catalog API', pts: 3, who: 'Ken Adachi', priority: 'Medium', labels: ['slo'] },
        { key: 'OPS-2418', type: 'Bug', title: 'Cart service flaky integration test in CI', pts: 2, who: 'Sofia Reyes', priority: 'Low', labels: ['ci'] },
      ]},
      { id: 'inprogress', name: 'In Progress', cards: [
        { key: 'OPS-2391', type: 'Story', title: 'Auto-scale Ledger DB replicas on pool saturation', pts: 5, who: 'Dana Liu', priority: 'High', labels: ['reliability'], inc: 'INC-4821' },
        { key: 'OPS-2412', type: 'Bug', title: 'Cap startup connection count in Payments v4.2', pts: 3, who: 'Marcus Webb', priority: 'High', labels: ['payments'], inc: 'INC-4821' },
        { key: 'OPS-2402', type: 'Task', title: 'Catalog API autoscaling policy update', pts: 2, who: 'Ken Adachi', priority: 'Medium', labels: ['infra'] },
      ]},
      { id: 'inreview', name: 'In Review', cards: [
        { key: 'OPS-2388', type: 'Story', title: 'SSO auth-cache warmup on deploy', pts: 3, who: 'Tom Okafor', priority: 'Medium', labels: ['identity'], inc: 'INC-4818' },
        { key: 'OPS-2409', type: 'Task', title: 'Fraud engine canary dashboards', pts: 2, who: 'Lena Frost', priority: 'Low', labels: ['observability'] },
      ]},
      { id: 'done', name: 'Done', cards: [
        { key: 'OPS-2399', type: 'Story', title: 'Payments idempotency keys for retries', pts: 8, who: 'Marcus Webb', priority: 'High', labels: ['payments'] },
        { key: 'OPS-2395', type: 'Story', title: 'Checkout feature-flag cleanup', pts: 5, who: 'Sofia Reyes', priority: 'Medium', labels: ['checkout'] },
        { key: 'OPS-2380', type: 'Task', title: 'Postgres backup verification automation', pts: 3, who: 'Dana Liu', priority: 'Medium', labels: ['platform'] },
        { key: 'OPS-2375', type: 'Bug', title: 'Fix flapping SSO health check', pts: 1, who: 'Tom Okafor', priority: 'Low', labels: ['identity'] },
      ]},
    ],
    epics: [
      { name: 'Checkout resilience', done: 6, total: 11, color: '#6366f1' },
      { name: 'Alert noise reduction', done: 2, total: 7, color: '#0d9488' },
      { name: 'Identity hardening', done: 4, total: 5, color: '#e6562a' },
    ],
  };

  const kpis = {
    activeIncidents: 1,
    firingAlerts: alerts.filter(a => a.status === 'firing').length,
    servicesDegraded: services.filter(s => s.status !== 'healthy').length,
    sloAtRisk: slos.filter(s => s.budget < 25).length,
    mttrToday: '24m',
    deploysToday: 6,
  };

  // ---- AI copilot & insights ----
  const insights = [
    { id: 'ins-1', type: 'correlation', title: 'Checkout failures track the Payments v4.2 deploy', confidence: 92, sev: 'critical',
      body: 'Error rate began climbing 16 min after change CHG0048213 entered its window. Ledger DB pool saturation followed 4 min later.',
      evidence: ['CHG0048213 started 13:30', '5xx onset at 13:46', 'Ledger pool 100% by 13:50'],
      action: { label: 'Roll back CHG0048213', icon: 'undo' }, link: { screen: 'incident', params: { id: 'INC-4821' } } },
    { id: 'ins-2', type: 'prediction', title: 'Checkout error budget exhausts in ~3h 50m', confidence: 86, sev: 'warning',
      body: 'At the current burn rate (14× normal), the 99.95% availability SLO breaches before 18:15 today.',
      evidence: ['Burn rate 14× baseline', '18% budget remaining'],
      action: { label: 'View SLO', icon: 'activity' }, link: { screen: 'metrics' } },
    { id: 'ins-3', type: 'recommendation', title: 'Scale Ledger DB replicas 6 → 8', confidence: 81, sev: 'info',
      body: 'Two prior incidents with an identical pool-saturation signature resolved within 9 min after a replica scale-out.',
      evidence: ['Matches INC-4102 & INC-3987', 'Avg resolve 9m'],
      action: { label: 'Apply scale-out', icon: 'zap' }, link: { screen: 'metrics', params: { service: 'Ledger DB' } } },
    { id: 'ins-4', type: 'anomaly', title: 'Kafka fraud-events lag is 3.4σ above baseline', confidence: 74, sev: 'warning',
      body: 'Consumer lag has grown steadily for 74 min, independent of the checkout incident — worth a separate look.',
      evidence: ['Lag 10.2k vs ~1.8k baseline', 'Rising for 74m'],
      action: { label: 'Inspect Kafka', icon: 'activity' }, link: { screen: 'metrics' } },
  ];

  const copilotSuggestions = [
    'Summarize the active incident',
    'What changed before checkout broke?',
    'Draft a customer status update',
    'Who should I page next?',
    'Is any error budget at risk?',
  ];

  const incidentCopilot = {
    'INC-4821': {
      hypothesis: 'Ledger DB connection-pool exhaustion triggered by the Payments v4.2 deploy.',
      confidence: 92,
      summary: 'A Payments v4.2 deploy (CHG0048213) at 13:30 is the most likely trigger. Within 16 min, Checkout 5xx crossed 5% as the Ledger DB connection pool saturated. Blast radius is us-east-1 checkout — ~3.1% of sessions. Read replicas were scaled 3→6 at 14:04 and error rate is now trending down (5.2% → 2.1%).',
      actions: [
        { label: 'Roll back CHG0048213', tone: 'crit', icon: 'undo' },
        { label: 'Scale Ledger replicas 6 → 8', tone: 'accent', icon: 'zap' },
        { label: 'Draft status-page update', tone: 'neutral', icon: 'message' },
      ],
      similar: [
        { id: 'INC-4102', title: 'Ledger pool saturation after deploy', resolved: '9m', when: '3 weeks ago' },
        { id: 'INC-3987', title: 'Checkout 5xx — DB connections', resolved: '12m', when: '2 months ago' },
      ],
      draft: 'We are aware of an issue affecting checkout for some customers in the US region. Our engineering team has identified a likely cause and is actively working on a fix. Next update in 30 minutes.',
    },
    'INC-4818': {
      hypothesis: 'Cold auth cache after the SSO cert rotation drove transient p95 latency.',
      confidence: 71,
      summary: 'Identity / SSO p95 login latency briefly exceeded 250ms following the cert rotation (CHG0048199). A cache warmup mitigated it and the service has held under target for 2h. Low ongoing risk.',
      actions: [
        { label: 'Mark resolved', tone: 'accent', icon: 'check' },
        { label: 'Add cache warmup to runbook', tone: 'neutral', icon: 'message' },
      ],
      similar: [{ id: 'INC-3801', title: 'SSO latency after cert rotation', resolved: '18m', when: '4 months ago' }],
      draft: 'Login latency has returned to normal. We will continue monitoring and close this incident shortly.',
    },
  };

  // RCA / postmortem drafts (auto-generated by Copilot on resolve)
  const rca = {
    'INC-4821': {
      detectedBy: 'Grafana alert — Checkout API error rate > 1%',
      severity: 'SEV1',
      impact: '~3.1% of checkout sessions in us-east-1 failed over the incident window. No data loss; no successful charges were double-processed.',
      executiveSummary: 'A Payments Gateway v4.2 deploy (CHG0048213) opened more database connections on startup than the Ledger DB pool was provisioned for. The pool saturated within ~20 minutes, causing checkout authorization calls to fail with 5xx errors. Scaling Ledger read replicas from 3 to 6 relieved pressure and restored service. Total customer-impacting time was contained to the checkout path in a single region.',
      rootCause: 'Ledger DB connection-pool exhaustion. Payments v4.2 establishes a larger connection pool per instance on boot; the rolling deploy multiplied this across 18 instances faster than the Ledger DB could absorb, exhausting available connections and stalling checkout authorization.',
      contributingFactors: [
        'Ledger DB connection pool was sized for steady-state load, not deploy-time connection churn.',
        'Payments v4.2 increased per-instance connection count without a corresponding Ledger DB review.',
        'No automated circuit breaker on pool saturation — mitigation was manual.',
      ],
      resolution: [
        'Scaled Ledger DB read replicas 3 → 6 at 14:04 to expand available connections.',
        'Connection pressure relieved; checkout error rate fell 5.2% → 2.1% within 8 minutes.',
        'CHG0048213 flagged for a connection-budget fix before any re-deploy.',
      ],
      actionItems: [
        { task: 'Add pool-saturation autoscaling to Ledger DB', owner: 'Dana Liu', due: 'Jun 9', jira: 'OPS-2391', priority: 'High' },
        { task: 'Cap startup connection count in Payments v4.2', owner: 'Marcus Webb', due: 'Jun 7', jira: 'OPS-2412', priority: 'High' },
        { task: 'Add deploy-aware alert suppression + connection budget check to CAB', owner: 'Priya Nair', due: 'Jun 12', jira: 'OPS-2377', priority: 'Medium' },
      ],
      lessons: [
        'Deploys touching Tier-1 datastores need a connection-budget review in the change ticket.',
        'Read-replica scale-out is a fast, low-risk mitigation for connection-pool saturation.',
      ],
    },
    'INC-4818': {
      detectedBy: 'Grafana alert — Identity / SSO p95 latency > 150ms',
      severity: 'SEV3',
      impact: 'Login p95 latency briefly exceeded 250ms. No failed logins; users experienced slightly slower sign-in for ~12 minutes.',
      executiveSummary: 'A scheduled SSO certificate rotation (CHG0048199) invalidated the auth cache, forcing cold lookups and a short latency spike. A cache warmup restored normal latency and the service has held under target since.',
      rootCause: 'Cold auth cache following the certificate rotation, leading to transient lookup latency.',
      contributingFactors: ['Cert rotation did not pre-warm the auth cache.', 'No staged warmup step in the rotation runbook.'],
      resolution: ['Triggered manual cache warmup.', 'p95 latency returned under 150ms within minutes.'],
      actionItems: [
        { task: 'Add cache warmup step to cert-rotation runbook', owner: 'Tom Okafor', due: 'Jun 10', jira: 'OPS-2388', priority: 'Medium' },
      ],
      lessons: ['Cache-invalidating maintenance should include a warmup step before traffic resumes.'],
    },
  };

  // grounding context for the live copilot
  const buildContext = () => {
    const firing = alerts.filter(a => a.status === 'firing');
    return [
      'You are O11Y Copilot, the AI assistant inside an SRE command center. Be concise, concrete and action-oriented. Use short paragraphs or tight bullet lists. Never invent data beyond what is given.',
      '',
      'CURRENT STATE (production, us-east-1, time 14:23):',
      'Active incidents: ' + incidents.map(i => `${i.id} ${i.severity} "${i.title}" status=${i.status}, services=[${i.services.join(', ')}], IC=${i.commander}`).join(' | '),
      'Firing alerts (' + firing.length + '): ' + firing.map(a => `${a.title} [${a.source}/${a.service}]`).join('; '),
      'Degraded services: ' + services.filter(s => s.status !== 'healthy').map(s => `${s.name} (${s.status})`).join(', '),
      'SLOs at risk: ' + slos.filter(s => s.budget < 25).map(s => `${s.service} ${s.name} budget=${s.budget}%`).join(', '),
      'Recent/active changes: ' + changes.filter(c => ['In Progress', 'Scheduled'].includes(c.status)).map(c => `${c.id} "${c.title}" ${c.status} risk=${c.risk}`).join('; '),
      'On-call now: ' + onCallNow.map(o => `${o.team}=${o.primary}(2nd ${o.secondary})`).join(', '),
      'Key correlation: CHG0048213 (Payments v4.2 deploy) began 13:30; checkout 5xx onset 13:46; Ledger DB pool saturated.',
    ].join('\n');
  };

  const ai = { insights, copilotSuggestions, incidentCopilot, buildContext, rca };

  window.DB = {
    now, fmtAgo, fmtTime, series,
    services, slos, incidents, alerts, alertSources,
    people, onCallNow, rotationDays, rotation, escalation,
    changes, queues, sprint, panels, kpis, ai, jiraBoard,
  };
})();
