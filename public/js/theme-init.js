(() => {
  const stored = localStorage.getItem('slicktok:theme');
  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = stored || preferred;

  const RTL_LANGS = ['ar'];
  const lang = localStorage.getItem('slicktok:lang');
  if (lang && RTL_LANGS.includes(lang)) {
    document.documentElement.dir = 'rtl';
  }
})();
