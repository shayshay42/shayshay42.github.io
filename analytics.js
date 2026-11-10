// Site analytics run only on the published notebook, never in local previews.
(() => {
  if (location.hostname !== 'shayshay42.github.io' || location.protocol !== 'https:') return;
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;

  const pending = [];
  let unavailable = false;
  let startObserver;

  // Event names are fixed below. No input values or file contents are collected.
  function record(name) {
    if (unavailable) return;
    if (typeof window.umami?.track !== 'function') {
      if (pending.length < 20) pending.push(name);
      return;
    }
    try {
      Promise.resolve(window.umami.track(name)).catch(() => {});
    } catch {
      // Tracking must not interrupt navigation or the playgrounds.
    }
  }

  const tracker = document.createElement('script');
  tracker.src = 'https://cloud.umami.is/script.js';
  tracker.async = true;
  tracker.dataset.websiteId = '42412014-5b93-4857-9db8-9bb357a3c29b';
  tracker.dataset.domains = 'shayshay42.github.io';
  tracker.dataset.excludeSearch = 'true';
  tracker.dataset.excludeHash = 'true';
  tracker.dataset.doNotTrack = 'true';
  tracker.onload = () => {
    if (typeof window.umami?.track !== 'function') {
      unavailable = true;
      pending.length = 0;
      startObserver?.disconnect();
      return;
    }
    pending.splice(0).forEach(record);
  };
  tracker.onerror = () => {
    unavailable = true;
    pending.length = 0;
    startObserver?.disconnect();
  };
  document.head.append(tracker);

  const projectEvents = {
    'voice-laser-lab': 'Open Voice Laser Lab',
    'stereogram-runner': 'Open Stereogram Runner',
    'mol-cgl': 'Open Molecular Game of Life',
    readtheroom: 'Open Read the Room',
    rizome: 'Open Rizome Biotech',
  };

  function trackLink(event) {
    if (event.type === 'click' ? event.button !== 0 : event.button !== 1) return;
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link) return;
    const url = new URL(link.href);
    const cv = url.origin === location.origin && url.pathname.match(/^\/assets\/cv\/shayan-hajhashemi-cv-(en|fr)\.pdf$/);
    if (cv) {
      record(cv[1] === 'en' ? 'CV English' : 'CV French');
    } else if (link.matches('.project-link')) {
      const name = projectEvents[link.querySelector('[data-project]')?.dataset.project];
      if (name) record(name);
    }
  }
  document.addEventListener('click', trackLink);
  document.addEventListener('auxclick', trackLink);

  // Observe successful starts, including keyboard controls, once per page load.
  const starts = {
    '/projects/molecular-game-of-life/': {
      name: 'Start Molecular Game of Life',
      active: () => document.getElementById('simulation-status')?.textContent.trim() === 'Playing',
    },
    '/projects/stereogram-runner/': {
      name: 'Start Stereogram Runner',
      active: () => document.querySelector('[data-testid="runner"][data-status="running"]'),
    },
    '/projects/voice-laser-lab/': {
      name: 'Start Voice Laser Lab',
      active: () => document.querySelector('[data-testid="app-status"] .status-dot.active'),
    },
  };
  const start = starts[location.pathname.replace(/index\.html$/, '')];
  if (start) {
    const check = () => {
      if (!start.active()) return;
      startObserver.disconnect();
      record(start.name);
    };
    startObserver = new MutationObserver(check);
    startObserver.observe(document.body, {
      subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'data-status'],
    });
    check();
  }
})();
