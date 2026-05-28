// Injects and updates the TabTwin host-page canvas overlay for guest ghost cursors.
(() => {
  const OVERLAY_ID = 'tabtwin-cursor-overlay';
  const LABEL_ID = 'tabtwin-cursor-label';
  const cursors = new Map();
  let canvas;
  let context;
  let label;

  function ensureOverlay() {
    if (canvas) return;

    canvas = document.createElement('canvas');
    canvas.id = OVERLAY_ID;
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: '2147483646'
    });

    label = document.createElement('div');
    label.id = LABEL_ID;
    Object.assign(label.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '2147483647',
      padding: '4px 8px',
      borderRadius: '6px',
      background: '#111827',
      color: 'white',
      font: '600 12px system-ui',
      transform: 'translate(16px, 14px)',
      display: 'none'
    });

    document.documentElement.append(canvas, label);
    context = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(draw);
    chrome.runtime.sendMessage({ type: 'content:cursor-ready' });
  }

  function resize() {
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * scale);
    canvas.height = Math.floor(window.innerHeight * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function draw() {
    if (!context) return;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);

    const now = Date.now();
    let latest = null;
    for (const [id, cursor] of cursors.entries()) {
      if (now - cursor.updatedAt > 5000) {
        cursors.delete(id);
        continue;
      }
      latest = cursor;
      drawPointer(cursor);
    }

    if (latest) {
      label.textContent = latest.name || 'Guest';
      label.style.left = `${latest.x}px`;
      label.style.top = `${latest.y}px`;
      label.style.display = 'block';
    } else {
      label.style.display = 'none';
    }

    requestAnimationFrame(draw);
  }

  function drawPointer(cursor) {
    const color = cursor.color || '#2563eb';
    context.save();
    context.translate(cursor.x, cursor.y);
    context.fillStyle = color;
    context.strokeStyle = 'white';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(20, 15);
    context.lineTo(10, 17);
    context.lineTo(6, 28);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }

  chrome.runtime.onMessage.addListener((message) => {
    ensureOverlay();
    if (message.type === 'cursor:move') {
      const payload = message.payload || {};
      const x = normalize(payload.x, payload.viewportWidth, window.innerWidth);
      const y = normalize(payload.y, payload.viewportHeight, window.innerHeight);
      cursors.set(payload.guestId || 'guest', {
        x,
        y,
        name: payload.name || 'Guest',
        color: payload.color || '#2563eb',
        updatedAt: Date.now()
      });
    }
  });

  function normalize(value, fromSize, toSize) {
    if (!fromSize) return Number(value || 0);
    return (Number(value || 0) / fromSize) * toSize;
  }

  ensureOverlay();
})();
