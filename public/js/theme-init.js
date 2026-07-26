(() => {
  const stored = localStorage.getItem('slicktok:theme');
  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = stored || preferred;
})();
