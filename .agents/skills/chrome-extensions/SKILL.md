---
name: chrome-extensions
description: >
  Build Chrome Extensions using Manifest V3 best practices. Use this skill whenever the
  user asks to create, modify, debug, or understand Chrome browser extensions or anything
  involving the Chrome Extensions API. Trigger on mentions of: 'Chrome extension', 'browser
  extension', 'manifest.json', 'content script', 'service worker' (in browser context),
  'popup' (in browser extension context), 'chrome.* API', 'message passing', 'chrome.storage',
  'chrome.tabs', 'chrome.action', or the Chrome Prompt API (`LanguageModel`) inside an extension.
---

# Chrome Extensions

Build production-quality Chrome extensions using Manifest V3.

## Mandatory Rules

These address the most common causes of broken extensions. Violating any produces a non-functional build.

### 1. Icons: only reference files you create — or omit icons entirely

```
❌ BROKEN — referencing files that don't exist or reusing one file for all sizes:
   "icons": { "16": "icon.png", "48": "icon.png", "128": "icon.png" }

✅ CORRECT — each size is a separate file at the correct pixel dimensions:
   "icons": { "16": "icons/icon-16.png", "48": "icons/icon-48.png", "128": "icons/icon-128.png" }
   (where icon-16.png is 16×16px, icon-48.png is 48×48px, icon-128.png is 128×128px)

✅ ALSO CORRECT — omit icons from manifest if you cannot generate real PNG files:
   (just remove the "icons" and "default_icon" fields — Chrome uses a default icon)
```

**If you include icon references, you MUST create the actual image files.** Never reference non-existent files. This applies to ALL image references in `chrome.*` APIs.

### 2. `tab.url` requires the `tabs` permission

Without it, `tab.url` silently returns `undefined` — no error thrown.

```js
// manifest.json — REQUIRED if you read tab.url or tab.title anywhere:
{ "permissions": ["tabs"] }
```

See `references/extensions/tab-management.md`.

### 3. Always use async/await — never `.then()` chains

```js
// ❌ BAD
chrome.tabs.query({active: true, currentWindow: true}).then(tabs => {
  chrome.scripting.executeScript({target: {tabId: tabs[0].id}, files: ['content.js']}).then(() => {});
});

// ✅ GOOD
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
```

For `runtime.onMessage` listeners that do async work:

```js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const data = await chrome.storage.local.get('key');
    sendResponse({ data });
  })();
  return true; // keeps channel open for the async sendResponse
});
```

See `references/extensions/message-passing.md`.

### 4. Content scripts: don't block the main thread

When modifying many DOM elements, batch with `requestAnimationFrame` and yield between batches:

```js
async function highlightAll(elements) {
  const BATCH = 20;
  for (let i = 0; i < elements.length; i += BATCH) {
    await new Promise(r => requestAnimationFrame(() => {
      elements.slice(i, i + BATCH).forEach(el => el.style.backgroundColor = 'yellow');
      r();
    }));
    if (globalThis.scheduler?.yield) await scheduler.yield();
  }
}
```

See `references/extensions/content-scripts.md`.

### 5. Service workers are ephemeral — never store state in variables

```js
// ❌ BROKEN — state lost when SW terminates (~30s of inactivity)
let count = 0;
chrome.tabs.onUpdated.addListener(() => { count++; });

// ✅ CORRECT — persist in chrome.storage, read on every event
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status !== 'complete') return;
  const { count = 0 } = await chrome.storage.local.get('count');
  await chrome.storage.local.set({ count: count + 1 });
  await chrome.action.setBadgeText({ text: String(count + 1) });
});
```

Use `chrome.alarms` instead of `setTimeout`/`setInterval`. See `references/extensions/service-worker.md`.

### 6. `chrome.action` API requires `action` in manifest

Using `chrome.action.setBadgeText`, `chrome.action.setIcon`, or `chrome.action.onClicked` requires
an `"action"` key in manifest.json — even if it's empty. Without it, `chrome.action` is `undefined`.

```js
// ❌ BROKEN — manifest has no "action" key
await chrome.action.setBadgeText({ text: '5' });
// TypeError: Cannot read properties of undefined (reading 'setBadgeText')

// ✅ FIX — add "action" to manifest.json (at minimum an empty object)
{ "action": {} }
// or with a popup:
{ "action": { "default_popup": "popup/popup.html" } }
```

### 7. `activeTab` only works on direct user gestures

`activeTab` grants temporary access to the current tab ONLY when triggered by:
- Clicking the extension action icon
- A context menu item
- A keyboard shortcut from the `commands` API

It does **NOT** grant access from a popup button that opens later, or any programmatic trigger.
For persistent tab access, use the `tabs` permission plus specific `host_permissions`.

```js
// ✅ For always-available tab scripting:
// manifest.json: { "permissions": ["tabs", "scripting"], "host_permissions": ["<all_urls>"] }
```

### 8. Prompt API: available in service workers, popup, and side panel

The `LanguageModel` API works in all extension contexts — service worker, popup, and side panel —
with no additional manifest permissions required. Extensions also get `LanguageModel.params()`,
which is unavailable on the web:

```js
const params = await LanguageModel.params();
// { defaultTopK: 3, maxTopK: 128, defaultTemperature: 1, maxTemperature: 2 }
```

See `references/extensions/prompt-api.md` for the extension-specific wiring example.

### 9. `chrome.windows` has NO `.query()` method — use `getAll`, `getLastFocused`, or `getCurrent`

Unlike `chrome.tabs.query()`, the `chrome.windows` API does NOT have a `.query()` method.

```js
// ❌ BROKEN — chrome.windows.query does not exist
const windows = await chrome.windows.query({ focused: true });
// TypeError: chrome.windows.query is not a function

// ✅ CORRECT — use the right method for your need
const focused = await chrome.windows.getLastFocused({ populate: true });
const current = await chrome.windows.getCurrent({ populate: true });
const all     = await chrome.windows.getAll({ populate: true });
```

**`chrome.windows` methods:** `getAll`, `getLastFocused`, `getCurrent`, `get(windowId)`, `create`, `update`, `remove`. See `references/extensions/tab-management.md`.

## Always Manifest V3

Never generate Manifest V2 code.
- `background.service_worker` not `background.scripts`
- `chrome.action` not `chrome.browserAction`
- `chrome.scripting.executeScript` not `chrome.tabs.executeScript`
- `host_permissions` is separate from `permissions`
- No inline scripts in HTML — use `<script src="file.js">`
- No inline event handlers — use `addEventListener`

## Reference Files

For detailed API patterns, read the relevant file BEFORE writing code:

| Topic | Reference |
|-------|-----------|
| Service worker lifetime | `references/extensions/service-worker.md` |
| Content scripts & DOM | `references/extensions/content-scripts.md` |
| Message passing | `references/extensions/message-passing.md` |
| Popups | `references/extensions/popup-ui.md` |
| Tab & window management | `references/extensions/tab-management.md` |
| Storage | `references/extensions/storage.md` |
| Calling external APIs | `references/extensions/api-calling.md` |
| Chrome Prompt API | `references/extensions/prompt-api.md` |

## Output Checklist

Verify EVERY item before delivering:

- [ ] `manifest_version: 3` — no V2 APIs anywhere
- [ ] All icon files referenced in manifest exist as real files with correct dimensions — or icons are omitted
- [ ] `tabs` permission declared if `tab.url` or `tab.title` is accessed
- [ ] All code uses `async`/`await` — no `.then()` chains
- [ ] Content scripts batch DOM updates with `requestAnimationFrame`
- [ ] Service worker stores NO state in global variables — uses `chrome.storage`
- [ ] No inline scripts or event handlers in HTML
- [ ] `"action": {}` (or more) present in manifest if using `chrome.action.*` APIs
- [ ] If scripting tabs outside a direct user gesture: use `tabs` + `host_permissions` (NOT `activeTab`)
- [ ] `chrome.windows` calls use `getAll`/`getLastFocused`/`getCurrent` — NOT `.query()` (it doesn't exist)
- [ ] Error handling on all async operations
- [ ] `host_permissions` scoped to specific domains (not `<all_urls>` unless needed)
- [ ] `return true` in `onMessage` listeners with async responses
