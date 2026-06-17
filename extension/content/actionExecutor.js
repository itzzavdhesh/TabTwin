// Executes approved guest and AI browser actions inside the host tab with visible pacing.
(() => {
  const ACTION_DELAY_MS = 300;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'action:request') {
      executeAction(message.payload).then((result) => {
        chrome.runtime.sendMessage({ type: 'content:action-complete', payload: message.payload });
        sendResponse(result);
      });
      return true;
    }

    if (message.type === 'agent:actions') {
      executeActions(message.payload?.actions || []).then((result) => {
        chrome.runtime.sendMessage({ type: 'content:action-complete', payload: { type: 'agent-plan' } });
        sendResponse(result);
      });
      return true;
    }

    return false;
  });

  async function executeActions(actions) {
    for (const action of actions) {
      await delay(ACTION_DELAY_MS);
      await executeAction(action);
    }
    return { ok: true };
  }

  async function executeAction(action = {}) {
    // Check guest permissions before executing any action.
    const denied = await checkPermission(action.type);
    if (denied) {
      flashAction({ type: `⛔ ${action.type} denied` });
      return { ok: false, reason: `Permission denied: ${action.type}` };
    }

    flashAction(action);

    if (action.type === 'read') {
      return { ok: true, text: document.body?.innerText?.slice(0, 4000) || '' };
    }

    if (action.type === 'click') {
      const element = findElement(action);
      element?.click();
      return { ok: Boolean(element) };
    }

    if (action.type === 'type') {
      const element = findElement(action);
      if (!element) return { ok: false };
      element.focus();
      element.value = `${element.value || ''}${action.text || ''}`;
      element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: action.text || '' }));
      return { ok: true };
    }

    if (action.type === 'scroll') {
      window.scrollBy({ top: action.deltaY || 420, behavior: 'smooth' });
      return { ok: true };
    }

    if (action.type === 'navigate' && action.url) {
      window.location.href = action.url;
      return { ok: true };
    }

    return { ok: false, reason: 'Unsupported action type' };
  }

  /**
   * Returns true if the action type is denied by the current session permissions.
   * The read action is always allowed (non-destructive).
   */
  async function checkPermission(actionType) {
    if (!actionType || actionType === 'read') return false;

    const PERMISSION_MAP = {
      click: 'canClick',
      type: 'canType',
      scroll: 'canScroll',
      navigate: 'canNavigate',
      highlight: 'canHighlight',
      annotate: 'canAnnotate'
    };

    const permKey = PERMISSION_MAP[actionType];
    if (!permKey) return false; // Unknown action types are handled elsewhere.

    try {
      const stored = await chrome.storage.local.get(['tabTwinSession']);
      const permissions = stored.tabTwinSession?.permissions;
      if (!permissions) return false; // No permissions stored — allow by default (host).
      return permissions[permKey] === false;
    } catch {
      return false;
    }
  }

  function findElement(action) {
    if (action.selector) return document.querySelector(action.selector);
    if (Number.isFinite(action.x) && Number.isFinite(action.y)) return document.elementFromPoint(action.x, action.y);
    return null;
  }

  function flashAction(action) {
    const marker = document.createElement('div');
    marker.textContent = action.type || 'action';
    Object.assign(marker.style, {
      position: 'fixed',
      left: '16px',
      bottom: '16px',
      zIndex: '2147483647',
      padding: '8px 10px',
      borderRadius: '8px',
      background: '#111827',
      color: 'white',
      font: '600 12px system-ui',
      boxShadow: '0 10px 24px rgba(15, 23, 42, 0.22)'
    });
    document.documentElement.append(marker);
    setTimeout(() => marker.remove(), 900);
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
})();
