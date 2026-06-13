# Contributing to TabTwin

Thanks for helping build TabTwin. The project is intentionally lean: a Chrome extension, a React guest web app, and a small Node signaling server.

## Fork And Run Locally

1. Fork the repository.
2. Clone your fork.

```bash
git clone https://github.com/YOUR-GITHUB-USERNAME/TabTwin.git
cd TabTwin
npm install
```

3. Start the signaling server.

```bash
npm run server
```

4. Start the guest web app.

```bash
npm run dev:web
```

## Load The Extension In Developer Mode

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the `extension/` folder.
6. Open the TabTwin popup and start a session.

## Commit Messages

TabTwin enforces [Conventional Commits](https://www.conventionalcommits.org/) via `commitlint`. The `commit-msg` git hook rejects non-conforming messages automatically.

### Format

```text
<type>(<scope>): <short summary>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`

**Scope** (optional): area of the codebase — e.g. `extension`, `server`, `webapp`, `auth`, `ws`

### Good commits

```text
feat(extension): add ghost cursor visibility toggle
fix(server): handle duplicate session ID on reconnect
docs: update setup instructions for Windows
refactor(webapp): extract useSession hook from App component
chore: upgrade ws to v8.18.0
test(server): add unit tests for session cleanup logic
ci: add commitlint check to GitHub Actions
```

### Bad commits

```text
# Too vague — no type, no context
fixed stuff

# No type prefix
update README

# Wrong type capitalized
Fix: broken websocket

# Imperative mood broken, too long for subject line
feat: I added a new feature that allows users to toggle the ghost cursor visibility in the extension popup and also fixed a small bug

# Missing colon after type
feat add dark mode
```

### Breaking changes

Add `!` after the type/scope and a `BREAKING CHANGE:` footer:

```text
feat(server)!: change session payload shape
```

---

## Coding Conventions

- Keep each file focused on one responsibility.
- Add a top comment explaining what each source file does.
- Mark incomplete work with `TODO:` and a clear description.
- Prefer browser and platform APIs before adding packages.
- Keep guest actions permissioned and observable by the host.
- Use structured WebSocket events with `{ event, payload }`.
- Keep AI provider code behind a small swappable interface.

## Good First Issues

Easy:

- Add dark mode to popup UI.
- Add guest name customization before joining.
- Add sound notification when guest joins.
- Show tab favicon in guest list.

Medium:

- Replace in-memory session storage with Redis.
- Add end-to-end encryption for WebRTC data channel.
- Support Firefox extension Manifest V3 differences.
- Add annotation persistence after session ends.
- Add session recording/playback feature.
- Build guest mobile view with view-only mode on phone.
- Add web app dashboard for hosts to manage past sessions.
- Add guest waiting room where the host approves before join.

Hard:

- Add OpenAI as an alternative AI agent provider.
- Build a web dashboard to manage sessions and view history.
- Add mobile companion app with view-only mode.
- Implement granular permission system.
- Add voice chat layer between host and guest during session.
- Allow guests to install the extension mid-session to upgrade from view-only.
- Build a standalone Electron desktop app wrapping both extension and web app.
