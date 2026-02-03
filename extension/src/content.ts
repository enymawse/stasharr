const PANEL_ID = 'stasharr-extension-panel';

if (!document.getElementById(PANEL_ID)) {
  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.style.position = 'fixed';
  panel.style.right = '16px';
  panel.style.bottom = '16px';
  panel.style.zIndex = '2147483647';
  panel.style.background = 'rgba(20, 20, 24, 0.9)';
  panel.style.color = '#f5f5f5';
  panel.style.padding = '10px 12px';
  panel.style.borderRadius = '8px';
  panel.style.fontFamily = 'system-ui, -apple-system, Segoe UI, sans-serif';
  panel.style.fontSize = '12px';
  panel.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.25)';
  panel.style.maxWidth = '280px';

  const heading = document.createElement('div');
  heading.textContent = 'Stasharr Extension (dev)';
  heading.style.fontWeight = '600';
  heading.style.marginBottom = '6px';
  panel.appendChild(heading);

  const diagnostics = document.createElement('div');
  const url = window.location.href;
  const path = window.location.pathname;
  let pageType = 'other';

  if (path.startsWith('/scenes/')) {
    pageType = 'scene';
  } else if (path.startsWith('/studios/')) {
    pageType = 'studio';
  } else if (path.startsWith('/performers/')) {
    pageType = 'performer';
  }

  diagnostics.textContent = `Diagnostics: ${pageType} • ${url}`;
  diagnostics.style.opacity = '0.85';
  panel.appendChild(diagnostics);

  document.documentElement.appendChild(panel);
}
