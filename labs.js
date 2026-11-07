/* =========================================================
   Presentation mode + failure playbooks.
   Depends on window.VG exposed by main.js. No dependencies.
   ========================================================= */
(function () {
  'use strict';
  var VG = window.VG;
  if (!VG) return;
  var esc = VG.esc;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* =========================================================
     PRESENTATION MODE — 8 slides per project, from verified data
     ========================================================= */
  var pres = $('#pres'), stage = $('#pres-stage'), dots = $('#pres-dots');
  var pTitle = $('#pres-title'), pKicker = $('#pres-kicker'), pCount = $('#pres-count');
  var btnPrev = $('#pres-prev'), btnNext = $('#pres-next'), btnClose = $('#pres-close'), btnFs = $('#pres-fs');
  var slides = [], cur = 0, opener = null, lastScroll = 0;
  var SLIDE_NAMES = ['Business problem', 'High-level architecture', 'Technology stack', 'End-to-end workflow', 'My responsibilities', 'Challenges & solutions', 'Monitoring, security & reliability', 'Impact & key learnings'];

  function placeholder(what) {
    return '<div class="ps-ph">Not documented yet — add ' + esc(what) + ' before presenting.</div>';
  }
  function bullets(arr, what) {
    if (!arr || !arr.length) return placeholder(what);
    return '<ul class="ps-list">' + arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
  }
  function flowHTML(steps) {
    return '<ol class="ps-flow">' + steps.map(function (s, i) {
      return '<li><span class="ps-flow-n mono">' + (i + 1 < 10 ? '0' : '') + (i + 1) + '</span><span class="ps-flow-t">' + esc(s) + '</span></li>';
    }).join('') + '</ol>';
  }

  function buildSlides(c) {
    var s = [];
    s.push('<p class="ps-eyebrow mono">' + esc(c.context) + '</p><h2 class="ps-h">' + esc(c.title) + '</h2>' +
      '<p class="ps-lead">' + esc(c.challenge) + '</p>' +
      '<div class="ps-metrics">' + c.metrics.map(function (m) { return '<div><b>' + esc(m[0]) + '</b><span>' + esc(m[1]) + '</span></div>'; }).join('') + '</div>');
    s.push('<h2 class="ps-h">High-level architecture <span class="ps-badge">Illustrative</span></h2><div class="ps-diagram" data-diagram="' + (c.diagram || '') + '"></div>' +
      (c.diagram ? '<p class="ps-note">Reference pattern — client environments are confidential. Explore this diagram interactively in the Architecture section.</p>' : ''));
    s.push('<h2 class="ps-h">Technology stack</h2><div class="ps-stack">' + c.tags.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>');
    s.push('<h2 class="ps-h">End-to-end workflow</h2>' + flowHTML(c.flow));
    s.push('<h2 class="ps-h">My responsibilities</h2>' + bullets(c.approach, 'your responsibilities'));
    s.push('<h2 class="ps-h">Production challenges &amp; solutions</h2><div class="ps-two"><div><p class="ps-label">Challenge</p><p class="ps-body">' + esc(c.challenge) + '</p></div>' +
      '<div><p class="ps-label">How it was solved</p>' + bullets(c.solutions, 'the solutions') + '</div></div>');
    s.push('<h2 class="ps-h">Monitoring, security &amp; reliability</h2>' + bullets(c.ops, 'monitoring, security and reliability details'));
    s.push('<h2 class="ps-h">Business impact &amp; key learnings</h2><div class="ps-two"><div><p class="ps-label">Measured impact</p>' + bullets(c.impact, 'measured impact') + '</div>' +
      '<div><p class="ps-label">Key learnings</p>' + bullets(c.considerations, 'key learnings') + '</div></div>');
    return s;
  }

  function renderDiagramInto(el, c) {
    el.innerHTML = '';
    var d = c.diagram && VG.findDiagram(c.diagram);
    if (d) {
      var narrow = window.matchMedia('(max-width: 640px)').matches;
      el.appendChild(VG.buildDiagram(d, narrow, { static: true, suffix: '-pres' }).svg);
    } else {
      el.innerHTML = flowHTML(c.flow).replace('ps-flow', 'ps-flow ps-flow-arch');
    }
  }

  function show(i) {
    cur = Math.max(0, Math.min(slides.length - 1, i));
    stage.innerHTML = '<section class="ps-slide" aria-roledescription="slide" aria-label="' + (cur + 1) + ' of ' + slides.length + ': ' + SLIDE_NAMES[cur] + '">' +
      '<p class="ps-step mono">' + (cur + 1 < 10 ? '0' : '') + (cur + 1) + ' · ' + SLIDE_NAMES[cur] + '</p>' + slides[cur] + '</section>';
    var dg = $('.ps-diagram', stage);
    if (dg) renderDiagramInto(dg, VG.CASES[pres.__case]);
    pCount.textContent = (cur + 1) + ' / ' + slides.length;
    btnPrev.disabled = cur === 0;
    btnNext.disabled = cur === slides.length - 1;
    $$('button', dots).forEach(function (b, k) { b.setAttribute('aria-current', k === cur ? 'step' : 'false'); });
  }

  function open(i, trigger) {
    var c = VG.CASES[i]; if (!c) return;
    opener = trigger || document.activeElement; lastScroll = window.scrollY;
    pres.__case = i;
    slides = buildSlides(c);
    pKicker.textContent = c.kicker; pTitle.textContent = c.title;
    dots.innerHTML = slides.map(function (_, k) { return '<li><button type="button" aria-label="Slide ' + (k + 1) + ': ' + SLIDE_NAMES[k] + '"></button></li>'; }).join('');
    $$('button', dots).forEach(function (b, k) { b.addEventListener('click', function () { show(k); }); });
    pres.hidden = false; document.documentElement.classList.add('pres-open');
    show(0); btnNext.focus();
  }
  function close() {
    if (pres.hidden) return;
    if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) {} }
    pres.hidden = true; document.documentElement.classList.remove('pres-open');
    window.scrollTo(0, lastScroll);
    if (opener && opener.focus) opener.focus();
  }
  function toggleFs() {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) document.exitFullscreen(); else pres.requestFullscreen().catch(function () {});
  }

  if (pres) {
    window.VGPresent = open;
    btnPrev.addEventListener('click', function () { show(cur - 1); });
    btnNext.addEventListener('click', function () { show(cur + 1); });
    btnClose.addEventListener('click', close);
    if (!document.fullscreenEnabled) btnFs.hidden = true;
    btnFs.addEventListener('click', toggleFs);
    document.addEventListener('keydown', function (e) {
      if (pres.hidden) return;
      var k = e.key;
      if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && e.target.tagName !== 'BUTTON')) { e.preventDefault(); show(cur + 1); }
      else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); show(cur - 1); }
      else if (k === 'Home') { e.preventDefault(); show(0); }
      else if (k === 'End') { e.preventDefault(); show(slides.length - 1); }
      else if (k === 'Escape') { if (!document.fullscreenElement) { e.preventDefault(); close(); } }
      else if ((k === 'f' || k === 'F') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); toggleFs(); }
      else if (k === 'Tab') {
        var f = $$('button:not([disabled]):not([hidden]), [tabindex="0"]', pres).filter(function (x) { return x.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // swipe on touch devices
    var tx = null;
    stage.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (tx === null) return; var dx = e.changedTouches[0].clientX - tx; tx = null;
      if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
    });
  }

  /* =========================================================
     FAILURE PLAYBOOKS — sample data only
     ========================================================= */
  var STAGES = ['Problem', 'Investigation', 'Root cause', 'Resolution', 'Prevention'];
  var PLAYBOOKS = [
    {
      id: 'crashloop', tab: 'Pod CrashLoopBackOff', area: 'Kubernetes', sev: 'SEV-3',
      steps: [
        ['payments-svc pods restart repeatedly after a config change; the deployment never becomes available.',
          ['$ kubectl get pods -n shop -l app=payments-svc', 'NAME                            READY   STATUS             RESTARTS      AGE', 'payments-svc-7c9f6d8b5-2xkqp    0/1     CrashLoopBackOff   6 (41s ago)   7m', 'payments-svc-7c9f6d8b5-h8vzr    0/1     CrashLoopBackOff   6 (38s ago)   7m']],
        ['Read the previous container\'s logs and the pod events — the current container has not logged anything yet.',
          ['$ kubectl logs payments-svc-7c9f6d8b5-2xkqp -n shop --previous', 'FATAL config: required env PAYMENTS_DB_HOST is not set', '$ kubectl describe pod payments-svc-7c9f6d8b5-2xkqp -n shop | grep -A3 "Last State"', '    Last State:  Terminated', '      Reason:    Error', '      Exit Code: 1']],
        ['A Helm values refactor renamed the ConfigMap key from DB_HOST to PAYMENTS_DB_HOST, but the chart template still referenced the old key.',
          ['$ kubectl get configmap payments-config -n shop -o jsonpath="{.data}"', '{"DB_HOST":"payments-db.privatelink.database.windows.net"}']],
        ['Roll back to the last good release to restore service, then fix the template and redeploy through the pipeline.',
          ['$ helm history payments-svc -n shop --max 3', 'REVISION  STATUS      DESCRIPTION', '21        superseded  Upgrade complete', '22        deployed    Upgrade complete', '$ helm rollback payments-svc 21 -n shop', 'Rollback was a success! Happy Helming!']],
        ['Catch it before production next time.',
          ['• helm template + kubeconform in the PR pipeline', '• Startup check fails fast with a clear message (already did — good)', '• Deploy to staging and gate on readiness before promotion', '• Alert on restarts > 3 in 10 min per deployment']]
      ]
    },
    {
      id: 'pipeline', tab: 'CI/CD deploy failure', area: 'GitHub Actions', sev: 'SEV-4',
      steps: [
        ['The production deploy job fails at the Azure login step right after a workflow was moved to use a GitHub environment.',
          ['Run azure/login@v2', 'Error: AADSTS700213: No matching federated identity record found for presented', 'assertion subject \'repo:contoso/checkout:environment:production\'.']],
        ['The error names the token subject. Compare it with the federated credentials configured on the app registration.',
          ['$ az ad app federated-credential list --id $APP_ID --query "[].subject" -o tsv', 'repo:contoso/checkout:ref:refs/heads/main']],
        ['When a job targets a GitHub environment, the OIDC subject becomes environment-based, not branch-based. The existing credential only trusted the main branch.',
          ['subject expected : repo:contoso/checkout:environment:production', 'subject configured: repo:contoso/checkout:ref:refs/heads/main']],
        ['Add a federated credential for the production environment subject (keep the branch one for non-environment jobs) and re-run the job.',
          ['$ az ad app federated-credential create --id $APP_ID --parameters \'{', '    "name": "gh-checkout-production",', '    "issuer": "https://token.actions.githubusercontent.com",', '    "subject": "repo:contoso/checkout:environment:production",', '    "audiences": ["api://AzureADTokenExchange"] }\'']],
        ['Make identity changes part of the same reviewed change as the workflow.',
          ['• Manage federated credentials in Terraform next to the workflow', '• One identity per environment, scoped to its subscription', '• Document the subject format in the pipeline template README']]
      ]
    },
    {
      id: 'tflock', tab: 'Terraform state lock', area: 'Terraform', sev: 'SEV-4',
      steps: [
        ['Every infrastructure pipeline run fails during plan; nothing can be changed in the environment.',
          ['$ terraform plan -out=tfplan', '╷', '│ Error: Error acquiring the state lock', '│ state blob is already locked', '│ Lock Info:', '│   ID:        3f2a1c9e-8b7d-4e21-9a0f-5c6b7d8e9f10', '│   Operation: OperationTypeApply', '│   Who:       runner@gh-runner-04', '│   Created:   2026-11-06 22:14:03 UTC']],
        ['The lock is held by an apply from last night. Check whether that run is still active before touching anything.',
          ['$ gh run list --workflow infra-apply.yml --limit 3', 'STATUS     TITLE                 BRANCH  EVENT      ELAPSED', 'cancelled  apply: network-hub   main    push       41m', 'success    apply: aks-node-pool  main    push       6m']],
        ['The apply job was cancelled mid-run, so Terraform never released the blob lease on the state file.',
          ['$ az storage blob show --container-name tfstate --name prod.tfstate \\', '    --account-name sttfstateprod --query properties.lease', '{ "duration": "infinite", "state": "leased", "status": "locked" }']],
        ['With no run in progress, release the lock using its ID, then re-run plan to see whether the cancelled apply left partial changes.',
          ['$ terraform force-unlock 3f2a1c9e-8b7d-4e21-9a0f-5c6b7d8e9f10', 'Terraform state has been successfully unlocked!', '$ terraform plan -detailed-exitcode', 'Plan: 1 to add, 0 to change, 0 to destroy.']],
        ['Stop concurrent and abandoned applies.',
          ['• Pipeline concurrency group per state file', '• Job timeouts longer than the slowest expected apply', '• Restrict force-unlock to a break-glass role', '• Blob versioning on the state container for recovery']]
      ]
    },
    {
      id: 'drift', tab: 'Infrastructure drift', area: 'Terraform', sev: 'Drift',
      steps: [
        ['The nightly drift job reports that production no longer matches code.',
          ['$ terraform plan -detailed-exitcode -lock=false', '  # azurerm_network_security_group.app will be updated in-place', '  ~ security_rule {', '      - name                  = "allow-temp-3389"', '      - destination_port_range = "3389"', '      - source_address_prefix  = "*"', '    }', 'exit code: 2  (changes present)']],
        ['Find who changed the resource and when using the Activity Log.',
          ['$ az monitor activity-log list --resource-group rg-app-prod --offset 2d \\', '    --query "[?contains(operationName.value,\'securityRules/write\')].{who:caller,when:eventTimestamp}"', '[ { "who": "ops-engineer@contoso.com", "when": "2026-11-05T19:42:11Z" } ]']],
        ['An engineer opened RDP from any source in the portal during troubleshooting and never removed it — a manual change outside the pipeline, and a security exposure.',
          ['source_address_prefix = "*"   →  internet-facing RDP']],
        ['Revert by applying the code (the rule is removed), and confirm with a clean plan.',
          ['$ terraform apply tfplan', 'Apply complete! Resources: 0 added, 1 changed, 0 destroyed.', '$ terraform plan -detailed-exitcode', 'No changes. Your infrastructure matches the configuration.']],
        ['Make the safe path the easy path.',
          ['• Azure Policy: deny inbound 3389/22 from "*"', '• Portal write access removed; changes go through pipeline', '• Use Bastion / JIT access for troubleshooting', '• Drift alerts routed to the owning team with an SLA']]
      ]
    },
    {
      id: 'cpu', tab: 'High CPU & autoscaling', area: 'AKS', sev: 'SEV-3',
      steps: [
        ['Latency rises during a traffic spike. The HPA is already at its maximum and new pods stay Pending.',
          ['$ kubectl get hpa catalog-api -n shop', 'NAME          REFERENCE                TARGETS    MINPODS  MAXPODS  REPLICAS', 'catalog-api   Deployment/catalog-api   cpu: 96%/70%   3        20       20', '$ kubectl get pods -n shop --field-selector=status.phase=Pending | wc -l', '6']],
        ['Pending pods mean the scheduler has no room. Check events and the Cluster Autoscaler status.',
          ['$ kubectl describe pod catalog-api-6d4b7-x9k2l -n shop | tail -3', '  Warning  FailedScheduling  0/8 nodes are available: 8 Insufficient cpu.', '  Normal   NotTriggerScaleUp  pod didn\'t trigger scale-up: 1 max node group size reached']],
        ['The user node pool was capped at 8 nodes. Pods scaled correctly, but nodes could not follow — a capacity limit, not an application bug.',
          ['$ az aks nodepool show -g rg-aks-prod --cluster-name aks-prod-01 -n userpool \\', '    --query "{min:minCount,max:maxCount,count:count}"', '{ "min": 3, "max": 8, "count": 8 }']],
        ['Raise the node pool ceiling within the approved budget; pods schedule and latency recovers.',
          ['$ az aks nodepool update -g rg-aks-prod --cluster-name aks-prod-01 -n userpool \\', '    --update-cluster-autoscaler --min-count 3 --max-count 14', '$ kubectl get hpa catalog-api -n shop', 'catalog-api   cpu: 64%/70%   3   20   14']],
        ['See the ceiling coming.',
          ['• Alert when HPA replicas = maxReplicas for 10 min', '• Alert on node pool count at max', '• Capacity review before known traffic events', '• Right-size CPU requests from observed p95 usage']]
      ]
    },
    {
      id: 'memory', tab: 'Node memory pressure', area: 'AKS', sev: 'SEV-3',
      steps: [
        ['Pods on one node are being evicted and rescheduled repeatedly.',
          ['$ kubectl get events -A --field-selector reason=Evicted | tail -2', 'shop   Warning  Evicted  pod/report-worker-5f7c-abc12  The node was low on resource: memory.', 'shop   Warning  Evicted  pod/report-worker-5f7c-def34  The node was low on resource: memory.']],
        ['Confirm the node condition and see what is using memory.',
          ['$ kubectl describe node aks-userpool-31415-vmss000004 | grep MemoryPressure', '  MemoryPressure   True   KubeletHasInsufficientMemory', '$ kubectl top pods -n shop --sort-by=memory | head -3', 'NAME                          CPU   MEMORY', 'report-worker-5f7c-zz9k1      310m  5120Mi']],
        ['report-worker had no memory request or limit (BestEffort QoS). The scheduler packed it onto a node assuming zero memory, and it grew until the kubelet started evicting.',
          ['$ kubectl get pod report-worker-5f7c-zz9k1 -n shop -o jsonpath="{.status.qosClass}"', 'BestEffort']],
        ['Set requests and limits from observed usage, redeploy, and let the node recover.',
          ['resources:', '  requests: { cpu: 250m, memory: 1Gi }', '  limits:   { memory: 2Gi }', '$ kubectl rollout status deploy/report-worker -n shop', 'deployment "report-worker" successfully rolled out']],
        ['Never schedule blind again.',
          ['• LimitRange with default requests per namespace', '• Policy that rejects pods without memory requests', '• Alert on node MemoryPressure and eviction events', '• Review requests vs usage monthly']]
      ]
    },
    {
      id: 'tls', tab: 'Alert → expired certificate', area: 'Monitoring', sev: 'SEV-2',
      steps: [
        ['The availability alert fires: external checks against the public API fail, while internal health checks stay green.',
          ['ALERT firing: ApiAvailabilityExternal < 99% (5m)', 'ALERT firing: CheckoutErrorBudgetFastBurn (burn rate 22×)']],
        ['Internal checks bypass TLS at the edge, so look at the edge. Inspect the certificate being served.',
          ['$ curl -sv https://api.contoso.example/health 2>&1 | grep -i "expire"', '*  expire date: Nov  6 23:59:59 2026 GMT', '*  SSL certificate problem: certificate has expired']],
        ['The certificate in Key Vault was set to auto-renew, but renewal failed because the issuer integration credential had expired. No one was alerted on the failed renewal.',
          ['$ az keyvault certificate show --vault-name kv-edge-prod -n api-cert --query "attributes.expires"', '"2026-11-06T23:59:59+00:00"']],
        ['Renew and import a valid certificate, let the gateway pick up the new version, then confirm externally.',
          ['$ az keyvault certificate import --vault-name kv-edge-prod -n api-cert -f api-2027.pfx', '$ curl -sI https://api.contoso.example/health | head -1', 'HTTP/2 200']],
        ['Expiry should never be a surprise.',
          ['• Certificate-expiry alerts at 30 / 14 / 7 days', '• Alert on failed auto-renewal events, not just expiry', '• External synthetic checks that validate TLS', '• Track issuer credential expiry like any other secret']]
      ]
    }
  ];

  var pbTabs = $('#pb-tabs'), pbBody = $('#pb-body');
  if (pbTabs && pbBody) {
    var pbCur = 0, stCur = 0;
    pbTabs.innerHTML = PLAYBOOKS.map(function (p, i) {
      return '<button type="button" role="tab" class="pb-tab" id="pbt-' + p.id + '" aria-controls="pb-body" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '">' + esc(p.tab) + '</button>';
    }).join('');
    var pbt = $$('.pb-tab', pbTabs);
    pbt.forEach(function (t, i) {
      t.addEventListener('click', function () { selectPb(i, false); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % pbt.length; else if (e.key === 'ArrowLeft') n = (i - 1 + pbt.length) % pbt.length;
        else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = pbt.length - 1;
        if (n !== null) { e.preventDefault(); selectPb(n, true); }
      });
    });
    function selectPb(i, focus) {
      pbCur = i; stCur = 0;
      pbt.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      pbBody.setAttribute('aria-labelledby', pbt[i].id);
      if (focus) pbt[i].focus();
      renderPb();
    }
    function renderPb() {
      var p = PLAYBOOKS[pbCur], st = p.steps[stCur];
      pbBody.innerHTML =
        '<div class="pb-meta"><span class="pill muted">' + esc(p.area) + '</span><span class="pill ' + (p.sev === 'SEV-2' ? 'crit' : 'warn') + '">' + esc(p.sev) + '</span><span class="pb-sample mono">sample data</span></div>' +
        '<ol class="pb-stages">' + STAGES.map(function (s, k) {
          return '<li><button type="button" class="pb-stage' + (k < stCur ? ' done' : '') + '"' + (k === stCur ? ' aria-current="step"' : '') + ' data-st="' + k + '"><span class="mono">' + (k + 1) + '</span>' + s + '</button></li>';
        }).join('') + '</ol>' +
        '<div class="pb-content" aria-live="polite"><h4>' + STAGES[stCur] + '</h4><p>' + esc(st[0]) + '</p>' +
        '<pre class="pb-term" tabindex="0" aria-label="Sample terminal output"><code>' + st[1].map(esc).join('\n') + '</code></pre></div>' +
        '<div class="pb-nav"><button type="button" class="btn btn-sm btn-ghost" id="pb-prev"' + (stCur === 0 ? ' disabled' : '') + '>Previous</button>' +
        '<button type="button" class="btn btn-sm btn-primary" id="pb-next">' + (stCur === STAGES.length - 1 ? 'Next scenario' : 'Next: ' + STAGES[stCur + 1]) + '</button></div>';
      $$('.pb-stage', pbBody).forEach(function (b) { b.addEventListener('click', function () { stCur = +b.dataset.st; renderPb(); }); });
      $('#pb-prev').addEventListener('click', function () { stCur--; renderPb(); $('#pb-prev').focus(); });
      $('#pb-next').addEventListener('click', function () {
        if (stCur === STAGES.length - 1) selectPb((pbCur + 1) % PLAYBOOKS.length, true);
        else { stCur++; renderPb(); $('#pb-next').focus(); }
      });
    }
    selectPb(0, false);
  }
})();
