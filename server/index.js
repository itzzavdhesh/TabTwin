// Starts the TabTwin Express API and WebSocket signaling server.
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { createSessionManager } from './sessionManager.js';
import { createSignalingHandler } from './signalingHandler.js';

const PORT = Number(process.env.PORT || 3001);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();
const server = http.createServer(app);
const sessions = createSessionManager({ clientUrl: CLIENT_URL });

app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'tabtwin-server', sessions: sessions.count() });
});

app.post('/api/session/create', (req, res) => {
  const hostName = req.body?.hostName || 'Host';
  const session = sessions.createSession({ hostName });
  res.status(201).json({
    session_id: session.id,
    link: session.link,
    permissions: session.permissions
  });
});

app.get('/api/session/:id', (req, res) => {
  const session = sessions.getSession(req.params.id);
  if (!session) {
    res.status(404).json({ exists: false, message: 'Session not found or expired.' });
    return;
  }

  res.json({
    exists: true,
    session_id: session.id,
    guests: session.guests.map((guest) => ({
      id: guest.id,
      name: guest.name,
      color: guest.color,
      permissions: guest.permissions
    })),
    createdAt: session.createdAt
  });
});

app.delete('/api/session/:id', (req, res) => {
  const ended = sessions.endSession(req.params.id);
  res.status(ended ? 200 : 404).json({ ended });
});

const wss = new WebSocketServer({ server });
const signaling = createSignalingHandler({ sessions });
wss.on('connection', signaling.handleConnection);

server.listen(PORT, () => {
  console.log(`TabTwin server listening on http://localhost:${PORT}`);
});
