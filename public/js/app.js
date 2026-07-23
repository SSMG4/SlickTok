(() => {
  const form = document.getElementById('download-form');
  const input = document.getElementById('url-input');
  const submitBtn = document.getElementById('submit-btn');
  const pasteBtn = document.getElementById('paste-btn');
  const errorEl = document.getElementById('form-error');
  const resultSection = document.getElementById('result-section');
  const resultCard = document.getElementById('result-card');
  const langSelect = document.getElementById('lang-select');

  const SUPPORTED_LANGS = ['en', 'fr', 'es', 'de', 'it', 'pt', 'id', 'vi'];
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
  }

  function initLang() {
    const stored = localStorage.getItem('slicktok:lang');
    const browserLang = (navigator.language || 'en').slice(0, 2);
    const initial = stored || (SUPPORTED_LANGS.includes(browserLang) ? browserLang : 'en');
    langSelect.value = initial;
    loadLang(initial);
  }

  langSelect.addEventListener('change', () => {
    localStorage.setItem('slicktok:lang', langSelect.value);
    loadLang(langSelect.value);
  });

  initLang();

  // Paste / clear toggle on the input button
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

  function downloadUrl(src, filename) {
    const params = new URLSearchParams({ src, filename });
    return `/api/download?${params.toString()}`;
  }

  function renderStats(stats) {
    const row = el('div', { class: 'result-card__stats' });
    const items = [
      ['views', stats.views],
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

  async function triggerZipDownload(images) {
    const res = await fetch('/api/download-zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'slicktok-slideshow.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function renderResult(data) {
    resultCard.innerHTML = '';

    const top = el('div', { class: 'result-card__top' });
    const thumb = el('div', { class: 'result-card__thumb' });
    if (data.thumbnail) {
      thumb.appendChild(el('img', { src: data.thumbnail, alt: '', loading: 'lazy' }));
    }
    top.appendChild(thumb);

    const meta = el('div', { class: 'result-card__meta' });
    meta.appendChild(el('p', { class: 'result-card__title', text: data.title || t('result.untitled', 'Untitled') }));
    const author = el('p', { class: 'result-card__author' });
    author.appendChild(el('span', { class: 'avatar', text: initials(data.author?.nickname || data.author?.username) }));
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

      const zipBtn = el('button', { type: 'button', class: 'dl-btn dl-btn--secondary', text: t('result.zip', 'Download all (ZIP)') });
      zipBtn.addEventListener('click', () => triggerZipDownload(data.images));
      resultCard.appendChild(zipBtn);
    }

    const downloads = el('div', { class: 'download-list' });
    const safeName = (data.title || 'slicktok-video').replace(/[^\w.-]/g, '_').slice(0, 60);

    if (data.downloads?.hd) {
      const a = el('a', {
        class: 'dl-btn dl-btn--primary',
        href: downloadUrl(data.downloads.hd, `${safeName}-hd.mp4`),
        text: t('result.downloadHd', 'Download HD (no watermark)'),
      });
      downloads.appendChild(a);
    }
    if (data.downloads?.sd) {
      const a = el('a', {
        class: `dl-btn ${data.downloads.hd ? 'dl-btn--secondary' : 'dl-btn--primary'}`,
        href: downloadUrl(data.downloads.sd, `${safeName}.mp4`),
        text: t('result.download', 'Download (no watermark)'),
      });
      downloads.appendChild(a);
    }
    if (data.downloads?.audio) {
      const a = el('a', {
        class: 'dl-btn dl-btn--secondary',
        href: downloadUrl(data.downloads.audio, `${safeName}.mp3`),
        text: t('result.downloadAudio', 'Download audio'),
      });
      downloads.appendChild(a);
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
