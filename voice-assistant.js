/*!
 * Portfolio AI Voice Assistant
 * For: https://vamsikrishna85.github.io/my-profile/
 * Uses the Web Speech API (speechSynthesis + optional SpeechRecognition).
 * No dependencies. Drop in with voice-assistant.css.
 */
(function () {
  'use strict';
  if (window.__portfolioVoiceAssistant) return;
  window.__portfolioVoiceAssistant = true;

  /* ------------------------------------------------------------------ *
   * 1. CONFIG — tweak behaviour here
   * ------------------------------------------------------------------ */
  var CONFIG = {
    autoWelcome: true,        // try to start the tour automatically
    autoWelcomeDelay: 1200,   // ms after page load
    oncePerSession: true,     // don't auto-play again on reloads in the same tab session
    rate: 1.0,                // 0.8 – 1.2 sounds most natural
    pitch: 1.0,
    followAlong: true,        // scroll to each section as it is narrated
    // MALE voices only, highest quality first. Matched with "contains", case-insensitive.
    preferredVoices: [
      'Microsoft Andrew Online (Natural)', 'Microsoft Guy Online (Natural)',
      'Microsoft Brian Online (Natural)', 'Microsoft Christopher Online (Natural)',
      'Microsoft Eric Online (Natural)', 'Microsoft Ryan Online (Natural)',
      'Microsoft Prabhat Online (Natural)', 'Microsoft Steffan Online (Natural)',
      'Google UK English Male',
      'Daniel (Enhanced)', 'Daniel (Premium)', 'Aaron', 'Daniel', 'Rishi', 'Arthur', 'Oliver', 'Alex', 'Tom', 'Fred',
      'Microsoft Ravi', 'Microsoft George', 'Microsoft Mark', 'Microsoft David'
    ],
    // Used to keep female voices out of the selection and the dropdown.
    femaleVoices: /female|aria|jenny|ava\b|emma|sonia|neerja|libby|michelle|ana\b|natasha|clara|zira|hazel|susan|heera|samantha|karen|serena|moira|tessa|fiona|victoria|veena|allison|kate|nicky|zoe|catherine|isha|google us english/i
  };

  /* ------------------------------------------------------------------ *
   * 2. SCRIPT — narration taken from the portfolio content
   *    target: CSS selector of the section, or {heading:'...'} text match
   * ------------------------------------------------------------------ */
  var CHAPTERS = [
    { key: 'welcome', label: 'Welcome', target: '#home', lines: [
      "Hello! Welcome to Vamsi Krishna's professional portfolio.",
      "I'm your AI virtual assistant.",
      "Let me walk you through his experience, technical expertise, projects, and professional achievements."
    ]},
    { key: 'intro', label: 'Introduction', target: '#home', lines: [
      "Vamsi Krishna Gollapudi is an Azure DevOps Engineer and Site Reliability Engineer based in Bengaluru, India.",
      "He brings 9+ years of IT experience across enterprise infrastructure, Azure cloud engineering, CI/CD automation, Kubernetes operations, and site reliability engineering.",
      "His clients span life sciences, banking, and asset management.",
      "He focuses on engineering reliable Azure platforms, automated delivery pipelines, and scalable cloud infrastructure.",
      "Career highlights include 99.95% platform availability, a ~35% reduction in MTTR, and 160+ servers migrated to Azure."
    ]},
    { key: 'journey', label: 'Career journey', target: '#about', lines: [
      "His career runs from the server room to the control plane.",
      "From 2015 to 2020, he worked in systems administration, running 150+ Linux and Windows servers for 1,200 users at 99.9% uptime.",
      "From 2020 to 2023, he moved into cloud infrastructure: Azure migrations, landing-zone foundations, and hub-and-spoke networking.",
      "In 2024, he specialised in Azure DevOps, building multi-stage YAML pipelines for 35+ banking services.",
      "Since 2025, he has worked in site reliability engineering: SLOs, error budgets, production AKS clusters, observability, and incident response."
    ]},
    { key: 'experience', label: 'Experience', target: '#experience', lines: [
      "Here is his professional experience.",
      "Since January 2025, he has been a Site Reliability Engineer at Nexamatic in Bengaluru, serving life-sciences clients IQVIA and Adamas.",
      "He designed and operates a multi-subscription Azure landing zone, with 8 subscriptions and 600+ resources, sustaining 99.95% availability.",
      "He led the migration of ~120 repositories and 45 teams from Azure Repos to GitHub Enterprise, with under 30 minutes of total developer downtime.",
      "He runs 6 production AKS clusters with 180+ nodes, delivering quarterly upgrades with zero customer-facing outages.",
      "He also built an SRE practice on SLIs, SLOs, error budgets, and 40+ runbooks, reducing MTTR by ~35%.",
      "Before that, from April 2024 to January 2025, he was an Azure DevOps Engineer at Kumaran Systems for the bank CIBC.",
      "There he built pipelines for 35+ banking services with 100% audit traceability, cut environment setup from ~3 days to 4 hours with Terraform, and raised deployments from bi-weekly to 3 releases per week.",
      "From May 2022 to June 2023, he was a Cloud Infrastructure Engineer at UST Global for Schroders, rehosting 45 on-premises servers to Azure with zero data loss and lowering monthly Azure spend by ~18%.",
      "From December 2020 to April 2021, he was a Tech Lead at Cognizant for Bayer, leading a 5-member team through the migration of 120 servers with 98% first-attempt cutover success.",
      "And from 2015 to 2020, he was a System Administrator at Anewa Engineering, maintaining 99.9% uptime and 97% patch compliance."
    ]},
    { key: 'skills', label: 'Skills', target: '#expertise', lines: [
      "Now, his technical expertise.",
      "On Microsoft Azure: virtual machines, virtual networks, Application Gateway, Entra ID, Key Vault, Azure Monitor, App Service, Functions, and Azure Policy.",
      "For DevOps and CI/CD: Azure DevOps, Azure Pipelines, GitHub Enterprise, GitHub Actions, multi-stage YAML pipelines, and SonarQube.",
      "For Infrastructure as Code: Terraform, Bicep, ARM templates, and Ansible.",
      "For Kubernetes and containers: AKS, Docker, Helm, NGINX Ingress, and autoscaling.",
      "For SRE and observability: Prometheus, Grafana, Application Insights, Log Analytics with KQL, and Splunk.",
      "For security and governance: Azure RBAC, Defender for Cloud, managed identities, Conditional Access, and pipeline security scanning.",
      "And for automation: Linux, Windows Server, Active Directory, Bash, PowerShell, and Python."
    ]},
    { key: 'projects', label: 'Projects', target: '#work', lines: [
      "Next, his selected engineering work, presented as six case studies.",
      "One: an Enterprise Azure Landing Zone, a governed multi-subscription foundation built with Terraform, Bicep, and Azure Policy, managing 600+ resources.",
      "Two: Enterprise CI/CD Modernization, moving ~120 repositories and 45 teams to GitHub Enterprise and GitHub Actions with near-zero disruption.",
      "Three: Production AKS Operations, running six production clusters with upgrades customers never notice.",
      "Four: SRE Observability and Incident Response, with SLOs, 150+ actionable alert rules, runbooks, and blameless reviews.",
      "Five: Azure Cloud Migration, rehosting 160+ servers in planned waves with zero data loss and 98% first-attempt cutover success.",
      "Six: Azure Cost Optimization, lowering monthly Azure spend by ~18% and non-production compute cost by 22%.",
      "He also publishes open-source reference implementations on GitHub, including a Terraform landing zone, a GitHub Actions to AKS delivery pipeline, and reusable Azure DevOps pipeline templates.",
      "You can explore his interactive Architecture Lab, and an SRE Operations Lab that simulates a production incident end to end."
    ]},
    { key: 'impact', label: 'Achievements', target: { heading: 'Outcomes, measured' }, lines: [
      "Here are some of his measured achievements.",
      "40% less alert noise across 150+ alert rules.",
      "200+ vulnerable builds blocked before production by pipeline security gates.",
      "Microsoft Defender for Cloud Secure Score raised from 62% to 85%, with 98% tagging compliance.",
      "New-service onboarding cut from 3 days to 4 hours after converting 60+ classic pipelines.",
      "100% of environments under Infrastructure as Code with nightly drift detection.",
      "And zero customer-facing outages across quarterly AKS upgrades."
    ]},
    { key: 'certs', label: 'Certifications', target: '#certifications', lines: [
      "He is Microsoft certified as an Azure Administrator Associate, AZ-104, and in Azure Fundamentals, AZ-900.",
      "He also holds the Kubernetes and Cloud Native Associate certification, KCNA, from The Linux Foundation.",
      "He has a Master of Computer Applications from JNTU Hyderabad, and a Bachelor of Science in Computer Science from Acharya Nagarjuna University.",
      "He speaks English, Hindi, and Telugu."
    ]},
    { key: 'contact', label: 'Contact', target: '#contact', lines: [
      "Vamsi Krishna is open to Senior Azure DevOps, SRE, Cloud Platform, and AKS Platform Engineering roles, remote or in Bengaluru, with a 15-day notice period.",
      "You can email him, connect on LinkedIn or GitHub, or download his resume from this section.",
      "Thank you for visiting! Feel free to explore, and tap the assistant anytime to hear this tour again."
    ]}
  ];

  // How abbreviations should be spoken (captions keep the written form).
  var PRONUNCIATION = [
    [/\bAZ-104\b/g, 'A Z 1 0 4'], [/\bAZ-900\b/g, 'A Z 900'],
    [/\bKCNA\b/g, 'K C N A'], [/\bAKS\b/g, 'A K S'], [/\bCI\/CD\b/g, 'C I C D'],
    [/\bSLOs\b/g, 'S L Os'], [/\bSLIs\b/g, 'S L Is'], [/\bSRE\b/g, 'S R E'],
    [/\bMTTR\b/g, 'mean time to recovery'], [/\bKQL\b/g, 'K Q L'],
    [/\bJNTU\b/g, 'J N T U'], [/\bYAML\b/g, 'yammel'], [/\bRBAC\b/g, 'R back'],
    [/\bNGINX\b/g, 'engine X'], [/\bIQVIA\b/g, 'I Q V I A'], [/\bCIBC\b/g, 'C I B C'],
    [/\bARM\b/g, 'arm'], [/\bUST\b/g, 'U S T'], [/\bGollapudi\b/g, 'Golla-poodi'],
    [/~/g, 'about '], [/(\d[\d,.]*)\+/g, '$1 plus'], [/(\d[\d.]*)%/g, '$1 percent'],
    [/\bbi-weekly\b/g, 'bi weekly']
  ];

  /* ------------------------------------------------------------------ *
   * 3. STATE
   * ------------------------------------------------------------------ */
  var synth = window.speechSynthesis;
  var hasTTS = !!(synth && window.SpeechSynthesisUtterance);
  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  var LINES = [];
  CHAPTERS.forEach(function (ch, ci) {
    ch.start = LINES.length;
    ch.lines.forEach(function (text) { LINES.push({ text: text, chapter: ci }); });
  });

  var store = {
    get: function (s, k) { try { return window[s].getItem(k); } catch (e) { return null; } },
    set: function (s, k, v) { try { window[s].setItem(k, v); } catch (e) {} }
  };

  var state = {
    idx: 0,
    playing: false,
    done: false,
    muted: store.get('localStorage', 'va-muted') === '1',
    follow: store.get('localStorage', 'va-follow') !== '0' && CONFIG.followAlong,
    open: false,
    listening: false,
    token: 0,
    timer: null,
    voice: null,
    voices: [],
    lastChapter: -1,
    lastUserScroll: 0,
    armed: false
  };

  /* ------------------------------------------------------------------ *
   * 4. VOICES
   * ------------------------------------------------------------------ */
  function englishVoices() {
    return (synth ? synth.getVoices() : []).filter(function (v) { return /^en([-_]|$)/i.test(v.lang); });
  }

  function scoreVoice(v) {
    var n = v.name.toLowerCase(), s = 0;
    CONFIG.preferredVoices.forEach(function (p, i) {
      if (n.indexOf(p.toLowerCase()) !== -1) s = Math.max(s, 200 - i * 5);
    });
    if (/natural|neural/.test(n)) s += 60;
    if (/premium|enhanced/.test(n)) s += 45;
    if (/google/.test(n)) s += 30;
    if (/online/.test(n)) s += 10;
    if (/^en[-_](us|gb)/i.test(v.lang)) s += 8;
    if (/^en[-_]in/i.test(v.lang)) s += 6;
    if (/novelty|whisper|zarvox|bells|bubbles|cellos|trinoids|albert|bad news|good news|jester|organ|superstar|wobble|boing|deranged|hysterical/.test(n)) s -= 500;
    return s;
  }

  function isMale(v) {
    var n = v.name.toLowerCase();
    return /\bmale\b/.test(n) || CONFIG.preferredVoices.some(function (p) { return n.indexOf(p.toLowerCase()) !== -1; });
  }

  function loadVoices() {
    var all = englishVoices().sort(function (a, b) { return scoreVoice(b) - scoreVoice(a); });
    var male = all.filter(isMale);
    // Male voices only; if the device has none, fall back to voices not known to be female.
    state.voices = male.length ? male : all.filter(function (v) { return !CONFIG.femaleVoices.test(v.name); });
    var saved = store.get('localStorage', 'va-voice');
    var pick = saved && state.voices.filter(function (v) { return v.name === saved; })[0];
    state.voice = pick || state.voices[0] || null;
    renderVoiceSelect();
  }

  function voicesReady() {
    return new Promise(function (resolve) {
      if (!hasTTS) return resolve();
      if (synth.getVoices().length) return resolve();
      var done = false;
      var finish = function () { if (!done) { done = true; resolve(); } };
      synth.addEventListener('voiceschanged', finish, { once: true });
      setTimeout(finish, 1500);
    });
  }

  function pronounce(text) {
    return PRONUNCIATION.reduce(function (t, r) { return t.replace(r[0], r[1]); }, text);
  }

  /* ------------------------------------------------------------------ *
   * 5. UI
   * ------------------------------------------------------------------ */
  var ICONS = {
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
    play: '<polygon points="7 4 20 12 7 20 7 4" fill="currentColor"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>',
    volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
    mute: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>',
    replay: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    close: '<line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" fill="currentColor" stroke="none"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z" fill="currentColor" stroke="none"/>'
  };
  function icon(name) {
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
  }

  var root, el = {};

  function buildUI() {
    root = document.createElement('div');
    root.className = 'va-root';
    root.setAttribute('data-va', '');
    root.innerHTML =
      '<div class="va-nudge" hidden>' +
        '<button type="button" class="va-nudge-text">' + icon('sparkle') + '<span>Tap to hear a 2-minute guided tour</span></button>' +
        '<button type="button" class="va-nudge-x" aria-label="Dismiss">' + icon('close') + '</button>' +
      '</div>' +
      '<section class="va-panel" role="region" aria-label="AI voice assistant" hidden>' +
        '<header class="va-head">' +
          '<div class="va-orb" aria-hidden="true"><span></span><span></span><span></span><span></span></div>' +
          '<div class="va-titles"><p class="va-title">AI Portfolio Guide</p><p class="va-status">Ready</p></div>' +
          '<button type="button" class="va-icon-btn va-close" aria-label="Close assistant">' + icon('close') + '</button>' +
        '</header>' +
        '<div class="va-caption">' +
          '<p class="va-chapter"></p>' +
          '<p class="va-text" aria-live="off"></p>' +
        '</div>' +
        '<div class="va-progress" aria-hidden="true"><span></span></div>' +
        '<nav class="va-chips" aria-label="Jump to topic"></nav>' +
        '<div class="va-controls">' +
          '<button type="button" class="va-icon-btn va-replay" aria-label="Replay from the beginning" title="Replay">' + icon('replay') + '</button>' +
          '<button type="button" class="va-play" aria-label="Play">' + icon('play') + '</button>' +
          '<button type="button" class="va-icon-btn va-mute" aria-label="Mute" title="Mute">' + icon('volume') + '</button>' +
          '<button type="button" class="va-icon-btn va-ask" aria-label="Ask by voice" title="Ask by voice: say a topic like “projects”" hidden>' + icon('mic') + '</button>' +
        '</div>' +
        '<footer class="va-foot">' +
          '<label class="va-switch"><input type="checkbox" class="va-follow"><span class="va-track"></span>Follow along</label>' +
          '<label class="va-voice-wrap"><span class="va-sr">Voice</span><select class="va-voice" aria-label="Voice"></select></label>' +
        '</footer>' +
      '</section>' +
      '<button type="button" class="va-launcher" aria-label="Open AI voice assistant" aria-expanded="false">' +
        '<span class="va-ring"></span><span class="va-ring va-ring2"></span>' + icon('mic') +
      '</button>';
    document.body.appendChild(root);

    ['nudge', 'nudge-text', 'nudge-x', 'panel', 'status', 'chapter', 'text', 'progress', 'chips',
     'replay', 'play', 'mute', 'ask', 'close', 'follow', 'voice', 'launcher'].forEach(function (k) {
      el[k] = root.querySelector('.va-' + k);
    });
    el.bar = el.progress.querySelector('span');

    el.chips.innerHTML = CHAPTERS.map(function (c, i) {
      return '<button type="button" class="va-chip" data-ch="' + i + '">' + c.label + '</button>';
    }).join('');

    el.launcher.addEventListener('click', function () {
      if (!state.open) { openPanel(); if (!state.playing && state.idx === 0 && !state.done) play(); }
      else closePanel();
    });
    el.close.addEventListener('click', function () { pause(); closePanel(); });
    el.play.addEventListener('click', togglePlay);
    el.replay.addEventListener('click', replay);
    el.mute.addEventListener('click', toggleMute);
    el.chips.addEventListener('click', function (e) {
      var b = e.target.closest('.va-chip'); if (b) jumpTo(+b.dataset.ch);
    });
    el.follow.checked = state.follow;
    el.follow.addEventListener('change', function () {
      state.follow = el.follow.checked; store.set('localStorage', 'va-follow', state.follow ? '1' : '0');
      if (state.follow && state.playing) scrollToChapter(LINES[state.idx].chapter, true);
    });
    el.voice.addEventListener('change', function () {
      state.voice = state.voices.filter(function (v) { return v.name === el.voice.value; })[0] || state.voice;
      store.set('localStorage', 'va-voice', state.voice ? state.voice.name : '');
      if (state.playing && !state.muted) speakLine(state.idx);
    });
    el['nudge-text'].addEventListener('click', function () { disarm(); openPanel(); replay(); });
    el['nudge-x'].addEventListener('click', function () { disarm(); });

    if (Recognition) { el.ask.hidden = false; el.ask.addEventListener('click', listen); }
    if (!hasTTS) { el.voice.parentNode.hidden = true; }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.open) { closePanel(); el.launcher.focus(); }
    });
    ['wheel', 'touchmove'].forEach(function (t) {
      window.addEventListener(t, function () { state.lastUserScroll = Date.now(); }, { passive: true });
    });
    window.addEventListener('pagehide', function () { if (hasTTS) synth.cancel(); });

    watchTheme();
    render();
  }

  function renderVoiceSelect() {
    if (!el.voice) return;
    el.voice.innerHTML = state.voices.map(function (v) {
      var sel = state.voice && v.name === state.voice.name ? ' selected' : '';
      return '<option value="' + v.name.replace(/"/g, '&quot;') + '"' + sel + '>' +
        v.name.replace(/^Microsoft |^Google /, '').replace(/ Online \(Natural\)/, ' (Natural)') + '</option>';
    }).join('');
    el.voice.parentNode.hidden = !state.voices.length;
  }

  function openPanel() {
    state.open = true; el.panel.hidden = false;
    requestAnimationFrame(function () { root.classList.add('va-is-open'); });
    el.launcher.setAttribute('aria-expanded', 'true');
    el.launcher.setAttribute('aria-label', 'Close AI voice assistant');
    el.nudge.hidden = true;
  }
  function closePanel() {
    state.open = false; root.classList.remove('va-is-open');
    el.launcher.setAttribute('aria-expanded', 'false');
    el.launcher.setAttribute('aria-label', 'Open AI voice assistant');
    setTimeout(function () { if (!state.open) el.panel.hidden = true; }, 220);
  }

  function render() {
    var line = LINES[state.idx], ch = CHAPTERS[line.chapter];
    el.chapter.textContent = (line.chapter + 1) + ' / ' + CHAPTERS.length + ' · ' + ch.label;
    el.text.textContent = line.text;
    el.bar.style.width = (state.done ? 100 : (state.idx / LINES.length) * 100) + '%';
    el.status.textContent = state.listening ? 'Listening…' :
      state.done ? 'Tour complete' :
      state.playing ? (state.muted ? 'Muted · captions only' : 'Speaking') :
      state.idx > 0 ? 'Paused' : 'Ready';
    el.play.innerHTML = icon(state.playing ? 'pause' : 'play');
    el.play.setAttribute('aria-label', state.playing ? 'Pause' : (state.done ? 'Play again' : 'Play'));
    el.mute.innerHTML = icon(state.muted ? 'mute' : 'volume');
    el.mute.setAttribute('aria-label', state.muted ? 'Unmute' : 'Mute');
    el.mute.setAttribute('aria-pressed', String(state.muted));
    el.mute.title = state.muted ? 'Unmute' : 'Mute';
    el.ask.classList.toggle('va-active', state.listening);
    root.classList.toggle('va-speaking', state.playing && !state.muted);
    root.classList.toggle('va-active-tour', state.playing);
    [].forEach.call(el.chips.children, function (b, i) {
      var on = i === line.chapter;
      b.classList.toggle('va-on', on);
      if (on) {
        b.setAttribute('aria-current', 'true');
        // keep the active topic visible in the horizontally scrolling chip row
        var row = el.chips, left = b.offsetLeft - (row.clientWidth - b.offsetWidth) / 2;
        if (row.scrollTo) row.scrollTo({ left: Math.max(0, left), behavior: 'smooth' }); else row.scrollLeft = left;
      } else b.removeAttribute('aria-current');
    });
  }

  /* ------------------------------------------------------------------ *
   * 6. THEME — follows the portfolio's light/dark toggle automatically
   * ------------------------------------------------------------------ */
  function luminance(color) {
    var m = color && color.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var p = m[1].split(',').map(parseFloat);
    if (p.length === 4 && p[3] === 0) return null;
    return (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
  }
  function applyTheme() {
    var html = document.documentElement, body = document.body;
    var attr = html.getAttribute('data-theme') || body.getAttribute('data-theme');
    var dark;
    if (attr === 'dark' || attr === 'light') dark = attr === 'dark';
    else if (html.classList.contains('dark') || body.classList.contains('dark')) dark = true;
    else {
      var l = luminance(getComputedStyle(body).backgroundColor);
      if (l === null) l = luminance(getComputedStyle(html).backgroundColor);
      dark = l === null ? window.matchMedia('(prefers-color-scheme: dark)').matches : l < 0.45;
    }
    root.classList.toggle('va-dark', dark);
  }
  function watchTheme() {
    applyTheme();
    var mo = new MutationObserver(function () { setTimeout(applyTheme, 30); });
    var opts = { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] };
    mo.observe(document.documentElement, opts);
    mo.observe(document.body, opts);
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', applyTheme);
  }

  /* ------------------------------------------------------------------ *
   * 7. NAVIGATION — scroll to the section being narrated
   * ------------------------------------------------------------------ */
  function findTarget(t) {
    if (!t) return null;
    if (typeof t === 'string') return document.querySelector(t);
    var hs = document.querySelectorAll('h1, h2, h3');
    for (var i = 0; i < hs.length; i++) {
      if (hs[i].textContent.indexOf(t.heading) !== -1) return hs[i].closest('section') || hs[i];
    }
    return null;
  }
  function headerOffset() {
    var h = document.querySelector('body > header, header[role="banner"], .site-header, nav');
    if (!h) return 16;
    var pos = getComputedStyle(h).position;
    return (pos === 'fixed' || pos === 'sticky') ? h.getBoundingClientRect().height + 12 : 16;
  }
  function scrollToChapter(ci, force) {
    if (!state.follow) return;
    if (!force && Date.now() - state.lastUserScroll < 5000) return; // visitor is scrolling — don't fight them
    var target = findTarget(CHAPTERS[ci].target);
    if (!target) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var y = target.getBoundingClientRect().top + window.pageYOffset - headerOffset();
    window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
  }

  /* ------------------------------------------------------------------ *
   * 8. PLAYBACK ENGINE (sentence queue → reliable pause/resume everywhere)
   * ------------------------------------------------------------------ */
  function clearPending() {
    state.token++;
    clearTimeout(state.timer);
    if (hasTTS && (synth.speaking || synth.pending)) synth.cancel();
  }

  function estimate(text) {
    return Math.max(1800, text.split(/\s+/).length * 340 / CONFIG.rate);
  }

  function speakLine(i, opts) {
    opts = opts || {};
    clearPending();
    var t = state.token;
    state.idx = i; state.done = false;
    var line = LINES[i];
    if (line.chapter !== state.lastChapter) {
      state.lastChapter = line.chapter;
      scrollToChapter(line.chapter);
    }
    render();

    if (state.muted || !hasTTS) {
      state.timer = setTimeout(function () { if (t === state.token) next(); }, estimate(line.text));
      return;
    }

    // Short delay after cancel() avoids a Chrome bug where the next utterance is dropped.
    state.timer = setTimeout(function () {
      if (t !== state.token) return;
      var u = new SpeechSynthesisUtterance(pronounce(line.text));
      if (state.voice) { u.voice = state.voice; u.lang = state.voice.lang; } else { u.lang = 'en-US'; }
      u.rate = CONFIG.rate; u.pitch = CONFIG.pitch; u.volume = 1;
      var started = false;
      u.onstart = function () { started = true; };
      u.onend = function () { if (t === state.token) next(); };
      u.onerror = function (e) {
        if (t !== state.token) return;
        if (e.error === 'not-allowed') return blocked();
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        next();
      };
      if (synth.paused) synth.resume();
      synth.speak(u);
      if (opts.autoplayCheck) {
        setTimeout(function () {
          if (t === state.token && !started && !synth.speaking) blocked();
        }, 2500);
      }
    }, 60);
  }

  function next() {
    if (state.idx + 1 < LINES.length) speakLine(state.idx + 1);
    else finish();
  }
  function finish() {
    clearPending();
    state.playing = false; state.done = true;
    render();
  }
  function play() {
    if (state.done) return replay();
    state.playing = true;
    speakLine(state.idx);
  }
  function pause() {
    clearPending();
    state.playing = false;
    render();
  }
  function togglePlay() { state.playing ? pause() : play(); }
  function replay() {
    state.playing = true; state.lastChapter = -1;
    speakLine(0);
  }
  function jumpTo(ci) {
    state.playing = true; state.lastChapter = -1;
    state.lastUserScroll = 0;
    speakLine(CHAPTERS[ci].start);
  }
  function toggleMute() {
    state.muted = !state.muted;
    store.set('localStorage', 'va-muted', state.muted ? '1' : '0');
    if (state.playing) speakLine(state.idx); else render();
  }

  /* ------------------------------------------------------------------ *
   * 9. AUTO-WELCOME — browsers only allow speech after a user gesture,
   *    so we try immediately and otherwise start on the first interaction.
   * ------------------------------------------------------------------ */
  function blocked() {
    clearPending();
    state.playing = false;
    render();
    arm();
  }
  function onFirstGesture(e) {
    if (root.contains(e.target)) return;        // widget buttons handle themselves
    if (e.type === 'keydown' && (e.key === 'Escape' || e.key === 'Tab' || e.metaKey || e.ctrlKey)) return;
    disarm();
    openPanel();
    replay();
  }
  function arm() {
    if (state.armed) return;
    state.armed = true;
    el.nudge.hidden = state.open;
    ['click', 'keydown', 'touchend'].forEach(function (t) { document.addEventListener(t, onFirstGesture, true); });
  }
  function disarm() {
    state.armed = false;
    el.nudge.hidden = true;
    store.set('sessionStorage', 'va-welcomed', '1');
    ['click', 'keydown', 'touchend'].forEach(function (t) { document.removeEventListener(t, onFirstGesture, true); });
  }

  function autoWelcome() {
    if (!CONFIG.autoWelcome) return;
    if (CONFIG.oncePerSession && store.get('sessionStorage', 'va-welcomed') === '1') return;
    if (!hasTTS) { el.nudge.hidden = false; return; }
    var ua = navigator.userActivation;
    if (ua && !ua.hasBeenActive) { arm(); return; } // speech is certain to be blocked until a gesture
    store.set('sessionStorage', 'va-welcomed', '1');
    openPanel();
    state.playing = true; state.lastChapter = 0; // stay at the top for the welcome
    speakLine(0, { autoplayCheck: true });
  }

  /* ------------------------------------------------------------------ *
   * 10. VOICE COMMANDS (mic) — "experience", "skills", "projects", ...
   * ------------------------------------------------------------------ */
  var COMMANDS = [
    [/\b(stop|pause|quiet|silence)\b/, function () { pause(); }],
    [/\b(start over|restart|replay|again|beginning)\b/, function () { replay(); }],
    [/\b(resume|continue|play|go on)\b/, function () { play(); }],
    [/\b(experience|work history|jobs?|career|employ)/, function () { jumpTo(3); }],
    [/\b(skill|expertise|tech|stack|tools?)/, function () { jumpTo(4); }],
    [/\b(project|case stud|portfolio work|engineering work)/, function () { jumpTo(5); }],
    [/\b(achievement|impact|outcome|result)/, function () { jumpTo(6); }],
    [/\b(certif|education|degree|qualif)/, function () { jumpTo(7); }],
    [/\b(contact|email|hire|reach|resume|linkedin)/, function () { jumpTo(8); }],
    [/\b(journey|about|background|history)/, function () { jumpTo(2); }],
    [/\b(who|introduc|summary|overview)/, function () { jumpTo(1); }]
  ];
  function listen() {
    if (state.listening) return;
    var wasPlaying = state.playing;
    pause();
    var rec = new Recognition();
    rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 3;
    state.listening = true; render();
    el.text.textContent = 'Say a topic: experience, skills, projects, achievements, certifications or contact.';
    var handled = false;
    rec.onresult = function (e) {
      var said = [].map.call(e.results[0], function (a) { return a.transcript.toLowerCase(); }).join(' | ');
      for (var i = 0; i < COMMANDS.length; i++) {
        if (COMMANDS[i][0].test(said)) { handled = true; COMMANDS[i][1](); return; }
      }
    };
    rec.onend = rec.onerror = function () {
      if (!state.listening) return;
      state.listening = false;
      if (!handled) { if (wasPlaying) play(); else render(); }
      else render();
    };
    try { rec.start(); } catch (err) { state.listening = false; render(); }
  }

  /* ------------------------------------------------------------------ *
   * 11. BOOT
   * ------------------------------------------------------------------ */
  function boot() {
    buildUI();
    voicesReady().then(function () {
      loadVoices();
      if (hasTTS) synth.addEventListener('voiceschanged', loadVoices);
      setTimeout(autoWelcome, CONFIG.autoWelcomeDelay);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
