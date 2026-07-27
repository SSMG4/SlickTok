(() => {
  const form = document.getElementById('download-form');
  const input = document.getElementById('url-input');
  const submitBtn = document.getElementById('submit-btn');
  const pasteBtn = document.getElementById('paste-btn');
  const errorEl = document.getElementById('form-error');
  const progressTrack = document.getElementById('progress-track');
  const resultSection = document.getElementById('result-section');
  const resultCard = document.getElementById('result-card');

  const LANGS = [
    { code: 'en', label: 'English', flag: 'gb' },
    { code: 'fr', label: 'Français', flag: 'fr' },
    { code: 'es', label: 'Español', flag: 'es' },
    { code: 'de', label: 'Deutsch', flag: 'de' },
    { code: 'it', label: 'Italiano', flag: 'it' },
    { code: 'pt', label: 'Português', flag: 'pt' },
    { code: 'id', label: 'Indonesia', flag: 'id' },
    { code: 'vi', label: 'Tiếng Việt', flag: 'vn' },
    { code: 'zh', label: '中文', flag: 'cn' },
    { code: 'ru', label: 'Русский', flag: 'ru' },
    { code: 'pl', label: 'Polski', flag: 'pl' },
    { code: 'sv', label: 'Svenska', flag: 'se' },
    { code: 'no', label: 'Norsk', flag: 'no' },
    { code: 'fi', label: 'Suomi', flag: 'fi' },
    { code: 'da', label: 'Dansk', flag: 'dk' },
    { code: 'nl', label: 'Nederlands', flag: 'nl' },
    { code: 'hu', label: 'Magyar', flag: 'hu' },
    { code: 'ms', label: 'Bahasa Melayu', flag: 'my' },
    { code: 'tr', label: 'Türkçe', flag: 'tr' },
    { code: 'ja', label: '日本語', flag: 'jp' },
    { code: 'ko', label: '한국어', flag: 'kr' },
    { code: 'ro', label: 'Română', flag: 'ro' },
    { code: 'uk', label: 'Українська', flag: 'ua' },
  ];
  const SUPPORTED_LANGS = LANGS.map((l) => l.code);

  const FLAGS = {
    gb: '<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#0a3d91"/><path d="M0 0L24 16M24 0L0 16" stroke="#fff" stroke-width="3"/><path d="M0 0L24 16M24 0L0 16" stroke="#c8102e" stroke-width="1.2"/><path d="M12 0V16M0 8H24" stroke="#fff" stroke-width="5"/><path d="M12 0V16M0 8H24" stroke="#c8102e" stroke-width="2.4"/></svg>',
    fr: '<svg viewBox="0 0 24 16"><rect width="8" height="16" fill="#0055a4"/><rect x="8" width="8" height="16" fill="#fff"/><rect x="16" width="8" height="16" fill="#ef4135"/></svg>',
    es: '<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#aa151b"/><rect y="4" width="24" height="8" fill="#f1bf00"/></svg>',
    de: '<svg viewBox="0 0 24 16"><rect width="24" height="5.33" fill="#000"/><rect y="5.33" width="24" height="5.33" fill="#dd0000"/><rect y="10.66" width="24" height="5.34" fill="#ffce00"/></svg>',
    it: '<svg viewBox="0 0 24 16"><rect width="8" height="16" fill="#009246"/><rect x="8" width="8" height="16" fill="#fff"/><rect x="16" width="8" height="16" fill="#ce2b37"/></svg>',
    pt: '<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#ff0000"/><rect width="9.6" height="16" fill="#046a38"/><circle cx="9.6" cy="8" r="3" fill="#ffcc00" stroke="#000" stroke-width="0.3"/></svg>',
    id: '<svg viewBox="0 0 24 16"><rect width="24" height="8" fill="#ce1126"/><rect y="8" width="24" height="8" fill="#fff"/></svg>',
    vn: '<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#da251d"/><path d="M12 4l1.18 3.63h3.82l-3.09 2.24 1.18 3.63L12 11.26l-3.09 2.24 1.18-3.63-3.09-2.24h3.82Z" fill="#ff0"/></svg>',
    cn: '<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#de2910"/><path d="M4 3l0.9 2.77h2.9l-2.35 1.7 0.9 2.77L4 8.54l-2.35 1.7 0.9-2.77-2.35-1.7h2.9Z" fill="#ffde00"/><circle cx="10" cy="2" r="0.9" fill="#ffde00"/><circle cx="12" cy="4.2" r="0.9" fill="#ffde00"/><circle cx="12" cy="7" r="0.9" fill="#ffde00"/><circle cx="10" cy="9" r="0.9" fill="#ffde00"/></svg>',
    ru: '<svg viewBox="0 0 24 16"><rect width="24" height="5.33" fill="#fff"/><rect y="5.33" width="24" height="5.33" fill="#0039a6"/><rect y="10.66" width="24" height="5.34" fill="#d52b1e"/></svg>',
    pl: '<svg viewBox="0 0 24 16"><rect width="24" height="8" fill="#fff"/><rect y="8" width="24" height="8" fill="#dc143c"/></svg>',
    se: '<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#006aa7"/><rect x="7" width="3" height="16" fill="#fecc02"/><rect y="6.5" width="24" height="3" fill="#fecc02"/></svg>',
    no: '<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#ba0c2f"/><rect x="6.5" width="4" height="16" fill="#fff"/><rect y="6" width="24" height="4" fill="#fff"/><rect x="7.2" width="2.6" height="16" fill="#00205b"/><rect y="6.7" width="24" height="2.6" fill="#00205b"/></svg>',
    fi: '<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/><rect x="7" width="3" height="16" fill="#003580"/><rect y="6.5" width="24" height="3" fill="#003580"/></svg>',
    dk: '<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#c8102e"/><rect x="7" width="3" height="16" fill="#fff"/><rect y="6.5" width="24" height="3" fill="#fff"/></svg>',
    nl: '<svg viewBox="0 0 24 16"><rect width="24" height="5.33" fill="#ae1c28"/><rect y="5.33" width="24" height="5.33" fill="#fff"/><rect y="10.66" width="24" height="5.34" fill="#21468b"/></svg>',
    hu: '<svg viewBox="0 0 24 16"><rect width="24" height="5.33" fill="#ce2939"/><rect y="5.33" width="24" height="5.33" fill="#fff"/><rect y="10.66" width="24" height="5.34" fill="#477050"/></svg>',
    my: '<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/><g fill="#cc0001"><rect height="1.14"/><rect y="2.29" width="24" height="1.14"/><rect y="4.57" width="24" height="1.14"/><rect y="6.86" width="24" height="1.14"/><rect y="9.14" width="24" height="1.14"/><rect y="11.43" width="24" height="1.14"/><rect y="13.71" width="24" height="1.14"/></g><rect width="12" height="9.14" fill="#010066"/><circle cx="5" cy="4.57" r="3" fill="#fc0"/><circle cx="6" cy="4.57" r="2.5" fill="#010066"/></svg>',
    tr: '<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#e30a17"/><circle cx="9.5" cy="8" r="4" fill="#fff"/><circle cx="10.7" cy="8" r="3.2" fill="#e30a17"/><path d="M13.2 6.3l0.55 1.7h1.78l-1.44 1.05 0.55 1.7-1.44-1.05-1.44 1.05 0.55-1.7-1.44-1.05h1.78Z" fill="#fff"/></svg>',
    jp: '<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/><circle cx="12" cy="8" r="4.6" fill="#bc002d"/></svg>',
    kr: '<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/><path d="M12 3.6a4.4 4.4 0 0 1 0 8.8 2.2 2.2 0 0 1 0-4.4 2.2 2.2 0 0 0 0-4.4Z" fill="#cd2e3a"/><path d="M12 3.6a4.4 4.4 0 0 0 0 8.8 2.2 2.2 0 0 1 0-4.4 2.2 2.2 0 0 0 0-4.4Z" fill="#0047a0"/></svg>',
    ro: '<svg viewBox="0 0 24 16"><rect width="8" height="16" fill="#002b7f"/><rect x="8" width="8" height="16" fill="#fcd116"/><rect x="16" width="8" height="16" fill="#ce1126"/></svg>',
    ua: '<svg viewBox="0 0 24 16"><rect width="24" height="8" fill="#005bbb"/><rect y="8" width="24" height="8" fill="#ffd500"/></svg>',
  };

  let strings = {};

  function t(key, fallback) {
    return key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), strings) ?? fallback;
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const value = t(key, null);
      if (value) el.textContent = value;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const value = t(key, null);
      if (value) el.setAttribute('placeholder', value);
    });
    document.querySelectorAll('[data-i18n-label]').forEach((el) => {
      const key = el.getAttribute('data-i18n-label');
      const value = t(key, null);
      if (value) el.setAttribute('aria-label', value);
    });
    document.title = t('meta.title', document.title);
  }

  async function loadLang(lang) {
    const safe = SUPPORTED_LANGS.includes(lang) ? lang : 'en';
    try {
      const res = await fetch(`/i18n/${safe}.json`);
      strings = res.ok ? await res.json() : {};
    } catch {
      strings = {};
    }
    document.documentElement.lang = safe;
    applyTranslations();
    updateLangButton(safe);
  }

  // --- Custom language switch -------------------------------------------

  const langSwitch = document.getElementById('lang-switch');
  const langButton = document.getElementById('lang-button');
  const langButtonFlag = document.getElementById('lang-button-flag');
  const langButtonCode = document.getElementById('lang-button-code');
  const langList = document.getElementById('lang-list');

  function buildLangList(current) {
    langList.innerHTML = '';
    LANGS.forEach((lang) => {
      const li = document.createElement('li');
      li.className = 'lang-switch__option';
      li.setAttribute('role', 'option');
      li.setAttribute('data-code', lang.code);
      li.setAttribute('aria-selected', lang.code === current ? 'true' : 'false');
      li.innerHTML = `<span class="lang-switch__flag">${FLAGS[lang.flag]}</span><span>${lang.label}</span>`;
      li.addEventListener('click', () => {
        localStorage.setItem('slicktok:lang', lang.code);
        loadLang(lang.code);
        closeLangList();
      });
      langList.appendChild(li);
    });
  }

  function updateLangButton(code) {
    const lang = LANGS.find((l) => l.code === code) || LANGS[0];
    langButtonFlag.innerHTML = FLAGS[lang.flag];
    langButtonCode.textContent = lang.code.toUpperCase();
    langList.querySelectorAll('.lang-switch__option').forEach((opt) => {
      opt.setAttribute('aria-selected', opt.getAttribute('data-code') === code ? 'true' : 'false');
    });
  }

  function openLangList() {
    langList.classList.add('is-open');
    langButton.setAttribute('aria-expanded', 'true');
  }

  function closeLangList() {
    langList.classList.remove('is-open');
    langButton.setAttribute('aria-expanded', 'false');
  }

  langButton.addEventListener('click', () => {
    if (!langList.classList.contains('is-open')) openLangList();
    else closeLangList();
  });

  document.addEventListener('click', (event) => {
    if (!langSwitch.contains(event.target)) closeLangList();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLangList();
  });

  function initLang() {
    const stored = localStorage.getItem('slicktok:lang');
    const browserLang = (navigator.language || 'en').slice(0, 2);
    const initial = stored || (SUPPORTED_LANGS.includes(browserLang) ? browserLang : 'en');
    buildLangList(initial);
    loadLang(initial);
  }

  initLang();

  // --- Theme toggle -------------------------------------------------------
  // Initial theme is already applied by theme-init.js (before this script
  // even loads, to avoid a flash of the wrong theme) - this just handles
  // flipping it and remembering the choice.

  const themeToggle = document.getElementById('theme-toggle');

  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('slicktok:theme', next);
  });

  // --- Mobile nav -----------------------------------------------------

  const navToggle = document.getElementById('nav-toggle');
  const siteNav = document.getElementById('site-nav');

  function closeNav() {
    siteNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }

  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  siteNav.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeNav));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeNav();
  });

  // --- FAQ accordion animation -----------------------------------------

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const faqDuration = prefersReducedMotion ? 1 : 200;

  document.querySelectorAll('.faq__list details').forEach((details) => {
    const summary = details.querySelector('summary');
    const content = details.querySelector('p');
    let animation = null;

    summary.addEventListener('click', (event) => {
      event.preventDefault();
      if (animation) animation.cancel();

      if (details.hasAttribute('open')) {
        const startHeight = content.offsetHeight;
        details.style.overflow = 'hidden';
        animation = content.animate(
          [{ height: `${startHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }],
          { duration: faqDuration, easing: 'ease' },
        );
        animation.onfinish = () => {
          details.removeAttribute('open');
          details.style.overflow = '';
          content.style.height = '';
        };
      } else {
        details.setAttribute('open', '');
        const endHeight = content.offsetHeight;
        details.style.overflow = 'hidden';
        animation = content.animate(
          [{ height: '0px', opacity: 0 }, { height: `${endHeight}px`, opacity: 1 }],
          { duration: faqDuration + 20, easing: 'ease' },
        );
        animation.onfinish = () => {
          details.style.overflow = '';
          content.style.height = '';
        };
      }
    });
  });

  // --- Scroll reveal -------------------------------------------------

  const revealTargets = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealTargets.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealTargets.forEach((el) => observer.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-visible'));
  }

  // --- Preview modal ---------------------------------------------------

  const previewModal = document.getElementById('preview-modal');
  const previewVideo = document.getElementById('preview-video');
  const previewClose = document.getElementById('preview-close');
  const previewBackdrop = document.getElementById('preview-backdrop');

  function openPreview(src) {
    previewVideo.src = src;
    previewModal.hidden = false;
    previewVideo.play().catch(() => {});
  }

  function closePreview() {
    previewVideo.pause();
    previewVideo.removeAttribute('src');
    previewVideo.load();
    previewModal.hidden = true;
  }

  previewClose.addEventListener('click', closePreview);
  previewBackdrop.addEventListener('click', closePreview);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !previewModal.hidden) closePreview();
  });

  // --- Paste / clear ------------------------------------------------

  pasteBtn.addEventListener('click', async () => {
    if (input.value) {
      input.value = '';
      input.focus();
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      input.value = text.trim();
      input.focus();
    } catch {
      input.focus();
    }
  });

  function setLoading(isLoading) {
    submitBtn.classList.toggle('is-loading', isLoading);
    submitBtn.disabled = isLoading;
    progressTrack.hidden = !isLoading;
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  function formatCount(n) {
    if (n === null || n === undefined) return null;
    if (n < 1000) return String(n);
    if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }

  function initials(name) {
    return (name || '?').trim().slice(0, 1).toUpperCase();
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value);
    });
    children.forEach((child) => node.appendChild(child));
    return node;
  }

  function downloadUrl(sourceUrl, quality, filename, inline) {
    const params = new URLSearchParams({ url: sourceUrl, quality, filename });
    if (inline) params.set('inline', '1');
    return `/api/download?${params.toString()}`;
  }

  function renderStats(stats) {
    const row = el('div', { class: 'result-card__stats' });
    const items = [
      ['views', stats.views],
      ['likes', stats.likes],
      ['comments', stats.comments],
      ['shares', stats.shares],
    ];
    items.forEach(([label, value]) => {
      const formatted = formatCount(value);
      if (formatted === null) return;
      row.appendChild(el('span', { text: `${formatted} ${t(`result.${label}`, label)}` }));
    });
    return row;
  }

  async function triggerBlobDownload(url, body, filename) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    return true;
  }

  function renderResult(data) {
    resultCard.innerHTML = '';

    const previewQuality = data.downloads?.hd ? 'hd' : (data.downloads?.sd ? 'sd' : null);

    const top = el('div', { class: 'result-card__top' });
    const thumb = el('button', { type: 'button', class: 'result-card__thumb', 'aria-label': t('result.preview', 'Preview video') });
    if (data.thumbnail) {
      thumb.appendChild(el('img', { src: data.thumbnail, alt: '', loading: 'lazy' }));
    }
    if (previewQuality && data.type === 'video') {
      const play = el('span', { class: 'result-card__play' });
      play.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
      thumb.appendChild(play);
      thumb.addEventListener('click', () => openPreview(downloadUrl(data.sourceUrl, previewQuality, 'preview.mp4', true)));
    } else {
      thumb.disabled = true;
    }
    top.appendChild(thumb);

    const meta = el('div', { class: 'result-card__meta' });
    meta.appendChild(el('p', { class: 'result-card__title', text: data.title || t('result.untitled', 'Untitled') }));
    const author = el('p', { class: 'result-card__author' });
    const avatar = el('span', { class: 'avatar' });
    if (data.author?.avatar) {
      avatar.appendChild(el('img', { src: data.author.avatar, alt: '', loading: 'lazy' }));
    } else {
      avatar.textContent = initials(data.author?.nickname || data.author?.username);
    }
    author.appendChild(avatar);
    author.appendChild(el('span', { text: `@${data.author?.username || 'unknown'}` }));
    meta.appendChild(author);
    meta.appendChild(renderStats(data.stats || {}));
    top.appendChild(meta);
    resultCard.appendChild(top);

    if (data.warning) {
      resultCard.appendChild(el('p', { class: 'result-card__warning', text: data.warning }));
    }

    if (data.type === 'slideshow' && Array.isArray(data.images) && data.images.length) {
      const grid = el('div', { class: 'image-grid' });
      data.images.forEach((src) => grid.appendChild(el('img', { src, alt: '', loading: 'lazy' })));
      resultCard.appendChild(grid);
    }

    const downloads = el('div', { class: 'download-list' });
    const safeName = (data.title || 'slicktok-video').replace(/[^\w.-]/g, '_').slice(0, 60);
    const hasBoth = Boolean(data.downloads?.sd && data.downloads?.hd);

    if (data.downloads?.sd) {
      downloads.appendChild(el('a', {
        class: `dl-btn ${hasBoth ? 'dl-btn--light' : 'dl-btn--dark'}`,
        href: downloadUrl(data.sourceUrl, 'sd', `${safeName}.mp4`),
        text: t('result.download', 'Download'),
      }));
    }
    if (data.downloads?.hd) {
      downloads.appendChild(el('a', {
        class: 'dl-btn dl-btn--dark',
        href: downloadUrl(data.sourceUrl, 'hd', `${safeName}-hd.mp4`),
        text: t('result.downloadHd', 'Download HD'),
      }));
    }
    if (data.downloads?.audio) {
      downloads.appendChild(el('a', {
        class: 'dl-btn dl-btn--light',
        href: downloadUrl(data.sourceUrl, 'audio', `${safeName}.m4a`),
        text: t('result.downloadAudio', 'Download audio'),
      }));
    }
    if (data.type === 'slideshow' && Array.isArray(data.images) && data.images.length) {
      const zipBtn = el('button', { type: 'button', class: 'dl-btn dl-btn--light', text: t('result.zip', 'Download all (ZIP)') });
      zipBtn.addEventListener('click', () => triggerBlobDownload('/api/download-zip', { images: data.images }, 'slicktok-slideshow.zip'));
      downloads.appendChild(zipBtn);

      if (data.downloads?.audio) {
        const videoBtn = el('button', { type: 'button', class: 'dl-btn dl-btn--dark', text: t('result.convertVideo', 'Convert to video (MP4)') });
        videoBtn.addEventListener('click', async () => {
          videoBtn.disabled = true;
          const original = videoBtn.textContent;
          videoBtn.textContent = t('result.converting', 'Converting...');
          const ok = await triggerBlobDownload('/api/slideshow-video', { images: data.images, sourceUrl: data.sourceUrl }, 'slicktok-slideshow.mp4');
          videoBtn.disabled = false;
          videoBtn.textContent = original;
          if (!ok) showError(t('errors.conversionFailed', 'Could not convert this slideshow to video.'));
        });
        downloads.appendChild(videoBtn);
      }
    }
    resultCard.appendChild(downloads);

    const resetBtn = el('button', { type: 'button', class: 'reset-link', text: t('result.another', 'Download another video') });
    resetBtn.addEventListener('click', () => {
      resultSection.hidden = true;
      resultCard.innerHTML = '';
      input.value = '';
      input.focus();
    });
    resultCard.appendChild(resetBtn);

    resultSection.hidden = false;
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();

    const url = input.value.trim();
    if (!url) {
      showError(t('errors.empty', 'Paste a TikTok link first.'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || t('errors.generic', 'Something went wrong.'));
        return;
      }
      renderResult(data);
    } catch {
      showError(t('errors.network', 'Network error. Try again.'));
    } finally {
      setLoading(false);
    }
  });
})();
