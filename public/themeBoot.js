// Runs before CSS so a saved theme is applied without an initial light flash.
(() => {
  try {
    const value = localStorage.getItem('slidespace-theme-v1') || 'system';
    const preference = ["system", "light", "dark", "midnight", "glacier", "blossom", "citrus", "paper", "candy", "aurora", "rose", "neon", "terminal", "espresso", "spectrum", "soda", "laser", "arcade"].includes(value) ? value : 'system';
    const resolved = preference === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : preference;
    document.documentElement.dataset.theme = resolved;
  } catch {
    document.documentElement.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
})();
