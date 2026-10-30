(() => {
  // Cijfers zoals "7,5" of "10,0", letters O / V / G / U en niveaus A1-C2
  const GRADE_RE = /^((10|[1-9])[,.]\d|[OVGU]|[A-Ca-c][12]([\s\/-]*[A-Ca-c][12])?)$/;
  const isLetter = (g) => /^[OVGU]$/.test(g);
  const isCefr = (g) => /^[ABC][12]([\/-]?[ABC][12])?$/.test(g); // ook B2C1, B2-C1, B2/C1
  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  const TOTAL = 70;
  const WIN_INDEX = 55;
  const DURATION = 7000;

  // Pagina's waar cijfers verstopt worden: de cijferpagina en de startpagina
  // (met de laatste resultaten). Pas dit aan als jouw SOMtoday andere URL's gebruikt.
  const PAGE_RE = /(cijfers|resultaten|start|home)/i;
  const onGradesPage = () => {
    const path = location.pathname + location.hash;
    return path === '/' || PAGE_RE.test(path);
  };

  // Zeldzaamheid op basis van cijfer (CS-kleuren)
  function rarity(g) {
    if (isCefr(g)) return { A1: 'grey', A2: 'blue', B1: 'purple', B2: 'pink', C1: 'red', C2: 'gold' }[g.slice(-2)]; // kleur van het hoogste niveau
    if (isLetter(g)) return { O: 'grey', V: 'blue', G: 'pink', U: 'gold' }[g];
    const n = parseFloat(String(g).replace(',', '.'));
    if (n >= 9.5) return 'gold';
    if (n >= 8.5) return 'red';
    if (n >= 7.5) return 'pink';
    if (n >= 6.5) return 'purple';
    if (n >= 5.5) return 'blue';
    return 'grey';
  }

  const RARITY_NAME = {
    grey: 'Consumer Grade', blue: 'Mil-Spec', purple: 'Restricted',
    pink: 'Classified', red: 'Covert', gold: '★ Rare Special Item'
  };

  const fmt = (n) => n.toFixed(1).replace('.', ',');
  const randomNumber = () => fmt(1 + Math.random() * 9);
  const randomLetter = () => {
    const r = Math.random();
    return r < 0.25 ? 'O' : r < 0.65 ? 'V' : r < 0.9 ? 'G' : 'U';
  };
  const randomCefr = (sep) => {
    // 35% kans op een "tussen"-niveau zoals B2C1, anders een los niveau
    if (Math.random() < 0.35) {
      const i = Math.floor(Math.random() * (LEVELS.length - 1));
      return LEVELS[i] + sep + LEVELS[i + 1];
    }
    const r = Math.random();
    return r < 0.2 ? 'A1' : r < 0.45 ? 'A2' : r < 0.7 ? 'B1' : r < 0.87 ? 'B2' : r < 0.96 ? 'C1' : 'C2';
  };
  const randomGrade = (like) =>
    isCefr(like) ? randomCefr(like.slice(2, -2)) : isLetter(like) ? randomLetter() : randomNumber();

  function buildItem(grade) {
    const el = document.createElement('div');
    el.className = `csg-item csg-${rarity(grade)}`;
    // langere teksten (B2C1, B2-C1) krijgen een kleiner lettertype zodat elk vakje even breed blijft
    const size = grade.length <= 3 ? 0.15 : grade.length === 4 ? 0.11 : 0.09;
    el.innerHTML = `<span class="csg-num" style="font-size:calc(var(--d) * ${size})">${grade}</span>`;
    return el;
  }

  function openCase(target, grade) {
    // De Open-knop verdwijnt meteen; het cijfer blijft nog verborgen tot de case geland is
    const ph = document.createElement('span');
    ph.className = 'csg-opening';
    ph.textContent = '···';
    target.replaceChildren(ph);

    const overlay = document.createElement('div');
    overlay.className = 'csg-overlay';
    overlay.innerHTML = `
      <div class="csg-head">
        <div class="csg-title">Container ontgrendelen</div>
        <div class="csg-sub">Ontgrendel <b>Cijfer Case</b></div>
        <div class="csg-info"><span class="csg-i">i</span>Deze container kan maar één keer worden geopend</div>
      </div>
      <div class="csg-stage">
        <div class="csg-disc"></div>
        <div class="csg-band">
          <div class="csg-track"></div>
          <div class="csg-dim"></div>
          <div class="csg-marker"></div>
        </div>
        <div class="csg-result" hidden>
          <div class="csg-result-label">Je hebt ontvangen</div>
          <div class="csg-result-grade"></div>
        </div>
      </div>
      <div class="csg-inspect-view">
        <div class="csg-ins-glow"></div>
        <div class="csg-ins-card"><div class="csg-ins-grade"></div></div>
        <div class="csg-ins-name">Cijfer Case</div>
        <div class="csg-ins-rarity"></div>
      </div>
      <div class="csg-foot">
        <div class="csg-key"><span class="csg-keyicon">🔑</span>Gebruik <b>Cijfer Case Sleutel</b></div>
        <button class="csg-close" disabled><span class="csg-ring"></span>SLUITEN</button>
      </div>`;
    document.body.appendChild(overlay);

    const track = overlay.querySelector('.csg-track');
    const band = overlay.querySelector('.csg-band');
    const result = overlay.querySelector('.csg-result');
    const closeBtn = overlay.querySelector('.csg-close');

    for (let i = 0; i < TOTAL; i++) {
      track.appendChild(buildItem(i === WIN_INDEX ? grade : randomGrade(grade)));
    }

    // Afmetingen uit de echte layout lezen (schaalt mee met het scherm)
    const itemW = track.children[0].offsetWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const bandW = band.clientWidth;
    const jitter = (Math.random() - 0.5) * (itemW * 0.8);
    const itemCenter = WIN_INDEX * (itemW + gap) + itemW / 2 + jitter;
    const startX = bandW / 2 - itemW / 2;
    const finalX = bandW / 2 - itemCenter;

    track.style.transform = `translateX(${startX}px)`;

    let finished = false;
    const onKey = (e) => e.key === 'Escape' && close();
    const close = () => {
      if (!finished) return;
      document.removeEventListener('keydown', onKey);
      overlay.remove();
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      const r = rarity(grade);
      track.children[WIN_INDEX].classList.add('csg-win');
      const g = overlay.querySelector('.csg-result-grade');
      g.textContent = grade;
      result.className = `csg-result csg-${r}`;
      result.hidden = false;
      closeBtn.disabled = false;
      reveal(target, grade);

      // Inspecteren, zoals bij een echte skin: de case-UI verdwijnt en het cijfer zweeft in beeld
      const view = overlay.querySelector('.csg-inspect-view');
      const card = view.querySelector('.csg-ins-card');
      const big = view.querySelector('.csg-ins-grade');
      view.classList.add(`csg-${r}`);
      big.textContent = grade;
      big.style.fontSize =
        grade.length <= 3 ? 'min(34vh, 24vw)' : grade.length === 4 ? 'min(26vh, 18vw)' : 'min(20vh, 14vw)';
      view.querySelector('.csg-ins-rarity').textContent = RARITY_NAME[r];
      setTimeout(() => overlay.classList.add('csg-inspect'), 450);

      // met de muis te draaien, net als in het spel
      let dragging = false, lastX = 0, angle = 0;
      card.addEventListener('pointerdown', (e) => {
        dragging = true; lastX = e.clientX;
        card.classList.add('csg-drag');
        card.style.transform = `rotateY(${angle}deg)`;
        card.setPointerCapture(e.pointerId);
      });
      card.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        angle += (e.clientX - lastX) * 0.6; lastX = e.clientX;
        card.style.transform = `rotateY(${angle}deg)`;
      });
      card.addEventListener('pointerup', () => { dragging = false; });
    };

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        track.style.transition = `transform ${DURATION}ms cubic-bezier(0.08, 0.6, 0.12, 1)`;
        track.style.transform = `translateX(${finalX}px)`;
      })
    );
    track.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, DURATION + 500);

    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
  }

  // Geopende cijfers blijven voor altijd open: we bewaren ze (als hash) in chrome.storage.local.
  const STORE_KEY = 'csg_opened';
  const revealed = new Set();
  let ready = false;

  const hash = (str) => {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  };

  function loadOpened(done) {
    try {
      chrome.storage.local.get(STORE_KEY, (r) => {
        ((r && r[STORE_KEY]) || []).forEach((h) => revealed.add(h));
        done();
      });
    } catch (e) { done(); }
  }
  function saveOpened() {
    try { chrome.storage.local.set({ [STORE_KEY]: [...revealed] }); } catch (e) { /* negeren */ }
  }

  // Sleutel om hetzelfde cijfer na een herrender van de pagina terug te vinden:
  // het cijfer plus de tekst van de omliggende rij (zonder onze eigen elementen).
  function contextKey(el, grade) {
    let anc = el;
    for (let i = 0; i < 3 && anc.parentElement && anc.parentElement !== document.body; i++) {
      anc = anc.parentElement;
    }
    const clone = anc.cloneNode(true);
    clone.querySelectorAll('.csg-case, .csg-revealed').forEach((n) => n.remove());
    const t = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    return hash(grade + '|' + t.slice(0, 160));
  }

  function showGrade(el, grade) {
    const span = document.createElement('span');
    span.className = `csg-revealed csg-${rarity(grade)}`;
    span.textContent = grade;
    el.replaceChildren(span);
  }

  function reveal(target, grade) {
    const key = target.dataset.csgKey;
    if (key) { revealed.add(key); saveOpened(); }
    showGrade(target, grade);
    if (!key) return;
    // Heeft SOMtoday de pagina intussen opnieuw getekend? Dan staat er ergens nog een Open-knop
    // voor ditzelfde cijfer: ook die meteen weghalen.
    document.querySelectorAll('[data-csg-key]').forEach((el) => {
      if (el.dataset.csgKey === key && !el.querySelector('.csg-revealed')) showGrade(el, grade);
    });
    scan();
  }

  function makeCaseButton(target, grade) {
    const btn = document.createElement('span');
    btn.className = 'csg-case';
    btn.setAttribute('role', 'button');
    btn.title = 'Open case';
    btn.innerHTML = '<span class="csg-box">📦</span><span class="csg-label">Open</span>';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openCase(target, grade);
    });
    return btn;
  }

  function scan() {
    if (!ready) return;
    if (!onGradesPage()) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const hits = [];
    let node;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue.trim();
      if (!GRADE_RE.test(text)) continue;
      const parent = node.parentElement;
      if (!parent || parent.closest('.csg-overlay, .csg-revealed, .csg-case') || parent.dataset.csgDone) continue;
      if (parent.childElementCount > 0) continue;
      const grade = text.replace('.', ',').replace(/\s+/g, '').toUpperCase();
      hits.push([parent, grade, contextKey(parent, grade)]);
    }
    for (const [parent, grade, key] of hits) {
      parent.dataset.csgDone = '1';
      parent.dataset.csgKey = key;
      if (revealed.has(key)) reveal(parent, grade);
      else parent.replaceChildren(makeCaseButton(parent, grade));
    }
  }

  let timer;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(scan, 250);
  }).observe(document.body, { childList: true, subtree: true });

  loadOpened(() => {
    ready = true;
    scan();
  });
})();
