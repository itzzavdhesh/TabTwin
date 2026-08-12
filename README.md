# TabTwin

**Real-time browser tab collaboration with ghost cursors, annotations, and an AI agent that can act inside the host's Chrome tabs.**

TabTwin enables real-time collaboration directly inside a browser tab. A host can share a browser session with guests, allowing them to see the same tab, move ghost cursors, add annotations, and request actions while the host remains in control.

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=111827)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38bdf8?logo=tailwindcss&logoColor=white)
![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285f4?logo=googlechrome&logoColor=white)
![License](https://img.shields.io/badge/License-MIT111827)

---

## ✨ Features

* 🖱️ **Ghost Cursor Collaboration** — Guests can move a collaborative cursor inside the host's browser tab.
* ✏️ **Annotations** — Highlight and annotate content directly on the shared page.
* 🤖 **AI Agent** — An AI agent can assist with approved browser actions.
* 🔐 **Host-Controlled Permissions** — The host remains in control and can approve or revoke requested actions.
* 🌐 **Browser-Based Guest Access** — Guests can join using a shared session link without installing an extension.
* ⚡ **Real-Time Communication** — WebRTC data channels provide real-time collaboration.
* 🔄 **WebSocket Signaling** — WebSocket is used for signaling and fallback communication.
* 🧠 **Session Recording** — Participants can optionally record collaboration events.
* ▶️ **Session Playback** — Recorded events can be played back, paused, resumed, and reviewed.
* 💾 **Redis Session Storage** — Session state is stored in Redis.
* 🧩 **Chrome Extension** — Hosts use a Chrome Manifest V3 extension to manage browser-tab collaboration.

---

## 🎯 Why TabTwin Exists

Traditional screen sharing allows teammates to watch another person's screen, but it does not provide natural interaction.

A participant cannot easily:

* Point at something on the screen.
* Highlight important content.
* Add annotations.
* Request a browser action.
* Collaborate directly inside the host's browser tab.

TabTwin addresses this by allowing guests or an AI agent to appear inside the host's real browser tab as a **live collaborative participant**, while keeping the host in control of browser actions.

---

## 👥 How TabTwin Works

### For Hosts

Hosts:

1. Install the TabTwin Chrome extension.
2. Start a collaboration session.
3. Receive a generated session link.
4. Share the link with guests.
5. Monitor guest interactions.
6. Approve or revoke requested actions when required.

The Chrome extension injects the collaboration interface into browser tabs and communicates with the TabTwin backend.

### For Guests

Guests:

1. Open the session link.
2. Enter their name.
3. Join the session.
4. Move the ghost cursor.
5. Add annotations and highlights.
6. Scroll through the shared page.
7. Request click or typing actions when permitted.

Guests do **not** need to install the Chrome extension.

---

## 🏗️ Architecture Overview

TabTwin consists of four major components:

```text
                         ┌─────────────────────┐
                         │        Host         │
                         │    Chrome Browser   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Chrome Extension │
                         │      Manifest V3   │
                         └──────────┬──────────┘
                                    │
                           WebRTC / WebSocket
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    TabTwin Server   │
                         │ REST + Signaling    │
                         └───────┬─────┬───────┘
                                 │     │
                    ┌────────────┘     └────────────┐
                    ▼                               ▼
             ┌─────────────┐                 ┌─────────────┐
             │    Redis    │                 │   AI Agent  │
             │ Session     │                 │ Claude API  │
             │   State     │                 │             │
             └─────────────┘                 └─────────────┘
                                 │
                                 ▼
                         ┌─────────────────────┐
                         │    Guest Web App    │
                         │    Browser Client   │
                         └─────────────────────┘
```

### Main Components

| Component        | Responsibility                                                     |
| ---------------- | ------------------------------------------------------------------ |
| Chrome Extension | Hosts the collaboration session and injects collaboration overlays |
| Guest Web App    | Allows guests to join and interact with a session                  |
| Server           | Handles REST APIs, session creation, and WebSocket signaling       |
| WebRTC           | Provides real-time peer-to-peer collaboration                      |
| Redis            | Stores session state                                               |
| AI Agent         | Performs approved AI-assisted browser actions                      |

For a more detailed technical explanation, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## 🔄 Session Workflow

1. The host opens the TabTwin Chrome extension.
2. The extension requests a new session from the server.
3. The server creates the session and generates a join link.
4. The host shares the link with guests.
5. Guests open the link in their browser.
6. WebSocket signaling establishes the required WebRTC connection.
7. Collaboration events are exchanged in real time.
8. Guests can move cursors, annotate, scroll, and request actions.
9. The host controls which requested actions are allowed.
10. Session events can optionally be recorded and reviewed through playback.

---

## 🌐 Browser Compatibility

### Guest Browser

| Browser | Guest Support | Installation Required |
| ------- | ------------- | --------------------- |
| Chrome  | ✅ Yes         | ❌ No                  |
| Firefox | ✅ Yes         | ❌ No                  |
| Edge    | ✅ Yes         | ❌ No                  |
| Safari  | ✅ Yes         | ❌ No                  |

### Host Browser

The host extension currently supports **Chrome** because the MVP depends on Chrome Manifest V3 extension APIs.

| Browser | Host Extension            |
| ------- | ------------------------- |
| Chrome  | ✅ Supported               |
| Firefox | ❌ Not currently supported |
| Edge    | ❌ Not currently supported |
| Safari  | ❌ Not currently supported |

---

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS

### Backend

* Node.js
* REST APIs
* WebSocket
* WebRTC signaling

### Browser Extension

* Chrome Extension
* Manifest V3

### Data & Infrastructure

* Redis
* ioredis

### AI

* Anthropic Claude API

---

# 🚀 Installation

## Prerequisites

Before running TabTwin locally, make sure you have:

* Node.js installed.
* npm installed.
* Google Chrome installed.
* Redis running locally or remotely.
* An Anthropic API key if you want to use Claude-powered actions.

---

## 1. Clone the Repository

```bash
git clone https://github.com/itzzavdhesh/TabTwin.git
cd TabTwin
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example server/.env
```

Configure the required variables in `server/.env`.

Example:

```env
REDIS_URL=redis://localhost:6379
PORT=3001
CLIENT_URL=http://localhost:5173
ANTHROPIC_API_KEY=your_api_key_here
```

---

## 4. Start Redis

TabTwin requires Redis for session storage.

### Using Docker

```bash
docker run -d -p 6379:6379 --name tabtwin-redis redis:7-alpine
```

Then configure:

```env
REDIS_URL=redis://localhost:6379
```

If Redis is not available or `REDIS_URL` is missing, the server will not be able to start correctly.

---

## 5. Start the Server

```bash
npm run server
```

The server uses the configured `PORT` value, which defaults to:

```text
3001
```

---

## 6. Start the Guest Web Application

Open another terminal and run:

```bash
npm run dev:web
```

The web application should be available at:

```text
http://localhost:5173
```

---

# 🧩 Chrome Extension Setup

## Build the Extension

From the repository root:

```bash
npm run build --workspace extension
```

This generates the extension build output.

## Load the Extension

1. Open Chrome.
2. Navigate to:

```text
chrome://extensions
```

3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `extension/` directory.
6. Pin TabTwin to the Chrome toolbar.
7. Open the extension.
8. Click **Start Session**.

---

# 👤 Guest Setup

Guests do not need to install anything.

Simply:

1. Open the session link provided by the host.
2. Enter your name.
3. Join the session.
4. Start collaborating.

---

# 🎥 Session Recording and Playback

TabTwin supports optional session recording from the guest session interface.

When recording is enabled, TabTwin can capture a lightweight timeline of collaboration events, including:

* Session lifecycle events.
* Cursor movement.
* Scroll events.
* Annotation additions.
* Click requests.
* Typing approvals.

### Playback

Recorded sessions can be reviewed directly through the session interface.

The current playback implementation supports:

* Play
* Pause
* Resume
* Seek
* Timeline review

Currently, recordings are kept **in memory for the active session** and are not persisted to disk or exported as standalone files.

---

# 🔐 Environment Variables

| Variable            | Required                                                 | Description                                            |
| ------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| `ANTHROPIC_API_KEY` | Optional for local fallback; required for Claude actions | API key used by the AI agent                           |
| `PORT`              | No                                                       | Server port. Defaults to `3001`                        |
| `CLIENT_URL`        | No                                                       | Web application origin used when generating join links |
| `REDIS_URL`         | **Yes**                                                  | Redis connection URL used for session storage          |

Example:

```env
ANTHROPIC_API_KEY=your_api_key
PORT=3001
CLIENT_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379
```

---

# 🗄️ Redis

TabTwin uses Redis to store session state.

Redis provides:

* Session persistence.
* Shared session state.
* Support for horizontally scaled servers.
* Centralized session management.

For local development:

```bash
docker run -d -p 6379:6379 --name tabtwin-redis redis:7-alpine
```

Then configure:

```env
REDIS_URL=redis://localhost:6379
```

---

# 📡 API

The TabTwin server provides APIs for session management and real-time collaboration.

The API layer is responsible for functionality such as:

* Creating collaboration sessions.
* Managing session information.
* WebSocket signaling.
* WebRTC connection establishment.
* Collaboration event handling.
* AI-assisted actions.

For the exact API routes and request/response formats, refer to the server implementation.

As the API becomes more stable, endpoint-specific documentation can be added to this section.

---

# 📁 Project Structure

The project is organized into separate components for the web application, server, and Chrome extension.

```text
TabTwin/
│
├── extension/
│   ├── popup/
│   └── ...
│
├── server/
│   ├── ...
│   └── ...
│
├── web/
│   ├── ...
│   └── ...
│
├── docs/
│
├── ARCHITECTURE.md
├── .env.example
├── package.json
└── README.md
```

> The exact structure may evolve as the project develops. Refer to the repository directories for the current implementation.

---

# 📚 Documentation

Additional technical documentation is available in:

* [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Detailed system architecture and technical design.
* `docs/` — Additional project documentation.

---

# 🤝 Contributing

Contributions are welcome!

If you are interested in contributing to TabTwin, follow the workflow below.

## 1. Fork the Repository

Fork the repository to your GitHub account.

## 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/TabTwin.git
cd TabTwin
```

## 3. Create a Branch

For a new feature:

```bash
git checkout -b feature/your-feature-name
```

For a bug fix:

```bash
git checkout -b fix/your-bug-name
```

For documentation:

```bash
git checkout -b docs/your-documentation-change
```

## 4. Install Dependencies

```bash
npm install
```

## 5. Make Your Changes

Implement your feature, bug fix, or documentation improvement.

Keep changes focused and avoid modifying unrelated parts of the project.

## 6. Test Your Changes

Run the relevant development commands and verify that your changes work correctly.

Start the server:

```bash
npm run server
```

Start the web application:

```bash
npm run dev:web
```

If your changes affect the extension:

```bash
npm run build --workspace extension
```

## 7. Commit Your Changes

Use a clear commit message:

```bash
git add .
git commit -m "docs: improve TabTwin README"
```

## 8. Push Your Branch

```bash
git push origin docs/your-documentation-change
```

## 9. Create a Pull Request

Open the original TabTwin repository on GitHub and create a Pull Request from your branch.

In the PR description, explain:

* What you changed.
* Why the change was needed.
* How you tested it.
* Any relevant references.

---

# 🐛 Reporting Issues

Before opening an issue:

1. Search existing issues.
2. Check the documentation.
3. Confirm that the problem is reproducible.
4. Provide clear reproduction steps.
5. Include relevant logs or other information when appropriate.

Use the appropriate GitHub issue template when creating a new issue.

---

# 💡 Feature Requests

Feature requests are welcome.

When proposing a feature, explain:

* What problem the feature solves.
* How the feature could work.
* Why it would benefit TabTwin users.
* Any alternative approaches you considered.

---

# 🔒 Security

If you discover a security vulnerability, avoid publicly exposing sensitive information in a regular GitHub issue.

Follow the project's recommended security reporting process.

---

# 🗺️ Roadmap

Potential areas for future development include:

* Improved AI-assisted browser actions.
* Additional browser extension support.
* Enhanced session recording.
* Persistent recording storage.
* Recording export functionality.
* Improved annotation capabilities.
* More detailed API documentation.
* Automated tests for collaboration workflows.
* Improved developer documentation.
* Enhanced permission and security controls.

---

# 📄 License

TabTwin is released under the **MIT License**.

See the [`LICENSE`](./LICENSE) file for the complete license text.

---

## ⭐ Support the Project

If you find TabTwin useful:

* ⭐ Star the repository.
* 🐛 Report bugs.
* 💡 Suggest features.
* 🔧 Submit improvements.
* 🤝 Contribute to the project.

Every contribution helps make TabTwin better.
