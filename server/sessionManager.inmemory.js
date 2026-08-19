// In-memory session manager that mirrors the async interface of the Redis-backed
// sessionManager.js. Use this for local development or unit tests when a live
// Redis instance is not available.
//
// Usage in index.js:
//   import { createSessionManager } from './sessionManager.inmemory.js';
//   const sessions = createSessionManager({ clientUrl: CLIENT_URL });
import crypto from 'node:crypto';

const DEFAULT_PERMISSIONS = {
  canHighlight: true,
  canAnnotate: true,
  canScroll: true,
  canClick: false,
  canType: false,
  canNavigate: false,
};

// Viewers are observe-only: every interactive permission is forced off
// server-side regardless of what a client requests.
const VIEWER_PERMISSIONS = {
  canHighlight: false,
  canAnnotate: false,
  canScroll: false,
  canClick: false,
  canType: false,
  canNavigate: false,
};

const GUEST_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2'];

/**
 * Creates an in-memory session manager whose every method returns a Promise,
 * making it a drop-in replacement for the Redis-backed variant.
 *
 * @param {{ clientUrl: string }} options
 */
const MAX_ID_ATTEMPTS = 10;

export function createSessionManager({ clientUrl }) {
  const sessions = new Map();

  async function createSession({ hostName = 'Host' } = {}) {
    let id;
    for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt++) {
      const candidate = crypto.randomBytes(4).toString('hex');
      if (!sessions.has(candidate)) {
        id = candidate;
        break;
      }
    }
    if (!id) {
      throw new Error('Failed to generate a unique session ID after maximum attempts.');
    }

    const viewerToken = crypto.randomBytes(32).toString('hex');
    const viewerTokenHash = crypto.createHash('sha256').update(viewerToken).digest('hex');
    const baseLink = clientUrl.replace(/\/$/, '');

    const session = {
      id,
      hostName,
      viewerTokenHash,
      link: `${baseLink}/join/${id}`,
      viewerLink: `${baseLink}/join/${id}?role=viewer&vt=${viewerToken}`,
      createdAt: new Date().toISOString(),
      hostSocket: null,
      guests: [],
      permissions: { ...DEFAULT_PERMISSIONS },
      activityLog: [],
    };
    sessions.set(id, session);
    // Plaintext token is returned only from this create call, never stored
    // on the session object itself (avoids leaking it via getSession).
    return { ...session, viewerToken };
  }

  async function getSession(id) {
    return sessions.get(id) || null;
  }

  async function endSession(id) {
    const session = sessions.get(id);
    if (!session) return false;

    for (const guest of session.guests) {
      safeSend(guest.socket, { event: 'control:revoke', payload: { reason: 'session-ended' } });
      guest.socket?.close?.(1000, 'Session ended');
    }
    safeSend(session.hostSocket, { event: 'session:ended', payload: { sessionId: id } });
    session.hostSocket?.close?.(1000, 'Session ended');
    sessions.delete(id);
    return true;
  }

  async function attachHost(sessionId, socket) {
    const session = sessions.get(sessionId);
    if (!session) return null;
    session.hostSocket = socket;
    session.activityLog.unshift({ at: Date.now(), message: 'Host connected' });
    return session;
  }

  async function addGuest(sessionId, socket, { name = 'Guest', viewerToken = null } = {}) {
    const session = sessions.get(sessionId);
    if (!session) return null;

    // Role is derived from the viewer token's hash, never from a raw
    // client-supplied `role` string — removing `?role=viewer` from the URL
    // has no effect because the token, not the label, decides the role.
    const isViewer = Boolean(
      viewerToken &&
      session.viewerTokenHash &&
      crypto.createHash('sha256').update(viewerToken).digest('hex') === session.viewerTokenHash,
    );
    const role = isViewer ? 'viewer' : 'guest';

    const guest = {
      id: crypto.randomBytes(6).toString('hex'),
      name,
      role,
      color: GUEST_COLORS[session.guests.length % GUEST_COLORS.length],
      socket,
      permissions: role === 'viewer' ? { ...VIEWER_PERMISSIONS } : { ...DEFAULT_PERMISSIONS },
    };

    session.guests.push(guest);
    session.activityLog.unshift({
      at: Date.now(),
      message: `${name} joined${role === 'viewer' ? ' as a viewer' : ''}`,
    });
    return { session, guest };
  }

  /**
   * Promotes a viewer to a full co-host guest, restoring default
   * interactive permissions. No-op (returns null) if the guest is not a
   * viewer or does not exist.
   */
  async function promoteGuest(sessionId, guestId) {
    const session = sessions.get(sessionId);
    if (!session) return null;

    const guest = session.guests.find((g) => g.id === guestId);
    if (!guest || guest.role !== 'viewer') return null;

    guest.role = 'co-host';
    guest.permissions = { ...DEFAULT_PERMISSIONS };
    session.activityLog.unshift({ at: Date.now(), message: `${guest.name} promoted to co-host` });
    return { session, guest };
  }

  async function removeSocket(socket) {
    for (const session of sessions.values()) {
      if (session.hostSocket === socket) {
        session.hostSocket = null;
        session.activityLog.unshift({ at: Date.now(), message: 'Host disconnected' });
      }

      const before = session.guests.length;
      session.guests = session.guests.filter((guest) => guest.socket !== socket);
      if (before !== session.guests.length) {
        session.activityLog.unshift({ at: Date.now(), message: 'Guest disconnected' });
        safeSend(session.hostSocket, {
          event: 'session:guest-left',
          payload: { guests: publicGuests(session) },
        });
      }
    }
  }

  async function count() {
    return sessions.size;
  }

  return {
    createSession,
    getSession,
    endSession,
    attachHost,
    addGuest,
    promoteGuest,
    removeSocket,
    count,
  };
}

export function publicGuests(session) {
  return session.guests.map((guest) => ({
    id: guest.id,
    name: guest.name,
    role: guest.role || 'guest',
    color: guest.color,
    permissions: guest.permissions,
  }));
}

export function safeSend(socket, message) {
  if (!socket || socket.readyState !== 1) return;
  socket.send(JSON.stringify(message));
}
