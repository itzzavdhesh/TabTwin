# Calling External APIs from Extensions

## Permissions

Ordinarily, fetch requests made by extensions follow normal CORS rules.

To determine if this is sufficient, use `curl` to send a GET request with a test origin and inspect the
response headers. For example:

```bash
curl -H "Origin: https://example.com" -D - -o /dev/null "https://api.openweathermap.org/data/2.5/weather?q=London&appid=KEY"
```

If the response includes either `*` or `https://example.com` as the value for the `Access-Control-Allow-Origin` header, the API supports CORS.

If the API does not support CORS, request host permissions. Fetches from the **service worker or
other extension pages** with matching host permissions are exempt from CORS restrictions:

```json
{
  "host_permissions": [
    "https://no-cors-api.example.com/*"
  ]
}
```

**Do NOT use `<all_urls>` just for API calls.** Scope to the specific API domains.

## Where to Make API Calls

API calls work from any extension context (service worker, popup, side panel, content scripts):

```js
// From popup or service worker
const response = await fetch('https://api.openweathermap.org/data/2.5/weather?q=London&appid=KEY');
const data = await response.json();
```

**Content scripts** run in the web page's origin and remain subject to that page's CORS rules —
host permissions do **not** exempt content-script fetches from CORS. For cross-origin calls, send a
message to the service worker and let it perform the fetch (it has the host-permission exemption),
then relay the result back. See `references/extensions/message-passing.md`.

> **Security:** A content script can be influenced by the hostile page it runs in, so a service worker
> that blindly fetches whatever URL a message asks for becomes a confused deputy — it lends the
> extension's host permissions to attacker-chosen requests. Before fetching in the service worker,
> validate `sender` (e.g. check `sender.id === chrome.runtime.id` and the origin/tab) and match the
> requested URL against a strict allowlist of expected API endpoints. Never fetch arbitrary URLs
> received over messaging.

## Error Handling Pattern

```js
async function callAPI(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (err) {
    if (err instanceof TypeError) {
      // Network error (offline, DNS failure, etc.)
      console.error('Network error:', err.message);
    } else {
      console.error('API error:', err.message);
    }
    return null;
  }
}
```

## API Keys

- Never hardcode API keys in published extensions
- Use `chrome.storage.local` for user-provided keys
- For your own backend, use `chrome.identity` to authenticate instead of embedding keys
- Mark placeholder keys clearly: `const API_KEY = 'YOUR_API_KEY_HERE';`

## Service Worker Considerations

If making API calls from the service worker, remember it can terminate after ~30s of inactivity.
For periodic polling, use `chrome.alarms` to wake the service worker on a schedule — an in-flight
`await fetch()` also keeps the worker alive until it settles. Do **not** reach for `chrome.offscreen`
as a persistent background page: offscreen documents exist to give access to DOM APIs the service
worker lacks (e.g. `DOMParser`, audio, clipboard), not to replace the service worker's lifecycle.
