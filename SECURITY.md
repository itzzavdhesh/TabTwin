# Security Policy

## Supported Versions

The following versions of TabTwin are currently receiving security updates:

| Version | Supported          |
| ------- | ------------------ |
| Latest (main branch) | ✅ Active support |
| Older releases | ❌ No longer supported |

> [!IMPORTANT]
> We only provide security patches for the latest version on the `main` branch.
> Please upgrade to the latest version before reporting an issue.

---

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub Issues.**
Public disclosure of a vulnerability before a fix is available puts all users at risk.

### How to Report

**GitHub Private Vulnerability Reporting (the only supported private channel):**

1. Go to the [Security tab](https://github.com/itzzavdhesh/TabTwin/security) of this repository
2. Click **"Report a vulnerability"**
3. Fill in the private advisory form — your report will be visible only to the maintainer

> [!NOTE]
> Do **not** use GitHub profile DMs, public Issues, or any other channel — GitHub's
> Private Vulnerability Reporting is the only reliable, encrypted private channel available.

### What to Include in Your Report

Please provide as much of the following as possible to help us understand and reproduce the issue:

- **Type of vulnerability** (e.g., XSS, CSRF, RCE, information disclosure, authentication bypass)
- **Affected component** (e.g., `server/`, `extension/`, `webapp/`, WebRTC signaling)
- **Location** — file path, line number, or URL
- **Step-by-step reproduction instructions**
- **Proof of concept** or exploit code (if available)
- **Potential impact** — what an attacker could achieve
- **Suggested fix** (optional, but very welcome!)

---

## Our Response Process

Once you report a vulnerability, here is what to expect:

| Timeline | Action |
|---|---|
| **Within 48 hours** | We acknowledge receipt of your report |
| **Within 7 days** | We assess severity and confirm whether the issue is valid |
| **Within 30 days** | We aim to ship a patch for confirmed vulnerabilities |
| **After patch** | We publicly disclose the vulnerability with credit to the reporter |

> [!NOTE]
> Timeline may vary based on the complexity and severity of the vulnerability.

---

## Scope

The following are **in scope** for vulnerability reports:

- **`server/`** — Node.js WebSocket signaling server (session management, authentication, data exposure)
- **`extension/`** — Chrome Extension (content scripts, background service worker, permissions abuse)
- **`webapp/`** — React web application (XSS, CSRF, broken authentication)
- **WebRTC** — Peer connection security, unauthorized session access
- **API endpoints** — Injection, unauthorized access, data leakage

The following are **out of scope**:

- Vulnerabilities in third-party dependencies (report these directly to the dependency maintainer and also to us if it affects TabTwin)
- Social engineering attacks
- Physical attacks
- Denial of Service (DoS) attacks against our public infrastructure
- Reports from automated scanners without proof of exploitability

---

## Security Best Practices for Contributors

If you are contributing code to TabTwin, please follow these guidelines:

- **Never commit secrets** — API keys, credentials, or tokens must not appear in code
- **Validate all inputs** — Both client-side and server-side
- **Use parameterized queries** — Prevent injection attacks
- **Sanitize WebSocket messages** — Validate structure and content of every message
- **Review Chrome Extension permissions** — Request only the minimum permissions required in `manifest.json`
- **Keep dependencies updated** — Use `npm audit` regularly; Dependabot PRs are reviewed promptly

---

## Credits

We are grateful to the security researchers who responsibly disclose vulnerabilities.
Confirmed reporters will be credited in the fix's release notes (unless they prefer to remain anonymous).

---

*This security policy was last updated: August 2026*
