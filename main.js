/* Vamsikrishna Gollapudi — portfolio interactions. No dependencies. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) { var e = document.createElementNS(SVGNS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }

  /* ---------------- Theme ---------------- */
  var themeBtn = $('#theme-toggle');
  function syncThemeBtn() {
    var light = doc.getAttribute('data-theme') === 'light';
    themeBtn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    var m = $('meta[name="theme-color"]'); if (m) m.setAttribute('content', light ? '#f6f8fc' : '#0b1220');
  }
  themeBtn.addEventListener('click', function () {
    var next = doc.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    doc.setAttribute('data-theme', next);
    try { localStorage.setItem('vg-theme', next); } catch (e) {}
    syncThemeBtn();
  });
  syncThemeBtn();

  /* ---------------- Navigation ---------------- */
  var header = $('.site-header'), navLinks = $('#nav-links'), navToggle = $('#nav-toggle');
  function setMenu(open) {
    navLinks.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    navToggle.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu');
  }
  navToggle.addEventListener('click', function () { setMenu(!navLinks.classList.contains('open')); });
  navLinks.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) { setMenu(false); navToggle.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (navLinks.classList.contains('open') && !e.target.closest('.nav')) setMenu(false);
  });
  var progress = $('#scroll-progress');
  var onScroll = function () {
    header.classList.toggle('scrolled', window.scrollY > 8);
    if (progress) { var max = document.documentElement.scrollHeight - window.innerHeight; progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')'; }
  };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Active section indicator
  var navMap = {};
  $$('a[data-nav]').forEach(function (a) { navMap[a.getAttribute('href').slice(1)] = a; });
  var sectionIds = ['about', 'expertise', 'experience', 'work', 'lab', 'ops', 'certifications', 'contact'];
  var aliases = { achievements: 'expertise' };
  function updateActive() {
    var y = window.scrollY + (header.offsetHeight + 120), current = 'home';
    $$('main > section[id]').forEach(function (s) { if (s.offsetTop <= y) current = s.id; });
    if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight - 4) current = 'contact';
    current = aliases[current] || current;
    sectionIds.forEach(function (id) {
      var a = navMap[id]; if (!a) return;
      var on = id === current; a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  var ticking = false;
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { updateActive(); ticking = false; }); } }, { passive: true });
  window.addEventListener('resize', updateActive); updateActive();

  /* ---------------- Reveal ---------------- */
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else { $$('.reveal').forEach(function (el) { el.classList.add('in'); }); }
  doc.classList.add('reveal-ready');

  /* ---------------- Counters (final value always in HTML) ---------------- */
  function animateCount(el) {
    var target = parseFloat(el.dataset.count), dec = parseInt(el.dataset.decimals || '0', 10);
    var pre = el.dataset.prefix || '', suf = el.dataset.suffix || '', finalText = el.textContent;
    var start = performance.now(), dur = 1100;
    (function step(now) {
      var p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
      var v = target * e;
      // for high-precision percentages, ease from a sensible floor so it doesn't read as an outage
      if (dec > 0 && target > 90) v = 99 + (target - 99) * e;
      el.textContent = p < 1 ? pre + v.toFixed(dec) + suf : finalText;
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { animateCount(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach(function (el) { cio.observe(el); });
  }

  /* ---------------- Copy email ---------------- */
  var toast = $('#copy-toast'), toastTimer;
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.dataset.copy;
      var done = function (ok) {
        toast.textContent = ok ? 'Email copied to clipboard' : 'Copy failed — ' + text;
        toast.classList.add('show'); clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallbackCopy(text)); });
      else done(fallbackCopy(text));
    });
  });
  function fallbackCopy(t) {
    var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); return ok;
  }
  var yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();

  /* =========================================================
     CASE STUDIES — facts from resume; diagrams illustrative
     ========================================================= */
  var CASES = [
    {
      id: 'landing-zone', kicker: 'Azure Infrastructure · Governance', title: 'Enterprise Azure Landing Zone',
      summary: 'A governed multi-subscription Azure foundation spanning compute, networking, identity and shared services.',
      context: 'Nexamatic · Clients: IQVIA, Adamas (Life Sciences)',
      metrics: [['8', 'Azure subscriptions'], ['600+', 'Resources managed'], ['99.95%', 'Platform availability'], ['25+', 'Terraform / Bicep modules']],
      tags: ['Terraform', 'Bicep', 'Azure Policy', 'Management Groups', 'RBAC', 'Defender for Cloud'],
      challenge: 'Life-sciences workloads needed a single, auditable Azure foundation: consistent networking and identity across many subscriptions, guardrails that hold without slowing teams down, and infrastructure that can be rebuilt from code.',
      flow: ['Management groups', 'Subscriptions', 'Hub network', 'Spoke workloads', 'Shared services', 'Policy & RBAC', 'Monitoring'],
      approach: [
        'Designed and operated the landing zone across 8 subscriptions and 600+ resources covering compute, networking, identity and shared services.',
        'Authored 25+ versioned Terraform modules and Bicep templates with remote state, policy checks and nightly drift detection.',
        'Defined tenant-wide governance — management groups, custom RBAC roles and a tagging standard.',
        'Worked down Microsoft Defender for Cloud recommendations as an engineering backlog rather than a one-off audit.'
      ],
      impact: ['99.95% platform availability sustained.', '100% of environments under Infrastructure as Code.', 'Defender for Cloud Secure Score raised from 62% to 85%.', '98% tagging compliance; two client audits passed without major findings.'],
      considerations: ['Version modules and pin them per environment so a change can be promoted, not broadcast.', 'Drift detection only helps if someone owns the alert — route it to a queue with an owner.', 'Tagging standards pay off in cost allocation and incident ownership, not just compliance.']
    },
    {
      id: 'cicd', kicker: 'CI/CD · Platform Migration', title: 'Enterprise CI/CD Modernization',
      summary: 'Moving ~120 repositories and 45 teams from Azure Repos to GitHub Enterprise with near-zero disruption.',
      context: 'Nexamatic · Clients: IQVIA, Adamas (Life Sciences)',
      metrics: [['~120', 'Repositories migrated'], ['45', 'Teams onboarded'], ['< 30 min', 'Total developer downtime'], ['60+', 'Pipelines converted']],
      tags: ['GitHub Enterprise', 'GitHub Actions', 'Azure Pipelines', 'YAML templates', 'CODEOWNERS', 'SAST'],
      challenge: 'Dozens of teams depended on classic release pipelines and Azure Repos. The move had to preserve history and delivery flow, raise review and security standards, and avoid stalling development.',
      flow: ['Developer commit', 'Pull request', 'Security scanning', 'Build', 'Artifact', 'Approval', 'Deployment', 'Monitoring'],
      approach: [
        'Led the repository migration for ~120 repos and 45 teams, keeping total developer downtime under 30 minutes.',
        'Standardized branch protection and CODEOWNERS across repositories.',
        'Converted 60+ classic release pipelines into GitHub Actions workflows and reusable multi-stage Azure DevOps YAML templates.',
        'Embedded SAST, container image scanning, secret detection and Key Vault integration into the pipelines.'
      ],
      impact: ['100% pull-request review coverage.', 'New-service onboarding cut from ~3 days to under 4 hours.', '200+ vulnerable builds blocked before production.'],
      considerations: ['Migrate in batches by team, with a dry run and a rollback path per batch.', 'Reusable templates turn standards into defaults — teams adopt what is easiest.', 'Security gates must be fast and explainable or engineers will route around them.']
    },
    {
      id: 'aks', kicker: 'Kubernetes · Reliability', title: 'Production AKS Operations',
      summary: 'Running six production AKS clusters with upgrades that customers never notice.',
      context: 'Nexamatic · Clients: IQVIA, Adamas (Life Sciences)',
      metrics: [['6', 'Production AKS clusters'], ['180+', 'Nodes'], ['300+', 'Pods'], ['0', 'Customer-facing upgrade outages']],
      tags: ['AKS', 'Helm', 'NGINX Ingress', 'HPA', 'Cluster Autoscaler', 'ACR', 'Prometheus'],
      challenge: 'Keep a fleet of production clusters current with Kubernetes and node-image upgrades every quarter, while workloads keep serving traffic and scale with demand.',
      flow: ['Ingress (NGINX)', 'Services', 'Deployments', 'Pods', 'HPA', 'Cluster Autoscaler', 'Prometheus / Grafana'],
      approach: [
        'Operated 6 production AKS clusters (180+ nodes, 300+ pods) with Helm-managed releases.',
        'Routed traffic through NGINX Ingress; scaled workloads with the Horizontal Pod Autoscaler and node pools with Cluster Autoscaler.',
        'Delivered quarterly Kubernetes and node-pool upgrades as planned, repeatable operations.',
        'Integrated cluster and workload telemetry into Prometheus, Grafana and Azure Monitor.'
      ],
      impact: ['Quarterly Kubernetes and node-pool upgrades with zero customer-facing outages.', 'Workload and node scaling handled automatically rather than by ticket.'],
      considerations: ['Pod disruption budgets and readiness probes are what make rolling upgrades safe.', 'Upgrade one non-production cluster first and watch it for a full business cycle.', 'Set requests and limits from observed usage — HPA and autoscaler decisions depend on them.']
    },
    {
      id: 'sre', kicker: 'SRE · Observability', title: 'SRE Observability & Incident Response',
      summary: 'An SRE practice built on SLOs, actionable alerts, runbooks and blameless reviews.',
      context: 'Nexamatic · Clients: IQVIA, Adamas (Life Sciences)',
      metrics: [['~35%', 'MTTR reduction'], ['150+', 'Alert rules'], ['40%', 'Less alert noise'], ['40+', 'Runbooks']],
      tags: ['Prometheus', 'Grafana', 'Azure Monitor', 'Log Analytics', 'KQL', 'Splunk', 'SLOs'],
      challenge: 'Noisy alerts and inconsistent triage were slowing recovery. The team needed signals tied to user impact, clear escalation, and a habit of learning from every incident.',
      flow: ['Detection', 'Alert', 'Triage', 'Mitigation', 'Recovery', 'RCA', 'Preventive action'],
      approach: [
        'Built the SRE practice on SLIs, SLOs, error budgets and 40+ runbooks; improved triage and escalation.',
        'Implemented Prometheus, Grafana, Azure Monitor and Log Analytics dashboards with 150+ alert rules, routing logs to Splunk.',
        'Ran blameless post-incident reviews and the on-call rotation for a 10-member team.',
        'Published 30+ architecture notes and operational guides.'
      ],
      impact: ['MTTR reduced by ~35%.', 'Alert noise cut by 40%.', '90% of corrective actions closed within 30 days.', 'Recurring L2 escalations reduced by 25%; 4 junior engineers mentored.'],
      considerations: ['Page on symptoms users feel; send causes to dashboards and tickets.', 'Every page should link to a runbook — if there is no action, it should not page.', 'Track corrective actions to closure, or the same incident comes back.']
    },
    {
      id: 'migration', kicker: 'Cloud Migration', title: 'Azure Cloud Migration',
      summary: 'Rehosting 160+ on-premises servers to Azure in planned waves with zero data loss.',
      context: 'Cognizant (Bayer) and UST Global (Schroders)',
      metrics: [['160+', 'Servers migrated'], ['98%', 'First-attempt cutover success'], ['11', 'Migration waves'], ['0', 'Data loss']],
      tags: ['Azure Migrate', 'Azure Site Recovery', 'Azure Backup', 'Wave planning', 'Runbooks', 'VPN'],
      challenge: 'Move a mixed Windows and Linux estate to Azure without data loss or business disruption, coordinating many application owners and dependencies.',
      flow: ['Discovery', 'Dependency mapping', 'Wave planning', 'Replication', 'Cutover', 'Validation', 'Rollback readiness'],
      approach: [
        'Bayer: assessed 180+ servers and dependencies with Azure Migrate; planned 6 waves with cutover and rollback runbooks; led a 5-member team through the lift-and-shift of 120 servers.',
        'Bayer: set up landing-zone foundations — 12 virtual networks, 2 site-to-site VPN tunnels, storage and identity sync for 5,000+ AD accounts.',
        'Schroders: rehosted 45 servers using Azure Migrate and Azure Site Recovery across 5 waves.',
        'Schroders: implemented Azure Backup and ASR for 60 critical workloads.'
      ],
      impact: ['98% first-attempt cutover success with 20+ application owners (Bayer).', 'Zero data loss across the Schroders waves.', '4-hour RTO and 15-minute RPO met in semi-annual DR drills.', '40 legacy servers decommissioned — an estimated 15% data-center hosting saving.'],
      considerations: ['Dependency mapping decides wave composition — move things that talk to each other together.', 'A rollback runbook you have rehearsed is what makes a cutover window calm.', 'Application-owner sign-off is part of the cutover, not after it.']
    },
    {
      id: 'finops', kicker: 'FinOps · Cost Optimization', title: 'Azure Cost Optimization',
      summary: 'Reducing Azure spend through utilization-driven right-sizing and automated scale-down.',
      context: 'UST Global (Schroders) and Nexamatic',
      metrics: [['~18%', 'Lower monthly Azure spend'], ['22%', 'Lower non-prod compute cost'], ['~20 h', 'Engineer-hours saved / month']],
      tags: ['Azure Monitor', 'Right-sizing', 'Storage tiers', 'Azure Functions', 'Logic Apps', 'Tagging'],
      challenge: 'Spend had grown with the estate. Savings needed to come from evidence — utilization data — without affecting production performance, and stay saved through automation.',
      flow: ['Cost visibility', 'Utilization analysis', 'Optimization decisions', 'Automation', 'Cost outcomes'],
      approach: [
        'UST Global: right-sized virtual machines and storage tiers based on utilization analysis.',
        'Nexamatic: automated non-production scale-down, certificate-expiry alerts and ticket creation with Azure Functions and Logic Apps.',
        'Used tagging standards (98% compliance at Nexamatic) to attribute cost to owners.'
      ],
      impact: ['~18% lower monthly Azure spend (UST Global).', '22% lower non-production compute cost (Nexamatic).', '~20 engineer-hours saved every month (Nexamatic).'],
      considerations: ['Right-size from p95 utilization over weeks, not a single day.', 'Scale-down schedules need an easy, audited override for late-night testing.', 'Cost without ownership tags is just a number — tag first.']
    }
  ];

  var CASE_EXTRA = {
    'landing-zone': { diagram: 'azure', color: 'azure',
      solutions: ['Guardrails assigned at management-group scope instead of per subscription.', 'Every environment rebuilt from versioned Terraform / Bicep modules with remote state.', 'Nightly drift detection surfaces out-of-band changes before they become incidents.'],
      ops: ['Policy checks in the module pipelines; management groups, custom RBAC roles and a tagging standard.', 'Defender for Cloud recommendations worked as an owned backlog — Secure Score 62% → 85%.', 'Nightly drift detection across 100% of IaC-managed environments.', '99.95% platform availability sustained.'] },
    'cicd': { diagram: 'cicd', color: 'aws',
      solutions: ['Repositories moved in batches by team to keep total downtime under 30 minutes.', 'Reusable workflow and YAML templates made the secure path the default path.', 'Branch protection and CODEOWNERS enforced review on every repository.'],
      ops: ['SAST, container image scanning and secret detection on every build.', 'Secrets resolved from Azure Key Vault at runtime — none stored in pipelines.', '100% pull-request review coverage via branch protection and CODEOWNERS.', '200+ vulnerable builds stopped before production.'] },
    'aks': { diagram: 'aks', color: 'k8s',
      solutions: ['Quarterly Kubernetes and node-pool upgrades run as planned, repeatable operations.', 'HPA scales workloads; Cluster Autoscaler adds and removes nodes behind it.', 'Helm-managed releases give a versioned rollback path.'],
      ops: ['Cluster and workload telemetry in Prometheus, Grafana and Azure Monitor.', 'NGINX Ingress as the single traffic entry point for workloads.', 'Images pulled from Azure Container Registry.', 'Zero customer-facing outages across quarterly upgrades.'] },
    'sre': { diagram: 'sre', color: 'obs',
      solutions: ['Alerting rebuilt around SLIs and SLOs so pages reflect user impact.', 'Every recurring failure mode documented as a runbook (40+).', 'Blameless post-incident reviews with tracked corrective actions.'],
      ops: ['150+ alert rules across Prometheus, Grafana, Azure Monitor and Log Analytics; logs routed to Splunk.', 'SLIs, SLOs and error budgets as the basis for paging.', 'On-call rotation for a 10-member team.', '90% of corrective actions closed within 30 days.'] },
    'migration': { diagram: null, color: 'azure',
      solutions: ['Azure Migrate assessment of 180+ servers drove wave composition.', 'Cutover and rollback runbooks prepared for every wave.', 'Validation coordinated with 20+ application owners as part of each cutover.'],
      ops: ['Azure Backup and Azure Site Recovery for 60 critical workloads.', '4-hour RTO and 15-minute RPO met in semi-annual DR drills.', 'Site-to-site VPN and identity sync for 5,000+ AD accounts.', 'Zero data loss across the Schroders waves.'] },
    'finops': { diagram: null, color: 'auto',
      solutions: ['Right-sizing decisions based on utilization analysis, not guesswork.', 'Non-production scale-down automated with Azure Functions and Logic Apps.', 'Tagging standard used to attribute spend to owners.'],
      ops: ['98% tagging compliance for cost ownership (Nexamatic).', 'Automated certificate-expiry alerts and ticket creation.', 'Production performance preserved — savings from utilization evidence.', '~20 engineer-hours saved every month.'] }
  };
  CASES.forEach(function (c) { var x = CASE_EXTRA[c.id] || {}; for (var k in x) c[k] = x[k]; });

  var grid = $('#cs-grid'), modal = $('#cs-modal'), modalBody = $('#cs-modal-body'), lastTrigger = null;
  if (grid) {
    grid.innerHTML = CASES.map(function (c, i) {
      return '<article class="cs-card reveal" style="--c: var(--' + c.color + ')">' +
        '<span class="cs-kicker">' + esc(c.kicker) + '</span><h3>' + esc(c.title) + '</h3><p>' + esc(c.summary) + '</p>' +
        '<span class="cs-metrics">' + c.metrics.slice(0, 2).map(function (m) { return '<span><b>' + esc(m[0]) + '</b><span>' + esc(m[1]) + '</span></span>'; }).join('') + '</span>' +
        '<span class="chips chips-sm">' + c.tags.slice(0, 4).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</span>' +
        '<span class="cs-actions"><button type="button" class="btn btn-sm btn-secondary" data-cs="' + i + '" aria-haspopup="dialog">Case study<svg class="ic"><use href="#i-arrow"/></svg></button>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-present="' + i + '" aria-haspopup="dialog" aria-label="Present architecture: ' + esc(c.title) + '"><svg class="ic"><use href="#i-present"/></svg>Present</button></span></article>';
    }).join('');
    $$('.cs-card', grid).forEach(function (el) {
      if (reduceMotion || !('IntersectionObserver' in window)) el.classList.add('in'); else if (io) io.observe(el);
    });
    $$('[data-cs]', grid).forEach(function (b) { b.addEventListener('click', function () { openCase(+b.dataset.cs, b); }); });
    $$('[data-present]', grid).forEach(function (b) { b.addEventListener('click', function () { if (window.VGPresent) window.VGPresent(+b.dataset.present, b); }); });
  }
  function list(arr) { return '<ul>' + arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
  function openCase(i, trigger) {
    var c = CASES[i]; lastTrigger = trigger;
    modalBody.innerHTML =
      '<div class="csm-top"><div><p class="cs-kicker">' + esc(c.kicker) + '</p><h2 id="cs-modal-title">' + esc(c.title) + '</h2></div>' +
      '<button type="button" class="icon-btn csm-close" aria-label="Close case study"><svg class="ic"><use href="#i-x"/></svg></button></div>' +
      '<p class="csm-ctx">' + esc(c.context) + '</p>' +
      '<div class="csm-metrics">' + c.metrics.map(function (m) { return '<div><b>' + esc(m[0]) + '</b><span>' + esc(m[1]) + '</span></div>'; }).join('') + '</div>' +
      '<div class="csm-sec"><h3>Engineering challenge</h3><p>' + esc(c.challenge) + '</p></div>' +
      '<div class="csm-sec"><h3>Architecture / workflow <span class="csm-badge">Illustrative reference architecture</span></h3><div class="csm-flow">' +
      c.flow.map(function (s, k) { return (k ? '<span class="arr" aria-hidden="true">→</span>' : '') + '<span class="step">' + esc(s) + '</span>'; }).join('') + '</div></div>' +
      '<div class="csm-two"><div class="csm-sec"><h3>Implementation approach</h3>' + list(c.approach) + '</div>' +
      '<div class="csm-sec"><h3>Measurable impact</h3>' + list(c.impact) + '</div></div>' +
      '<div class="csm-sec"><h3>Operational considerations</h3>' + list(c.considerations) + '</div>' +
      '<div class="csm-sec"><h3>Technology</h3><div class="chips chips-sm">' + c.tags.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div></div>' +
      '<div class="csm-foot"><button type="button" class="btn btn-primary btn-sm" id="csm-present"><svg class="ic"><use href="#i-present"/></svg>Present architecture</button></div>';
    $('.csm-close', modalBody).addEventListener('click', closeCase);
    $('#csm-present', modalBody).addEventListener('click', function () { var t = lastTrigger; closeCase(); if (window.VGPresent) window.VGPresent(i, t); });
    if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', '');
    modal.scrollTop = 0; $('.csm-close', modalBody).focus();
  }
  function closeCase() { if (modal.open) { if (modal.close) modal.close(); else modal.removeAttribute('open'); } }
  if (modal) {
    modal.addEventListener('click', function (e) { if (e.target === modal) closeCase(); });
    modal.addEventListener('close', function () { if (lastTrigger) lastTrigger.focus(); });
  }

  /* =========================================================
     ARCHITECTURE LAB
     ========================================================= */
  var KINDS = {
    entry: { label: 'Entry / users', color: '#94a3b8' },
    network: { label: 'Network & edge', color: '#3b82f6' },
    compute: { label: 'Compute / workloads', color: '#06b6d4' },
    data: { label: 'Data & artifacts', color: '#8b5cf6' },
    security: { label: 'Identity & security', color: '#f59e0b' },
    observe: { label: 'Observability', color: '#10b981' },
    process: { label: 'Process step', color: '#64748b' }
  };
  var DIAGRAMS = [
    {
      id: 'azure', tab: 'Azure Enterprise', applied: true, cols: 5, rows: 3,
      intro: 'A typical regulated-enterprise web platform: traffic enters through a WAF-protected gateway, workloads run on PaaS, AKS and VM scale sets, and identity, policy and monitoring wrap every layer.',
      nodes: [
        { id: 'users', c: 0, r: 1, l: 'Users', s: 'internet / corp', k: 'entry', d: 'External customers and internal staff reaching the platform over HTTPS.', w: 'All entry is through a single, inspected path — no workload is publicly exposed directly.' },
        { id: 'entra', c: 0, r: 0, l: 'Entra ID', s: 'SSO · Cond. Access', k: 'security', d: 'Identity provider for users and workloads. Conditional Access enforces MFA and device posture.', w: 'Managed identities remove stored credentials between services.' },
        { id: 'policy', c: 0, r: 2, l: 'Azure Policy', s: 'mgmt groups · RBAC', k: 'security', d: 'Guardrails assigned at management-group scope: allowed regions, required tags, denied public IPs.', w: 'Prevents drift before it happens instead of reporting it afterwards.' },
        { id: 'dns', c: 1, r: 0, l: 'Azure DNS', s: 'public + private', k: 'network', d: 'Public zones for the front door; private DNS zones resolve private endpoints inside the VNets.', w: 'Private DNS misconfiguration is a classic cause of “works from my laptop” outages.' },
        { id: 'agw', c: 1, r: 1, l: 'App Gateway', s: 'WAF v2 · L7', k: 'network', d: 'Layer-7 load balancer with Web Application Firewall, TLS termination and path-based routing.', w: 'Health probes here are the first signal that a backend pool is unhealthy.' },
        { id: 'nsg', c: 1, r: 2, l: 'Hub VNet', s: 'NSG · peering · VPN', k: 'network', d: 'Hub-and-spoke network: shared connectivity in the hub, workloads in peered spokes, NSGs on every subnet.', w: 'Segmentation limits blast radius and makes traffic flows auditable.' },
        { id: 'app', c: 2, r: 0, l: 'App Service', s: 'web front end', k: 'compute', d: 'Managed PaaS hosting for web front ends with deployment slots for zero-downtime swaps.', w: 'Slot swaps give an instant rollback path.' },
        { id: 'aks', c: 2, r: 1, l: 'AKS', s: 'microservices', k: 'compute', d: 'Managed Kubernetes for containerized APIs and services.', w: 'See the AKS tab for what runs inside.' },
        { id: 'vmss', c: 2, r: 2, l: 'VM Scale Sets', s: 'legacy / batch', k: 'compute', d: 'Autoscaling virtual machines for workloads not yet containerized.', w: 'Image-based scale sets keep fleet configuration consistent.' },
        { id: 'sql', c: 3, r: 0, l: 'Azure SQL', s: 'private endpoint', k: 'data', d: 'Managed relational database reached only over a private endpoint.', w: 'Geo-replication and point-in-time restore underpin the recovery objectives.' },
        { id: 'stg', c: 3, r: 1, l: 'Storage', s: 'blob · files', k: 'data', d: 'Object and file storage with lifecycle tiers for cost control.', w: 'Lifecycle tiering is one of the simplest FinOps wins.' },
        { id: 'kv', c: 3, r: 2, l: 'Key Vault', s: 'secrets · certs', k: 'security', d: 'Central store for secrets, keys and certificates, accessed via managed identity.', w: 'Certificate-expiry alerts on Key Vault prevent self-inflicted outages.' },
        { id: 'mon', c: 4, r: 0, l: 'Azure Monitor', s: 'metrics · alerts', k: 'observe', d: 'Platform metrics and alert rules routed to on-call through action groups.', w: 'Alerts are tied to SLOs so a page means user impact.' },
        { id: 'law', c: 4, r: 1, l: 'Log Analytics', s: 'KQL', k: 'observe', d: 'Central log workspace queried with KQL for investigation and dashboards.', w: 'One workspace per environment keeps queries and retention predictable.' },
        { id: 'def', c: 4, r: 2, l: 'Defender', s: 'for Cloud', k: 'security', d: 'Posture management and threat protection; Secure Score tracks hardening progress.', w: 'Treat recommendations as an engineering backlog with owners.' }
      ],
      edges: [['users', 'dns'], ['users', 'agw'], ['dns', 'agw', 1], ['entra', 'users', 1], ['agw', 'app'], ['agw', 'aks'], ['agw', 'vmss'], ['nsg', 'agw', 1], ['app', 'sql'], ['aks', 'sql'], ['aks', 'stg'], ['aks', 'kv', 1], ['vmss', 'stg'], ['app', 'kv', 1], ['policy', 'nsg', 1], ['sql', 'mon', 1], ['stg', 'law', 1], ['kv', 'def', 1], ['mon', 'law', 1]]
    },
    {
      id: 'cicd', tab: 'CI/CD Pipeline', applied: true, cols: 5, rows: 2,
      intro: 'A trunk-based delivery pipeline: every change is reviewed, built once, scanned, stored as an immutable artifact and promoted through gated environments.',
      nodes: [
        { id: 'git', c: 0, r: 0, l: 'GitHub', s: 'commit · branch', k: 'process', d: 'Developer pushes to a short-lived branch in GitHub Enterprise.', w: 'Branch protection and CODEOWNERS make review mandatory, not optional.' },
        { id: 'pr', c: 1, r: 0, l: 'Pull Request', s: 'review · checks', k: 'process', d: 'Required reviewers plus status checks must pass before merge.', w: 'Fast PR checks keep feedback under a few minutes.' },
        { id: 'build', c: 2, r: 0, l: 'Build', s: 'GitHub Actions', k: 'compute', d: 'Reusable workflow compiles and packages once; the same output is promoted everywhere.', w: 'Build once, deploy many — no rebuilds per environment.' },
        { id: 'test', c: 3, r: 0, l: 'Test', s: 'unit · quality gate', k: 'compute', d: 'Unit and integration tests plus a SonarQube quality gate.', w: 'Quality gates fail the build, not a report nobody reads.' },
        { id: 'scan', c: 4, r: 0, l: 'Security Scan', s: 'SAST · image · secrets', k: 'security', d: 'Static analysis, dependency and container image scanning, and secret detection.', w: 'Vulnerable builds are blocked before they become artifacts.' },
        { id: 'art', c: 4, r: 1, l: 'Artifact', s: 'ACR · Artifacts', k: 'data', d: 'Versioned, immutable image or package pushed to ACR or Azure Artifacts.', w: 'Versioned artifacts make rollback a redeploy of a known-good version.' },
        { id: 'appr', c: 3, r: 1, l: 'Approval', s: 'env protection', k: 'security', d: 'Environment protection rules require approval and change-ticket checks before production.', w: 'Gives auditors full traceability from commit to production.' },
        { id: 'deploy', c: 2, r: 1, l: 'Deploy', s: 'Helm · OIDC', k: 'compute', d: 'Helm upgrade to AKS using workload identity federation — no stored cloud secrets.', w: 'Rolling updates with readiness probes keep the service available.' },
        { id: 'mon', c: 1, r: 1, l: 'Monitor', s: 'SLO checks', k: 'observe', d: 'Post-deploy verification watches error rate and latency against SLOs.', w: 'Change is the most common cause of incidents — watch right after it.' },
        { id: 'rb', c: 0, r: 1, l: 'Rollback', s: 'helm rollback', k: 'process', d: 'If SLO checks fail, roll back to the previous release revision.', w: 'A rehearsed rollback beats a heroic forward-fix.' }
      ],
      edges: [['git', 'pr'], ['pr', 'build'], ['build', 'test'], ['test', 'scan'], ['scan', 'art'], ['art', 'appr'], ['appr', 'deploy'], ['deploy', 'mon'], ['mon', 'rb', 1]]
    },
    {
      id: 'aks', tab: 'AKS Platform', applied: true, cols: 5, rows: 3,
      intro: 'Inside a production AKS cluster: ingress routes to services, deployments manage pods, and autoscaling, secrets and telemetry support every workload.',
      nodes: [
        { id: 'acr', c: 0, r: 0, l: 'ACR', s: 'container images', k: 'data', d: 'Private registry; nodes pull images using the cluster’s managed identity.', w: 'Only scanned images from ACR are allowed to run.' },
        { id: 'helm', c: 1, r: 0, l: 'Helm', s: 'release mgmt', k: 'process', d: 'Charts template deployments, services and config; releases are versioned.', w: 'helm rollback restores the last good revision in seconds.' },
        { id: 'lb', c: 0, r: 1, l: 'Azure LB', s: 'public / internal', k: 'network', d: 'Azure load balancer in front of the ingress controller.', w: 'Often fronted by Application Gateway with WAF.' },
        { id: 'ing', c: 1, r: 1, l: 'NGINX Ingress', s: 'host / path routing', k: 'network', d: 'Routes HTTP traffic by host and path to Kubernetes services; terminates TLS.', w: 'Ingress metrics are the best source of user-facing latency SLIs.' },
        { id: 'kv', c: 0, r: 2, l: 'Key Vault', s: 'CSI driver', k: 'security', d: 'Secrets mounted into pods through the Secrets Store CSI driver.', w: 'No secrets in manifests or Helm values.' },
        { id: 'svcw', c: 2, r: 0, l: 'Service', s: 'web', k: 'network', d: 'Stable virtual IP and DNS name selecting the web pods.', w: 'Only ready pods receive traffic.' },
        { id: 'svca', c: 2, r: 2, l: 'Service', s: 'api', k: 'network', d: 'Stable virtual IP and DNS name selecting the API pods.', w: 'Readiness probes protect callers during rollouts.' },
        { id: 'prom', c: 2, r: 1, l: 'Prometheus', s: 'scrape · alert', k: 'observe', d: 'Scrapes pod, node and ingress metrics; feeds Grafana dashboards and alert rules.', w: 'Golden signals: latency, traffic, errors, saturation.' },
        { id: 'depw', c: 3, r: 0, l: 'Deployment', s: 'web · rolling', k: 'compute', d: 'Declares desired replicas and rolling-update strategy for the web tier.', w: 'maxUnavailable + PodDisruptionBudget keep capacity during upgrades.' },
        { id: 'depa', c: 3, r: 2, l: 'Deployment', s: 'api · rolling', k: 'compute', d: 'Declares desired replicas and rolling-update strategy for the API tier.', w: 'Requests and limits drive scheduling and autoscaling.' },
        { id: 'hpa', c: 3, r: 1, l: 'HPA', s: 'CPU / custom', k: 'compute', d: 'Horizontal Pod Autoscaler adjusts replica count from CPU or custom metrics.', w: 'Scale on what saturates first — often requests in flight, not CPU.' },
        { id: 'podw', c: 4, r: 0, l: 'Pods', s: 'web ×3+', k: 'compute', d: 'Running web containers spread across nodes and zones.', w: 'Topology spread constraints survive a zone loss.' },
        { id: 'poda', c: 4, r: 2, l: 'Pods', s: 'api ×N', k: 'compute', d: 'Running API containers scaled by the HPA.', w: 'Liveness probes restart stuck containers automatically.' },
        { id: 'ca', c: 4, r: 1, l: 'Cluster Autoscaler', s: 'node pools', k: 'compute', d: 'Adds nodes when pods are unschedulable; removes idle nodes.', w: 'Works with HPA: pods scale first, nodes follow.' }
      ],
      edges: [['lb', 'ing'], ['ing', 'svcw'], ['ing', 'svca'], ['svcw', 'depw'], ['svca', 'depa'], ['depw', 'podw'], ['depa', 'poda'], ['acr', 'helm', 1], ['helm', 'svcw', 1], ['kv', 'svca', 1], ['hpa', 'depw', 1], ['hpa', 'depa', 1], ['ca', 'podw', 1], ['ca', 'poda', 1], ['prom', 'hpa', 1]]
    },
    {
      id: 'sre', tab: 'SRE Incident Lifecycle', applied: true, cols: 4, rows: 2,
      intro: 'How an incident moves from signal to lasting improvement — and how the improvements feed back into SLOs, alerts and runbooks.',
      nodes: [
        { id: 'sig', c: 0, r: 0, l: 'Metrics & Logs', s: 'Prometheus · KQL', k: 'observe', d: 'SLIs measured continuously: availability, latency, error rate, saturation.', w: 'Measure what the user experiences, not just host health.' },
        { id: 'alert', c: 1, r: 0, l: 'Alerting', s: 'burn-rate rules', k: 'observe', d: 'Multi-window error-budget burn-rate alerts page only for real user impact.', w: 'This is where alert-noise reduction happens.' },
        { id: 'inc', c: 2, r: 0, l: 'Incident', s: 'declare · roles', k: 'process', d: 'On-call declares severity, opens a channel, assigns incident commander and comms.', w: 'Clear roles shorten the time to the first useful action.' },
        { id: 'inv', c: 3, r: 0, l: 'Investigation', s: 'what changed?', k: 'process', d: 'Correlate dashboards, logs and recent deployments; follow the runbook.', w: 'Recent change is the first suspect in most incidents.' },
        { id: 'mit', c: 3, r: 1, l: 'Mitigation', s: 'rollback · scale', k: 'compute', d: 'Stop the bleeding first: roll back, fail over, scale out or shed load.', w: 'Mitigate before root-causing — MTTR is about recovery.' },
        { id: 'pm', c: 2, r: 1, l: 'Postmortem', s: 'blameless RCA', k: 'process', d: 'Timeline, contributing factors and corrective actions — focused on systems, not people.', w: 'Blameless reviews surface the real contributing factors.' },
        { id: 'imp', c: 1, r: 1, l: 'Improvements', s: 'tracked actions', k: 'process', d: 'Corrective actions with owners and due dates: tests, guardrails, automation.', w: 'Tracking actions to closure prevents repeat incidents.' },
        { id: 'slo', c: 0, r: 1, l: 'SLOs & Runbooks', s: 'updated', k: 'observe', d: 'Refine SLOs, alert thresholds and runbooks with what was learned.', w: 'The loop closes when detection gets better next time.' }
      ],
      edges: [['sig', 'alert'], ['alert', 'inc'], ['inc', 'inv'], ['inv', 'mit'], ['mit', 'pm'], ['pm', 'imp'], ['imp', 'slo'], ['slo', 'sig', 1]]
    }
    ,{
      id: 'terraform', tab: 'Terraform Workflow', cols: 5, rows: 2, applied: true,
      intro: 'GitOps-style infrastructure delivery: every change is planned, policy-checked and reviewed before apply, state is locked remotely, and a nightly plan catches drift.',
      nodes: [
        { id: 'mod', c: 0, r: 0, l: 'Module registry', s: 'versioned modules', k: 'data', d: 'Reusable, versioned Terraform modules (network, AKS, Key Vault, policy) consumed by environment stacks.', w: 'Pin module versions per environment so a change is promoted, not broadcast.' },
        { id: 'pr', c: 1, r: 0, l: 'Pull Request', s: 'fmt · validate · lint', k: 'process', d: 'terraform fmt, validate and tflint run on every PR to the infrastructure repo.', w: 'Cheap checks first — fail in seconds, not after a 10-minute plan.' },
        { id: 'plan', c: 2, r: 0, l: 'terraform plan', s: 'saved plan file', k: 'compute', d: 'Plan runs against remote state; the plan file is saved as a pipeline artifact and posted to the PR.', w: 'Apply exactly the plan that was reviewed — never re-plan at apply time.' },
        { id: 'pol', c: 3, r: 0, l: 'Policy checks', s: 'Checkov · Azure Policy', k: 'security', d: 'Static IaC scanning plus Azure Policy guardrails (allowed regions, required tags, no public IPs).', w: 'Policy as code turns review comments into automated gates.' },
        { id: 'appr', c: 4, r: 0, l: 'Approval', s: 'plan review', k: 'security', d: 'Environment protection requires a human to approve the plan for production.', w: 'Destroy/replace actions in a plan deserve a second reviewer.' },
        { id: 'apply', c: 4, r: 1, l: 'terraform apply', s: 'OIDC identity', k: 'compute', d: 'Applies the saved plan using a federated workload identity — no long-lived secrets.', w: 'One pipeline identity per environment limits blast radius.' },
        { id: 'state', c: 3, r: 1, l: 'Remote state', s: 'Storage · blob lease', k: 'data', d: 'State in an Azure Storage account with blob-lease locking, versioning and soft delete.', w: 'Locking prevents two applies corrupting the same state.' },
        { id: 'res', c: 2, r: 1, l: 'Azure resources', s: 'per workspace / env', k: 'compute', d: 'Resources created per environment, separated by workspace or state key.', w: 'Separate state per environment keeps dev mistakes out of prod.' },
        { id: 'drift', c: 1, r: 1, l: 'Drift detection', s: 'nightly plan', k: 'observe', d: 'A scheduled plan with -detailed-exitcode flags any difference between code and reality.', w: 'Drift alerts need an owner, or they become noise.' },
        { id: 'tick', c: 0, r: 1, l: 'Ticket / alert', s: 'owner queue', k: 'process', d: 'Drift raises a ticket to the owning team to either codify or revert the change.', w: 'Closing the loop is what keeps 100% of environments in code.' }
      ],
      edges: [['mod', 'pr', 1], ['pr', 'plan'], ['plan', 'pol'], ['pol', 'appr'], ['appr', 'apply'], ['apply', 'state'], ['apply', 'res', 1], ['state', 'plan', 1], ['res', 'drift', 1], ['drift', 'tick']]
    },
    {
      id: 'observe', tab: 'Observability', cols: 5, rows: 2, applied: true,
      intro: 'Metrics, logs and traces flow into a small set of tools; SLO-based alerts route to on-call with a runbook attached, and logs are forwarded to the enterprise SIEM.',
      nodes: [
        { id: 'wl', c: 0, r: 0, l: 'Workloads', s: 'AKS · App Service', k: 'compute', d: 'Applications and platform components emitting metrics, logs and request telemetry.', w: 'Instrument the golden signals first: latency, traffic, errors, saturation.' },
        { id: 'prom', c: 1, r: 0, l: 'Prometheus', s: 'metrics scrape', k: 'observe', d: 'Scrapes pod, node and ingress metrics; evaluates recording and alert rules.', w: 'Recording rules keep SLO queries cheap and dashboards fast.' },
        { id: 'ai', c: 1, r: 1, l: 'App Insights', s: 'requests · traces', k: 'observe', d: 'Application Insights captures requests, dependencies, exceptions and distributed traces.', w: 'Dependency tracking shows whether the fault is yours or downstream.' },
        { id: 'law', c: 2, r: 1, l: 'Log Analytics', s: 'KQL', k: 'data', d: 'Central workspace for platform and container logs, queried with KQL.', w: 'Retention and table plans drive most of the observability bill.' },
        { id: 'graf', c: 2, r: 0, l: 'Grafana', s: 'dashboards', k: 'observe', d: 'Service and SLO dashboards across Prometheus and Azure Monitor data sources.', w: 'One dashboard per service, starting with its SLO.' },
        { id: 'mon', c: 3, r: 0, l: 'Azure Monitor', s: 'alert rules', k: 'observe', d: 'Metric and log alert rules, including error-budget burn-rate alerts.', w: 'Page on symptoms users feel; ticket on causes.' },
        { id: 'ag', c: 4, r: 0, l: 'Action group', s: 'on-call paging', k: 'process', d: 'Routes alerts to the on-call engineer and incident channel.', w: 'Every page should link straight to a runbook.' },
        { id: 'rb', c: 4, r: 1, l: 'Runbooks', s: 'documented steps', k: 'process', d: 'Diagnostic and mitigation steps per alert, kept next to the alert definition.', w: 'If a page has no action, it should not page.' },
        { id: 'spl', c: 3, r: 1, l: 'Splunk', s: 'SIEM / long-term', k: 'data', d: 'Logs forwarded for security analytics and long-term retention.', w: 'Forward selectively — not every debug log belongs in the SIEM.' }
      ],
      edges: [['wl', 'prom'], ['wl', 'ai'], ['prom', 'graf'], ['ai', 'law'], ['law', 'graf', 1], ['graf', 'mon', 1], ['law', 'mon'], ['prom', 'mon', 1], ['mon', 'ag'], ['ag', 'rb'], ['law', 'spl']]
    }
  ];

  /* Security / common issue / troubleshooting notes per component (diagramId.nodeId). */
  var NOTES = {
    'azure.users': ['Only HTTPS through the gateway; no direct public endpoints on workloads.', 'Client errors that look like outages are often DNS caching or certificate issues.', 'Reproduce with curl -v against the public hostname and compare with a private-endpoint path.'],
    'azure.entra': ['MFA and Conditional Access for humans; managed identities for workloads.', 'Expired app-registration secrets and over-scoped role assignments.', 'Check sign-in logs and the role assignments at each scope (az role assignment list).'],
    'azure.policy': ['Deny effects for public IPs and unapproved regions; audit for tags.', 'A new Deny policy silently blocks a pipeline deployment.', 'Read the policy violation in the deployment error; test with -WhatIf before assigning.'],
    'azure.dns': ['Private DNS zones linked only to the VNets that need them.', 'Private endpoint resolves to a public IP because the zone is not linked.', 'nslookup from inside the VNet; verify zone links and the A record.'],
    'azure.agw': ['WAF in Prevention mode with tuned exclusions; TLS 1.2+ only.', 'Backend marked unhealthy because the probe path or host header is wrong.', 'Check Backend health blade and WAF logs in Log Analytics.'],
    'azure.nsg': ['Least-privilege NSG rules; hub firewall for egress inspection.', 'Asymmetric routing or a missing peering route after a change.', 'Network Watcher IP flow verify and effective routes on the NIC.'],
    'azure.app': ['Managed identity to reach Key Vault and SQL; access restrictions on SCM site.', 'Slot swap brings cold instances and a latency spike.', 'Warm up the staging slot; check App Insights for the swap window.'],
    'azure.aks': ['Private API server or authorized IP ranges; workload identity; Azure Policy for AKS.', 'Node pool reaches pod or IP limits during scale-out.', 'kubectl describe pod for scheduling events; check subnet IP availability.'],
    'azure.vmss': ['Hardened images, no public IPs, patching via update management.', 'Instances drift from the model after manual changes.', 'Compare instance view to the model; reimage rather than hand-fix.'],
    'azure.sql': ['Private endpoint only, Entra authentication, TDE and auditing on.', 'DTU/vCore saturation or long-running blocking queries.', 'Query Performance Insight and sys.dm_exec_requests for blockers.'],
    'azure.stg': ['Disable shared-key access where possible; private endpoints; soft delete.', 'Throttling (503) from hot partitions or account limits.', 'Storage metrics for throttling and latency; spread load across prefixes.'],
    'azure.kv': ['RBAC model, purge protection, private endpoint, no secret values in logs.', 'Expired certificates or access denied after a role change.', 'Key Vault diagnostic logs for the failing identity and operation.'],
    'azure.mon': ['Action groups restricted to on-call channels; alert definitions in code.', 'Alert storms during a single upstream failure.', 'Group alerts by service; suppress dependent alerts during a known incident.'],
    'azure.law': ['Workspace RBAC by resource; retention aligned to compliance.', 'Ingestion cost spikes from verbose container logs.', 'Usage table by DataType to find the noisy source.'],
    'azure.def': ['Defender plans per workload type; findings assigned to owners.', 'Recommendations pile up without ownership and Secure Score stalls.', 'Export recommendations to a backlog with owners and due dates.'],
    'cicd.git': ['Signed commits optional; branch protection and secret scanning on push.', 'Long-lived branches cause painful merges.', 'Keep branches short-lived; rebase often.'],
    'cicd.pr': ['CODEOWNERS on sensitive paths; required status checks.', 'Flaky checks block merges and erode trust in the gate.', 'Quarantine flaky tests and track them as defects.'],
    'cicd.build': ['Pinned action versions; least-privilege GITHUB_TOKEN permissions.', 'Cache misses make builds slow and inconsistent.', 'Inspect cache keys; make builds reproducible with lockfiles.'],
    'cicd.test': ['Tests never use production credentials or data.', 'Quality gate fails on new code coverage after a refactor.', 'Read the SonarQube new-code report; fix or justify in the PR.'],
    'cicd.scan': ['Fail on high/critical findings with an agreed exception process.', 'False positives slow teams and invite bypasses.', 'Triage findings with suppression files reviewed like code.'],
    'cicd.art': ['Immutable tags; pull access via managed identity only.', 'Deploying a mutable latest tag makes rollback ambiguous.', 'Deploy by digest or semantic version; never latest.'],
    'cicd.appr': ['Approvers separated from authors for production.', 'Approvals become rubber stamps when the diff is unreadable.', 'Show the plan or release notes in the approval request.'],
    'cicd.deploy': ['OIDC federation — no stored cloud secrets in the pipeline.', 'Helm upgrade times out waiting for unready pods.', 'helm status, kubectl rollout status and pod events for the failing release.'],
    'cicd.mon': ['Deployment markers annotated on dashboards.', 'Regression noticed by users before the pipeline.', 'Automate post-deploy checks against SLO metrics.'],
    'cicd.rb': ['Rollback uses the same approved pipeline path.', 'Database migrations that cannot roll back.', 'Use expand-and-contract migrations so the app can roll back safely.'],
    'aks.acr': ['Pull via kubelet managed identity; admin user disabled.', 'ImagePullBackOff after a registry permission change.', 'kubectl describe pod; az aks check-acr to test the attachment.'],
    'aks.helm': ['Values files without secrets; chart versions pinned.', 'Failed release left in pending-upgrade state.', 'helm history, then helm rollback to the last deployed revision.'],
    'aks.lb': ['Internal load balancer where public exposure is not needed.', 'SNAT port exhaustion under heavy outbound traffic.', 'Check SNAT metrics; use NAT Gateway for egress.'],
    'aks.ing': ['TLS via cert-manager or Key Vault; rate limits on public routes.', '502/504 from misconfigured upstream timeouts.', 'Ingress controller logs and upstream response time metrics.'],
    'aks.kv': ['Secrets Store CSI with workload identity; rotation enabled.', 'Pod stuck in ContainerCreating because the secret mount fails.', 'Pod events and the CSI driver logs for the access error.'],
    'aks.svcw': ['NetworkPolicy restricts which pods can call the service.', 'Service selector does not match pod labels — no endpoints.', 'kubectl get endpoints for the service.'],
    'aks.svca': ['NetworkPolicy restricts callers to the web tier.', 'Traffic sent to pods that are not yet ready.', 'Check readiness probe configuration and endpoint list.'],
    'aks.prom': ['Scrape endpoints not exposed outside the cluster.', 'High-cardinality labels exhaust memory.', 'Inspect top series by label; drop unbounded labels.'],
    'aks.depw': ['Non-root containers, read-only root filesystem where possible.', 'Rollout stalls on maxUnavailable with a PodDisruptionBudget.', 'kubectl rollout status and describe replicaset.'],
    'aks.depa': ['Resource limits prevent noisy neighbours.', 'OOMKilled after a memory regression.', 'kubectl describe pod for Last State; compare usage with limits.'],
    'aks.hpa': ['Scaling bounds set so a bug cannot scale costs unbounded.', 'HPA shows unknown metrics because metrics-server is unhealthy.', 'kubectl describe hpa for metric errors.'],
    'aks.podw': ['Pod security standards enforced per namespace.', 'CrashLoopBackOff from bad config or a missing dependency.', 'kubectl logs --previous for the crashed container.'],
    'aks.poda': ['Probes and limits on every container.', 'Liveness probe too aggressive causes restart loops.', 'Tune initialDelaySeconds; use startup probes for slow starts.'],
    'aks.ca': ['Node pools with system/user separation.', 'Pods pending because a node pool hit its max count.', 'Cluster Autoscaler status and events on pending pods.'],
    'sre.sig': ['Telemetry free of personal data and secrets.', 'Measuring host CPU instead of user experience.', 'Define SLIs from the request path first.'],
    'sre.alert': ['Alert rules versioned and reviewed.', 'Threshold alerts flap and create noise.', 'Use multi-window burn-rate alerts with a for-duration.'],
    'sre.inc': ['Incident channel access limited; status page reviewed before posting.', 'No clear incident commander — parallel, conflicting actions.', 'Assign roles in the first five minutes.'],
    'sre.inv': ['Read-only access for diagnostics where possible.', 'Rabbit-holing on root cause while users are still impacted.', 'Time-box investigation; mitigate first.'],
    'sre.mit': ['Emergency changes still logged and reviewed afterwards.', 'Rollback blocked by an irreversible change.', 'Feature flags and reversible migrations keep options open.'],
    'sre.pm': ['Postmortems shared without blame or personal data.', 'Action items without owners never close.', 'Assign owner and due date to every action.'],
    'sre.imp': ['Guardrails added as code, not wiki pages.', 'Same incident recurs months later.', 'Track action closure rate as a team metric.'],
    'sre.slo': ['SLO changes agreed with service owners.', 'SLOs set to 100% leave no room for change.', 'Pick targets users notice; review quarterly.'],
    'terraform.mod': ['Modules reviewed like application code; no secrets in defaults.', 'Breaking change in a module version lands everywhere at once.', 'Semantic versioning and per-environment version pins.'],
    'terraform.pr': ['Pipeline cannot read production state on untrusted forks.', 'Formatting and provider-version mismatches across engineers.', 'Pin required_providers and run fmt in pre-commit.'],
    'terraform.plan': ['Plan output can contain sensitive values — restrict artifact access.', 'Unexpected destroy/replace from a renamed resource.', 'Use moved blocks; read the plan summary before approval.'],
    'terraform.pol': ['Policies enforce encryption, private networking and tags.', 'Policy exception granted permanently instead of time-boxed.', 'Record exceptions in code with an expiry.'],
    'terraform.appr': ['Separate approvers for production.', 'Approving a plan that is stale by the time it applies.', 'Apply the saved plan; re-plan if state changed.'],
    'terraform.apply': ['Federated identity scoped to one subscription/environment.', 'Apply fails midway, leaving partial infrastructure.', 'Re-run plan to see remaining changes; fix and re-apply.'],
    'terraform.state': ['State encrypted at rest; access restricted; versioning on.', 'Stale lock after a cancelled pipeline.', 'Confirm no run is active, then terraform force-unlock with the lock ID.'],
    'terraform.res': ['Resource locks on critical shared resources.', 'Manual portal changes create drift.', 'Import or revert the change; restrict write access to the pipeline identity.'],
    'terraform.drift': ['Drift job uses read-only credentials.', 'Drift reports ignored until the next change explodes.', 'Route to an owner queue with an SLA.'],
    'terraform.tick': ['Tickets link to the plan output, not raw secrets.', 'Ownership unclear for shared resources.', 'Tag resources with owner and service.'],
    'observe.wl': ['Never log secrets or tokens.', 'Missing correlation IDs make cross-service debugging slow.', 'Propagate trace context through every hop.'],
    'observe.prom': ['Metrics endpoints internal only.', 'Cardinality explosion from user IDs in labels.', 'Drop or relabel unbounded labels.'],
    'observe.ai': ['Sampling and data masking for sensitive fields.', 'Sampling hides rare errors.', 'Use adaptive sampling with exceptions always kept.'],
    'observe.law': ['Table-level RBAC for sensitive logs.', 'Ingestion cost spike after a debug flag is left on.', 'Usage | summarize by DataType; set daily cap alerts.'],
    'observe.graf': ['SSO with role mapping; no shared admin accounts.', 'Dashboards drift and show stale queries.', 'Manage dashboards as code.'],
    'observe.mon': ['Alert rules deployed via IaC.', 'Duplicate alerts from metric and log rules for the same symptom.', 'One symptom, one alert; route causes to tickets.'],
    'observe.ag': ['Webhook endpoints authenticated.', 'Paging the wrong team after a re-org.', 'Review routing quarterly with the on-call roster.'],
    'observe.rb': ['Runbooks avoid embedding credentials.', 'Runbooks go stale after architecture changes.', 'Update the runbook as a postmortem action.'],
    'observe.spl': ['Forward over TLS with scoped tokens.', 'Forwarder backlog delays security detections.', 'Monitor forwarder queue depth and lag.']
  };

  var labTabs = $('#lab-tabs'), labCanvas = $('#lab-canvas'), labDetail = $('#lab-detail'), labLegend = $('#lab-legend');
  var labSel = null, currentDiagram = 0, narrowMQ = window.matchMedia('(max-width: 640px)');
  if (labTabs) {
    labTabs.innerHTML = DIAGRAMS.map(function (d, i) {
      return '<button type="button" role="tab" class="tab" id="tab-' + d.id + '" aria-controls="lab-canvas" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '">' + esc(d.tab) + '</button>';
    }).join('');
    labCanvas.setAttribute('role', 'tabpanel');
    var tabs = $$('.tab', labTabs);
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { selectTab(i); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % tabs.length; else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); selectTab(n); tabs[n].focus(); }
      });
    });
    function selectTab(i) {
      currentDiagram = i; labSel = null;
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      labCanvas.setAttribute('aria-labelledby', tabs[i].id);
      renderDiagram();
    }
    var onMQ = function () { renderDiagram(); };
    if (narrowMQ.addEventListener) narrowMQ.addEventListener('change', onMQ); else narrowMQ.addListener(onMQ);
    selectTab(0);
  }

  /* Builds a diagram SVG. Used by the lab (interactive) and by presentation mode (static). */
  function buildDiagram(d, narrow, opts) {
    opts = opts || {};
    var nw = narrow ? 104 : 136, nh = narrow ? 50 : 54, cw = narrow ? 120 : 172, rh = narrow ? 84 : 104, pad = 12;
    var C = narrow ? d.rows : d.cols, R = narrow ? d.cols : d.rows;
    var W = C * cw - (cw - nw) + pad * 2, H = R * rh - (rh - nh) + pad * 2;
    var pos = {}, uid = d.id + (opts.suffix || '');
    d.nodes.forEach(function (n) {
      var c = narrow ? n.r : n.c, r = narrow ? n.c : n.r;
      pos[n.id] = { x: pad + c * cw, y: pad + r * rh, n: n };
    });
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: opts.static ? 'img' : 'group', 'aria-label': d.tab + ' diagram' + (opts.static ? '' : '. Use Tab to move between components and Enter to select.') });
    var defs = svgEl('defs', {});
    ['', '-hl'].forEach(function (s) {
      var m = svgEl('marker', { id: 'arr' + s + '-' + uid, viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' });
      m.appendChild(svgEl('path', { d: 'M0 0 L10 5 L0 10 z', 'class': s ? 'dg-arrow-hl' : 'dg-arrow' })); defs.appendChild(m);
    });
    svg.appendChild(defs);
    var gE = svgEl('g', {}), gN = svgEl('g', {});
    svg.appendChild(gE); svg.appendChild(gN);
    var edgeEls = [];
    d.edges.forEach(function (e) {
      var a = pos[e[0]], b = pos[e[1]]; if (!a || !b) return;
      var path = svgEl('path', { d: edgePath(a, b, nw, nh), 'class': 'dg-edge' + (e[2] ? ' aux' : ''), 'marker-end': 'url(#arr-' + uid + ')' });
      path.__from = e[0]; path.__to = e[1]; gE.appendChild(path); edgeEls.push(path);
    });
    var nodeEls = {};
    d.nodes.forEach(function (n) {
      var p = pos[n.id], kind = KINDS[n.k];
      var attrs = { 'class': 'dg-node', transform: 'translate(' + p.x + ',' + p.y + ')' };
      if (!opts.static) { attrs.tabindex = '0'; attrs.role = 'button'; attrs['aria-label'] = n.l + ' — ' + n.s + '. ' + n.d; }
      var g = svgEl('g', attrs);
      g.appendChild(svgEl('rect', { 'class': 'box', width: nw, height: nh, rx: 10 }));
      g.appendChild(svgEl('rect', { 'class': 'bar', x: 0, y: 10, width: 3, height: nh - 20, rx: 1.5, fill: kind.color }));
      var t1 = svgEl('text', { 'class': 'l1', x: 12, y: nh / 2 - 3 }); t1.textContent = n.l;
      var t2 = svgEl('text', { 'class': 'l2', x: 12, y: nh / 2 + 13 }); t2.textContent = n.s;
      if (narrow) { t1.setAttribute('style', 'font-size:11.5px'); t2.setAttribute('style', 'font-size:9px'); }
      if (!opts.static) { var tt = svgEl('title', {}); tt.textContent = n.l + ': ' + n.d; g.appendChild(tt); }
      g.appendChild(t1); g.appendChild(t2);
      gN.appendChild(g); nodeEls[n.id] = g;
    });
    return { svg: svg, pos: pos, nodeEls: nodeEls, edgeEls: edgeEls, uid: uid };
  }
  function findDiagram(id) { for (var i = 0; i < DIAGRAMS.length; i++) if (DIAGRAMS[i].id === id) return DIAGRAMS[i]; return null; }

  function renderDiagram() {
    var d = DIAGRAMS[currentDiagram], narrow = narrowMQ.matches;
    var built = buildDiagram(d, narrow), pos = built.pos, nodeEls = built.nodeEls, edgeEls = built.edgeEls, uid = built.uid;
    Object.keys(nodeEls).forEach(function (id) {
      var g = nodeEls[id];
      g.addEventListener('click', function () { selectNode(id); });
      g.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selectNode(id); } });
    });
    labCanvas.innerHTML = ''; labCanvas.appendChild(built.svg);
    var disc = $('#lab-disclaimer');
    if (disc) {
      disc.textContent = d.applied ? 'Illustrative pattern from my client work — not a connected production environment.' : 'Educational reference only — not from my client engagements.';
      disc.classList.toggle('ref', !d.applied);
    }

    function selectNode(id) {
      labSel = id; var n = pos[id].n, connected = {}; connected[id] = 1;
      edgeEls.forEach(function (p) {
        var on = p.__from === id || p.__to === id;
        p.classList.toggle('hl', on); p.classList.toggle('dim', !on);
        p.setAttribute('marker-end', 'url(#arr' + (on ? '-hl' : '') + '-' + uid + ')');
        if (on) { connected[p.__from] = 1; connected[p.__to] = 1; }
      });
      Object.keys(nodeEls).forEach(function (k) { nodeEls[k].classList.toggle('sel', k === id); nodeEls[k].classList.toggle('dim', !connected[k]); });
      var links = edgeEls.filter(function (p) { return p.__from === id || p.__to === id; }).map(function (p) {
        var out = p.__from === id, other = pos[out ? p.__to : p.__from].n;
        return (out ? '→ ' : '← ') + other.l + (other.s ? ' (' + other.s + ')' : '');
      });
      var kind = KINDS[n.k], note = NOTES[d.id + '.' + id];
      var sec = function (label, body) { return '<p class="ld-label">' + label + '</p><p>' + esc(body) + '</p>'; };
      labDetail.innerHTML = '<span class="ld-kind"><i style="background:' + kind.color + '"></i>' + esc(kind.label) + '</span>' +
        '<h3>' + esc(n.l) + ' <span class="muted mono small">' + esc(n.s) + '</span></h3>' +
        sec('What it does', n.d) + sec('Why it is used', n.w) +
        (links.length ? '<p class="ld-label">Integrates with</p><p class="mono small">' + links.map(esc).join('<br>') + '</p>' : '') +
        (note ? '<details class="ld-more" open><summary>Operations notes</summary>' + sec('Security', note[0]) + sec('Common production issue', note[1]) + sec('Troubleshooting', note[2]) + '</details>' : '') +
        '<button type="button" class="btn btn-sm btn-ghost" id="ld-clear" style="margin-top:8px">Clear selection</button>';
      $('#ld-clear').addEventListener('click', function () { clearSel(); nodeEls[id].focus(); });
    }
    function clearSel() {
      labSel = null;
      edgeEls.forEach(function (p) { p.classList.remove('hl', 'dim'); p.setAttribute('marker-end', 'url(#arr-' + uid + ')'); });
      Object.keys(nodeEls).forEach(function (k) { nodeEls[k].classList.remove('sel', 'dim'); });
      labDetail.innerHTML = '<span class="ld-kind">' + esc(d.tab) + (d.applied ? '' : ' · reference') + '</span><h3>Overview</h3><p>' + esc(d.intro) + '</p><p class="ld-hint">Select a component to see what it does, why it is used, how it connects, and its security and troubleshooting notes.</p>';
    }
    var keep = labSel; clearSel(); if (keep && pos[keep]) selectNode(keep);
    var used = {}; d.nodes.forEach(function (n) { used[n.k] = 1; });
    labLegend.innerHTML = Object.keys(used).map(function (k) { return '<li><i style="background:' + KINDS[k].color + '"></i>' + esc(KINDS[k].label) + '</li>'; }).join('') +
      '<li><i class="lg-line"></i>Supporting / async</li>';
  }
  function edgePath(a, b, w, h) {
    var ax = a.x + w / 2, ay = a.y + h / 2, bx = b.x + w / 2, by = b.y + h / 2, dx = bx - ax, dy = by - ay, s, e;
    if (Math.abs(dx) * h >= Math.abs(dy) * w) {
      var sx = dx > 0 ? 1 : -1;
      s = [ax + sx * w / 2, ay]; e = [bx - sx * w / 2, by];
      var k = Math.max(20, Math.abs(e[0] - s[0]) / 2);
      return 'M' + s[0] + ' ' + s[1] + ' C' + (s[0] + sx * k) + ' ' + s[1] + ' ' + (e[0] - sx * k) + ' ' + e[1] + ' ' + e[0] + ' ' + e[1];
    }
    var sy = dy > 0 ? 1 : -1;
    s = [ax, ay + sy * h / 2]; e = [bx, by - sy * h / 2];
    var k2 = Math.max(16, Math.abs(e[1] - s[1]) / 2);
    return 'M' + s[0] + ' ' + s[1] + ' C' + s[0] + ' ' + (s[1] + sy * k2) + ' ' + e[0] + ' ' + (e[1] - sy * k2) + ' ' + e[0] + ' ' + e[1];
  }

  window.VG = { CASES: CASES, DIAGRAMS: DIAGRAMS, buildDiagram: buildDiagram, findDiagram: findDiagram, esc: esc, svgEl: svgEl, reduceMotion: reduceMotion };

  /* =========================================================
     SRE OPERATIONS LAB — SIMULATED DATA ONLY (seeded PRNG)
     ========================================================= */
  var ops = $('#ops-root');
  if (ops) (function () {
    var TICK_MS = reduceMotion ? 1200 : 900, TICK_SIM_S = 5, N = 48;
    var SLO = 0.999, BUDGET_MIN = 43.2, LAT_THR = 400, ERR_THR = 1.0;
    function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    var rnd, state, timer = null, paused = false;
    var PHASES = ['normal', 'degrading', 'alert', 'incident', 'investigation', 'mitigation', 'recovery'];
    // scripted incident: [phase, ticks, target latency, target error %]
    var SCRIPT = [
      ['degrading', 4, 520, 1.6], ['alert', 2, 610, 2.1], ['incident', 2, 640, 2.3],
      ['investigation', 4, 650, 2.4], ['mitigation', 4, 230, 0.15], ['recovery', 4, 180, 0.04]
    ];
    var EVENTS = {
      degrading: [[0, 'info', 'Deployment checkout-api v2.14.0 rolled out (helm rev 14)'], [2, 'warn', 'p95 latency rising: 180 ms → 450 ms; 5xx increasing']],
      alert: [[0, 'warn', 'ALERT pending: CheckoutHighLatencyP95 (> 400 ms for 2 evaluations)'], [1, 'crit', 'ALERT firing: CheckoutErrorBudgetFastBurn (burn rate ≥ 14.4×) — on-call paged']],
      incident: [[0, 'crit', 'SEV-2 declared · incident commander assigned · #inc-checkout opened'], [1, 'info', 'Status page: “Elevated checkout errors — investigating”']],
      investigation: [[0, 'info', 'Grafana: errors isolated to checkout-api; dependencies healthy'], [1, 'warn', 'kubectl: checkout-api pods OOMKilled, restarts climbing'], [2, 'info', 'Correlated with v2.14.0 deploy 4 min earlier — memory usage +60%'], [3, 'info', 'Decision: roll back first, root-cause later']],
      mitigation: [[0, 'info', 'helm rollback checkout-api 13 → v2.13.2'], [2, 'ok', 'Rollout complete: 6/6 pods ready, restarts stable']],
      recovery: [[0, 'ok', 'Latency and error rate back within SLO'], [1, 'ok', 'Alerts resolved · incident moved to monitoring'], [3, 'ok', 'Postmortem scheduled · action: add memory regression test + raise limits after profiling']]
    };
    var WL = [['web-frontend', 3], ['checkout-api', 6], ['payments-svc', 4], ['catalog-api', 3], ['worker-queue', 2]];
    var el = {
      clock: $('#ops-clock'), status: $('#ops-status'), dot: $('#ops-svc-dot'), sim: $('#ops-sim'), pause: $('#ops-pause'), reset: $('#ops-reset'),
      avail: $('#k-avail'), lat: $('#k-lat'), err: $('#k-err'), rps: $('#k-rps'), burn: $('#k-burn'),
      bfill: $('#budget-fill'), btxt: $('#budget-txt'), slo: $('#slo-list'), alerts: $('#alert-list'), wl: $('#wl-table tbody'), log: $('#ops-log'),
      cLat: $('#chart-lat'), cErr: $('#chart-err'), phases: $$('#ops-phases li')
    };

    function init() {
      rnd = mulberry32(20250101);
      state = { t: 0, phase: 'normal', pIdx: -1, pTick: 0, lat: [], err: [], rps: [], curLat: 180, curErr: 0.04,
        consumed: 6.5, slowCount: 0, alertState: { lat: 'ok', burn: 'ok' }, wl: WL.map(function (w) { return { name: w[0], want: w[1], ready: w[1], restarts: 0, status: 'Running' }; }), seenPhases: {} };
      for (var i = 0; i < N; i++) { sample(180, 0.04); }
      el.log.innerHTML = '<li class="empty">No incidents. Timeline entries appear when an incident starts.</li>';
      el.sim.disabled = false; paused = false; el.pause.textContent = 'Pause'; el.pause.setAttribute('aria-pressed', 'false');
      render();
    }
    function sample(tLat, tErr) {
      state.curLat += (tLat - state.curLat) * 0.45; state.curErr += (tErr - state.curErr) * 0.45;
      var lat = Math.max(90, state.curLat + (rnd() - 0.5) * 30);
      var err = Math.max(0.005, state.curErr * (0.85 + rnd() * 0.3));
      var rps = 1240 + Math.sin(state.t / 6) * 40 + (rnd() - 0.5) * 50 - (err > 1 ? 60 : 0);
      state.lat.push(lat); state.err.push(err); state.rps.push(rps);
      if (state.lat.length > N) { state.lat.shift(); state.err.shift(); state.rps.shift(); }
      var burn = (err / 100) / (1 - SLO);
      state.consumed += burn * (TICK_SIM_S / 60);
      state.burn = burn;
    }
    function step() {
      if (paused) return;
      state.t++;
      var tLat = 180, tErr = 0.04;
      if (state.pIdx >= 0) {
        var sc = SCRIPT[state.pIdx];
        if (state.phase !== sc[0]) { state.phase = sc[0]; state.pTick = 0; }
        tLat = sc[2]; tErr = sc[3];
        (EVENTS[state.phase] || []).forEach(function (ev) { if (ev[0] === state.pTick) log(ev[1], ev[2]); });
        workloadEffects();
        state.pTick++;
        if (state.pTick >= sc[1]) {
          state.pIdx++;
          if (state.pIdx >= SCRIPT.length) { state.pIdx = -1; state.phase = 'normal'; state.done = true; el.sim.disabled = false; el.sim.textContent = 'Run again'; }
        }
      }
      sample(tLat, tErr);
      evaluateAlerts();
      render();
    }
    function workloadEffects() {
      var w = state.wl[1];
      if (state.phase === 'degrading') { w.restarts += 1; w.ready = Math.max(4, w.ready - (state.pTick % 2)); w.status = 'Running'; }
      else if (state.phase === 'alert' || state.phase === 'incident' || state.phase === 'investigation') { w.restarts += 2; w.ready = 3 + (state.t % 2); w.status = 'OOMKilled'; }
      else if (state.phase === 'mitigation') { w.ready = Math.min(6, 3 + state.pTick); w.status = state.pTick < 3 ? 'RollingBack' : 'Running'; }
      else if (state.phase === 'recovery') { w.ready = 6; w.status = 'Running'; }
    }
    function evaluateAlerts() {
      var lat = state.lat[state.lat.length - 1];
      state.slowCount = lat > LAT_THR ? state.slowCount + 1 : 0;
      var a = state.alertState;
      var prevLat = a.lat, prevBurn = a.burn;
      a.lat = state.slowCount >= 2 ? 'firing' : state.slowCount === 1 ? 'pending' : (prevLat === 'firing' || prevLat === 'resolved') && state.phase !== 'normal' ? 'resolved' : (prevLat === 'resolved' ? 'resolved' : 'ok');
      a.burn = state.burn >= 14.4 ? 'firing' : (prevBurn === 'firing' || prevBurn === 'resolved') ? 'resolved' : 'ok';
      if (state.phase === 'normal' && state.done && state.t % 1 === 0) { /* resolved alerts stay visible until reset */ }
    }
    function log(cls, msg) {
      var empty = $('.empty', el.log); if (empty) empty.remove();
      var li = document.createElement('li'); li.className = cls;
      li.innerHTML = '<span>' + fmt(state.t * TICK_SIM_S) + '</span><span>' + esc(msg) + '</span>';
      el.log.appendChild(li); el.log.scrollTop = el.log.scrollHeight;
    }
    function fmt(s) { var m = Math.floor(s / 60), x = s % 60; return 'T+' + (m < 10 ? '0' : '') + m + ':' + (x < 10 ? '0' : '') + x; }
    function lvl(v, warn, bad) { return v >= bad ? 'bad' : v >= warn ? 'warn' : ''; }
    function setKpi(node, text, cls) { node.textContent = text; var k = node.parentNode; k.classList.remove('bad', 'warn'); if (cls) k.classList.add(cls); }
    function render() {
      var lat = state.lat[state.lat.length - 1], err = state.err[state.err.length - 1], rps = state.rps[state.rps.length - 1];
      var avail = 100 - (state.consumed / 432);
      el.clock.textContent = fmt(state.t * TICK_SIM_S);
      setKpi(el.avail, avail.toFixed(3) + '%', avail < 99.9 ? 'bad' : avail < 99.95 ? 'warn' : '');
      setKpi(el.lat, Math.round(lat) + ' ms', lvl(lat, 300, LAT_THR));
      setKpi(el.err, err.toFixed(2) + '%', lvl(err, 0.5, ERR_THR));
      setKpi(el.rps, Math.round(rps).toLocaleString('en-US'), '');
      setKpi(el.burn, state.burn.toFixed(1) + '×', lvl(state.burn, 6, 14.4));
      var pct = Math.min(100, state.consumed / BUDGET_MIN * 100);
      el.bfill.style.width = pct.toFixed(1) + '%';
      el.bfill.className = pct > 75 ? 'crit' : pct > 50 ? 'warn' : '';
      el.btxt.textContent = pct.toFixed(1) + '% consumed · ' + Math.max(0, BUDGET_MIN - state.consumed).toFixed(1) + ' min remaining';
      var latOk = lat < 300;
      el.slo.innerHTML =
        '<li><span>Availability ≥ 99.9% (30d)</span>' + pill(avail >= 99.9 ? (pct > 75 ? ['warn', 'AT RISK'] : ['ok', 'MEETING']) : ['crit', 'BREACHED']) + '</li>' +
        '<li><span>p95 latency &lt; 300 ms</span>' + pill(latOk ? ['ok', 'MEETING'] : lat < LAT_THR ? ['warn', 'DEGRADED'] : ['crit', 'VIOLATING']) + '</li>';
      var A = state.alertState, map = { ok: ['muted', 'OK'], pending: ['warn', 'PENDING'], firing: ['crit', 'FIRING'], resolved: ['ok', 'RESOLVED'] };
      el.alerts.innerHTML =
        '<li><span class="mono small">CheckoutHighLatencyP95</span>' + pill(map[A.lat]) + '</li>' +
        '<li><span class="mono small">CheckoutErrorBudgetFastBurn</span>' + pill(map[A.burn]) + '</li>' +
        '<li><span class="mono small">NodeDiskPressure</span>' + pill(map.ok) + '</li>';
      el.wl.innerHTML = state.wl.map(function (w) {
        var cls = w.status === 'Running' ? (w.ready === w.want ? 'ok' : 'warn') : w.status === 'RollingBack' ? 'warn' : 'crit';
        return '<tr><td>' + w.name + '</td><td>' + w.ready + '/' + w.want + '</td><td>' + w.restarts + '</td><td>' + pill([cls, w.status]) + '</td></tr>';
      }).join('');
      var ph = state.pIdx >= 0 ? state.phase : (state.done ? 'recovery' : 'normal'), pi = PHASES.indexOf(ph);
      el.phases.forEach(function (li, i) {
        li.classList.toggle('done', state.done || (pi > 0 && i < pi));
        li.classList.toggle('current', i === pi && !(state.done && state.pIdx < 0 && state.phase === 'normal' && false));
        li.classList.toggle('crit', i === pi && ['alert', 'incident', 'investigation'].indexOf(ph) >= 0);
        if (i === pi) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
      var bad = lat > LAT_THR || err > ERR_THR;
      el.dot.className = 'svc-dot' + (bad ? ' crit' : lat > 300 || err > 0.5 ? ' warn' : '');
      var msg = {
        normal: state.done ? 'Recovered. Error budget spend from this incident is visible above — that is the real cost of the outage.' : 'All systems nominal. Press “Simulate incident” to begin.',
        degrading: 'A new deployment is live. Latency and 5xx errors are starting to climb…',
        alert: 'Threshold breached for consecutive evaluations — the fast-burn alert pages on-call.',
        incident: 'Incident declared (SEV-2). Roles assigned, stakeholders informed.',
        investigation: 'Investigating: errors isolated to checkout-api, pods OOMKilled since the latest deploy.',
        mitigation: 'Mitigating: rolling back to the last known-good release.',
        recovery: 'Recovering: metrics returning to baseline, alerts resolving.'
      }[state.pIdx >= 0 ? state.phase : 'normal'];
      if (el.status.textContent !== msg) el.status.textContent = msg;
      drawChart(el.cLat, state.lat, 800, LAT_THR, '');
      drawChart(el.cErr, state.err, 3, ERR_THR, 'err');
    }
    function pill(p) { return '<span class="pill ' + p[0] + '">' + p[1] + '</span>'; }
    function drawChart(svg, data, max, thr, cls) {
      var vb = svg.viewBox.baseVal, W = vb.width, H = vb.height, n = data.length;
      var x = function (i) { return i / (N - 1) * W; }, y = function (v) { return H - Math.min(v, max) / max * (H - 6) - 3; };
      var d = data.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
      var area = d + ' L' + x(n - 1).toFixed(1) + ' ' + H + ' L0 ' + H + ' Z';
      var grid = '';
      for (var g = 1; g < 4; g++) grid += '<line class="grid" x1="0" x2="' + W + '" y1="' + (H * g / 4) + '" y2="' + (H * g / 4) + '"/>';
      svg.innerHTML = grid + '<line class="thr" x1="0" x2="' + W + '" y1="' + y(thr) + '" y2="' + y(thr) + '"/>' +
        '<path class="area ' + cls + '" d="' + area + '"/><path class="line ' + cls + '" d="' + d + '"/>';
    }
    function start() { if (!timer) timer = setInterval(step, TICK_MS); }
    function stop() { clearInterval(timer); timer = null; }

    el.sim.addEventListener('click', function () {
      if (state.pIdx >= 0) return;
      if (state.done) { init(); }
      state.pIdx = 0; state.done = false; el.sim.disabled = true; el.sim.textContent = 'Incident running…';
      state.alertState = { lat: 'ok', burn: 'ok' };
      el.log.innerHTML = '';
      paused = false; el.pause.textContent = 'Pause'; el.pause.setAttribute('aria-pressed', 'false');
      start();
    });
    el.pause.addEventListener('click', function () {
      paused = !paused; el.pause.textContent = paused ? 'Resume' : 'Pause'; el.pause.setAttribute('aria-pressed', String(paused));
    });
    el.reset.addEventListener('click', function () { el.sim.textContent = 'Simulate incident'; init(); });

    init();
    // Only tick while visible (saves CPU); pause when the tab is hidden.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { if (en[0].isIntersecting) start(); else stop(); }, { threshold: 0.1 }).observe(ops);
    } else start();
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  })();
})();
