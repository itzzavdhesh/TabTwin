// Owns in-memory session state for the TabTwin MVP signaling server.
import crypto from 'node:crypto';

const DEFAULT_PERMISSIONS = {
  canHighlight: true,
  canAnnotate: true,
  canScroll: true,
  canClick: false,
  canType: false,
  canNavigate: false
};

const GUEST_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2'];

export function createSessionManager({ clientUrl }) {
  const sessions = new Map();

  function createSession({ hostName = 'Host' } = {}) {
    const id = crypto.randomBytes(4).toString('hex');
    const session = {
      id,
      hostName,
      link: `${clientUrl.replace(/\/$/, '')}/join/${id}`,
      createdAt: new Date().toISOString(),
      hostSocket: null,
      guests: [],
      permissions: { ...DEFAULT_PERMISSIONS },
      activityLog: []
    };

    sessions.set(id, session);
    return session;
  }

  function getSession(id) {
    return sessions.get(id) || null;
  }

  function endSession(id) {
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

  function attachHost(sessionId, socket) {
    const session = getSession(sessionId);
    if (!session) return null;
    session.hostSocket = socket;
    session.activityLog.unshift({ at: Date.now(), message: 'Host connected' });
    return session;
  }

  function addGuest(sessionId, socket, { name = 'Guest' } = {}) {
    const session = getSession(sessionId);
    if (!session) return null;

    const guest = {
      id: crypto.randomBytes(6).toString('hex'),
      name,
      color: GUEST_COLORS[session.guests.length % GUEST_COLORS.length],
      socket,
      permissions: { ...DEFAULT_PERMISSIONS }
    };

    session.guests.push(guest);
    session.activityLog.unshift({ at: Date.now(), message: `${name} joined` });
    return { session, guest };
  }

  function removeSocket(socket) {
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
          payload: { guests: publicGuests(session) }
        });
      }
    }
  }

  function count() {
    return sessions.size;
  }

  return {
    createSession,
    getSession,
    endSession,
    attachHost,
    addGuest,
    removeSocket,
    count
  };
}

export function publicGuests(session) {
  return session.guests.map((guest) => ({
    id: guest.id,
    name: guest.name,
    color: guest.color,
    permissions: guest.permissions
  }));
}

export function safeSend(socket, message) {
  if (!socket || socket.readyState !== 1) return;
  socket.send(JSON.stringify(message));
}

// TODO: Replace in-memory session storage with Redis for multi-instance deployments.
