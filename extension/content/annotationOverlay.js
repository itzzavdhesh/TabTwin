// Renders TabTwin highlights and annotation notes on the host's active page.
(() => {
  const LAYER_ID = 'tabtwin-annotation-layer';
  const HIGHLIGHT_TTL_MS = 3800;
  let layer;

  function ensureLayer() {
    if (layer) return;
    layer = document.createElement('div');
    layer.id = LAYER_ID;
    Object.assign(layer.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '2147483645'
    });
    document.documentElement.append(layer);
  }

  function addAnnotation(annotation) {
    ensureLayer();
    const note = document.createElement('div');
    note.textContent = annotation?.text || 'Guest annotation';
    Object.assign(note.style, {
      position: 'absolute',
      right: '24px',
      top: `${24 + layer.children.length * 56}px`,
      maxWidth: '260px',
      padding: '10px 12px',
      border: '1px solid #fde68a',
      borderRadius: '8px',
      background: '#fffbeb',
      color: '#78350f',
      boxShadow: '0 10px 24px rgba(15, 23, 42, 0.16)',
      font: '500 13px system-ui'
    });
    layer.append(note);
  }

  function highlightSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const mark = document.createElement('mark');
    mark.style.background = '#99f6e4';
    mark.style.color = 'inherit';
    try {
      range.surroundContents(mark);
      selection.removeAllRanges();
    } catch {
      // TODO: Add robust multi-node text highlighting for complex selections.
    }
  }

  function highlightRegions(regions = []) {
    ensureLayer();
    const phrases = (Array.isArray(regions) ? regions : []).filter(Boolean).map((region) => String(region));
    if (!phrases.length) return;

    const candidates = Array.from(document.querySelectorAll('button, a, nav, form, main, section, header, footer, input, textarea, [role="button"], [role="navigation"], [role="main"], [role="region"], [role="dialog"]'));
    phrases.forEach((phrase) => {
      const target = candidates.find((candidate) => {
        const text = candidate.textContent || '';
        return text.toLowerCase().includes(phrase.toLowerCase());
      });

      if (!target) return;

      const rect = target.getBoundingClientRect();
      const box = document.createElement('div');
      Object.assign(box.style, {
        position: 'absolute',
        left: `${rect.left + window.scrollX}px`,
        top: `${rect.top + window.scrollY}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        border: '2px solid #14b8a6',
        borderRadius: '8px',
        boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.12)',
        background: 'rgba(20, 184, 166, 0.12)',
        pointerEvents: 'none'
      });
      layer.append(box);
      window.setTimeout(() => box.remove(), HIGHLIGHT_TTL_MS);
    });
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'annotation:add') addAnnotation(message.payload?.annotation || message.payload);
    if (message.type === 'action:request' && message.payload?.type === 'highlight') highlightSelection();
    if (message.type === 'onboarding:highlight') highlightRegions(message.payload?.regions || message.payload?.guidance?.importantRegions || []);
  });

  ensureLayer();
  // TODO: Add annotation persistence so highlights can be restored after a session ends.
})();
