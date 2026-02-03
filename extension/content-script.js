(() => {
  const existing = document.getElementById('stasharr-extension-badge');
  if (existing) {
    return;
  }

  const badge = document.createElement('div');
  badge.id = 'stasharr-extension-badge';
  badge.textContent = 'Stasharr Extension Active';
  badge.style.position = 'fixed';
  badge.style.bottom = '16px';
  badge.style.right = '16px';
  badge.style.zIndex = '2147483647';
  badge.style.padding = '8px 12px';
  badge.style.borderRadius = '999px';
  badge.style.background = 'rgba(17, 24, 39, 0.9)';
  badge.style.color = '#fff';
  badge.style.fontSize = '12px';
  badge.style.fontFamily =
    'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
  badge.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';

  document.body.appendChild(badge);
})();
