function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isVisible(element) {
  if (!element || typeof element.getAttribute !== 'function') return false;
  if (element.hidden) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;

  const style = element.style || {};
  if (style.display === 'none' || style.visibility === 'hidden') return false;

  try {
    const computed = globalThis.window?.getComputedStyle?.(element);
    if (computed?.display === 'none' || computed?.visibility === 'hidden') return false;
  } catch {
    // Ignore layout access failures in non-browser contexts.
  }

  try {
    const rect = element.getBoundingClientRect?.();
    return !rect || (rect.width > 0 && rect.height > 0);
  } catch {
    return true;
  }
}

function getTextContent(element) {
  const directText = normalizeText(element?.textContent || '');
  if (directText) return directText;
  const ariaLabel = normalizeText(element?.getAttribute?.('aria-label') || '');
  const title = normalizeText(element?.getAttribute?.('title') || '');
  const placeholder = normalizeText(element?.getAttribute?.('placeholder') || '');
  return ariaLabel || title || placeholder;
}

function collectVisibleMatches(root, selector) {
  const items = [];
  if (!root || typeof root.querySelectorAll !== 'function') return items;

  const matches = root.querySelectorAll(selector);
  for (const element of matches) {
    if (!isVisible(element)) continue;
    const text = getTextContent(element);
    if (!text) continue;
    items.push(text);
  }

  return Array.from(new Set(items));
}

function collectInputFields(root) {
  const inputs = [];
  if (!root || typeof root.querySelectorAll !== 'function') return inputs;

  const matches = root.querySelectorAll('input:not([type="hidden"]):not([type="password"]):not([type="email"]):not([type="tel"]):not([type="number"]):not([type="search"]), textarea, [contenteditable="true"]');
  for (const element of matches) {
    if (!isVisible(element)) continue;
    const label = getTextContent(element);
    const fieldName = normalizeText(element?.getAttribute?.('name') || '');
    if (label || fieldName) {
      inputs.push(label || fieldName || 'Input');
    }
  }
  return Array.from(new Set(inputs));
}

export function analyzePageStructure(root = globalThis.document) {
  const title = normalizeText(root?.title || root?.querySelector?.('title')?.textContent || '');
  return {
    title,
    navigation: collectVisibleMatches(root, 'nav, [role="navigation"]'),
    buttons: collectVisibleMatches(root, 'button, [role="button"], input[type="button"], input[type="submit"]'),
    forms: collectVisibleMatches(root, 'form'),
    headings: collectVisibleMatches(root, 'h1, h2, h3'),
    inputs: collectInputFields(root),
    sections: collectVisibleMatches(root, 'main, [role="main"], section, [role="region"], aside, [role="complementary"], dialog, [role="dialog"]')
  };
}

export function createFallbackOnboarding(summary = {}) {
  const title = normalizeText(summary.title || 'this page');
  return {
    welcomeMessage: `Welcome! ${title ? `You are viewing ${title}.` : 'You are viewing a new page.'}`,
    pageOverview: 'The page is ready for a quick walkthrough. Focus on the main sections and the primary actions first.',
    importantRegions: [],
    recommendedActions: ['Review the main navigation.', 'Check the primary call to action.', 'Take the next step with confidence.'],
    walkthrough: 'Begin by reviewing the visible navigation and the most important action on the page.'
  };
}

if (typeof globalThis !== 'undefined') {
  globalThis.TabTwinOnboarding = { analyzePageStructure, createFallbackOnboarding };
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'onboarding:analyze') {
      sendResponse(analyzePageStructure(globalThis.document));
      return true;
    }
    return false;
  });
}
