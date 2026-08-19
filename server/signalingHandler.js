// Routes TabTwin WebSocket events between hosts, guests, CRDT peers, and the AI agent bridge.
import crypto from 'node:crypto';
import { publicGuests, safeSend } from './sessionManager.js';

/**
 * Rejects an event sent by a viewer with a 403-style error and closes the
 * socket with a custom close frame, matching the issue's acceptance
 * criteria of "a viewer sending an annotation or cursor message receives a
 * 403 WebSocket close frame."
 */
function rejectViewerMessage(socket, event) {
  safeSend(socket, {
    event: 'error',
    payload: { message: `Permission denied: viewers cannot send ${event} events.` },
  });
  socket.close?.(4403, 'Viewers are observe-only');
}

export function createSignalingHandler({ sessions, redisClient, redisSub, serverId }) {
  const SERVER_CHANNEL = `tabtwin:server:${serverId}`;

  // Listen for messages from other server instances.
  redisSub.subscribe(SERVER_CHANNEL, (err) => {
    if (err) {
      console.error(`[TabTwin] Failed to subscribe to ${SERVER_CHANNEL}:`, err.message);
    }
  });

  redisSub.on('message', (channel, message) => {
    if (channel !== SERVER_CHANNEL) return;

    try {
      const { sessionId, guestId, event, payload } = JSON.parse(message);
      deliverLocally(sessionId, guestId, event, payload).catch((err) => {
        console.error('[TabTwin] Error delivering Pub/Sub message locally:', err.message);
      });
    } catch (err) {
      console.error('[TabTwin] Error processing Pub/Sub message:', err.message);
    }
  });

  async function deliverLocally(sessionId, guestId, event, payload) {
    const session = await sessions.getSession(sessionId);
    if (!session) return;

    if (guestId) {
      // Send to specific guest or broadcast to all guests if guestId is 'broadcast'
      if (guestId === 'broadcast') {
        broadcastGuests(session, { event, payload });
      } else {
        const target = findGuestSocket(session, guestId);
        if (target) safeSend(target, { event, payload });
      }
    } else {
      // Send to host
      if (session.hostSocket) safeSend(session.hostSocket, { event, payload });
    }
  }

  function handleConnection(socket) {
    socket.tabTwin = { role: 'unknown', sessionId: null, guestId: null };

    socket.on('message', async (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        safeSend(socket, { event: 'error', payload: { message: 'Invalid JSON message.' } });
        return;
      }

      await routeMessage(socket, message);
    });

    socket.on('close', () => sessions.removeSocket(socket));
  }

  async function routeMessage(socket, { event, payload = {} }) {
    const sessionId = payload.sessionId || socket.tabTwin.sessionId;
    const session = sessionId ? await sessions.getSession(sessionId) : null;

    switch (event) {
      case 'host:connect': {
        const hash = payload.hostToken
          ? crypto.createHash('sha256').update(payload.hostToken).digest('hex')
          : null;
        if (!session || hash !== session.hostTokenHash) {
          safeSend(socket, {
            event: 'error',
            payload: { message: 'Unauthorized or session not found.' },
          });
          return;
        }

        const nextSession = await sessions.attachHost(payload.sessionId, socket);
        if (!nextSession) {
          safeSend(socket, { event: 'error', payload: { message: 'Session not found.' } });
          return;
        }

        socket.tabTwin = { role: 'host', sessionId: nextSession.id, guestId: null };
        safeSend(socket, {
          event: 'host:connected',
          payload: { sessionId: nextSession.id, guests: publicGuests(nextSession) },
        });
        return;
      }

      case 'session:join': {
        const safeName =
          String(payload.name || '')
            .trim()
            .slice(0, 40) || 'Guest';
        const viewerToken = typeof payload.viewerToken === 'string' ? payload.viewerToken : null;
        const joined = await sessions.addGuest(payload.sessionId, socket, {
          name: safeName,
          viewerToken,
        });
        if (!joined) {
          safeSend(socket, { event: 'error', payload: { message: 'Session not found.' } });
          return;
        }

        // socket.tabTwin.role stays 'guest' for connection-routing purposes
        // (host vs. guest socket); the finer-grained viewer/co-host
        // distinction lives in joined.guest.role and is re-checked from the
        // session on every message, so it can never be spoofed once assigned.
        socket.tabTwin = {
          role: 'guest',
          sessionId: joined.session.id,
          guestId: joined.guest.id,
        };

        safeSend(socket, {
          event: 'session:joined',
          payload: {
            sessionId: joined.session.id,
            guest: publicGuest(joined.guest),
            permissions: joined.guest.permissions,
          },
        });

        // Notify host (might be remote)
        const hostTarget = joined.session.hostSocket;
        const hostMessage = {
          event: 'session:joined',
          payload: { guest: publicGuest(joined.guest), guests: publicGuests(joined.session) },
        };

        if (hostTarget) {
          safeSend(hostTarget, hostMessage);
        } else if (joined.session.hostServerId) {
          publishToRemote(joined.session.hostServerId, {
            sessionId: joined.session.id,
            event: hostMessage.event,
            payload: hostMessage.payload,
          });
        }
        return;
      }

      case 'action:request': {
        if (!session) return;

        // Enforce guest permissions server-side before forwarding to the host.
        if (socket.tabTwin.role === 'guest') {
          const guest = session.guests.find((g) => g.id === socket.tabTwin.guestId);

          if (guest?.role === 'viewer') {
            rejectViewerMessage(socket, event);
            return;
          }

          const perms = guest?.permissions || {};
          const actionType = payload.type;

          const permissionMap = {
            click: perms.canClick,
            type: perms.canType,
            scroll: perms.canScroll,
            navigate: perms.canNavigate,
            highlight: perms.canHighlight,
            annotate: perms.canAnnotate,
          };

          if (!(actionType in permissionMap) || !permissionMap[actionType]) {
            safeSend(socket, {
              event: 'error',
              payload: { message: `Permission denied: ${actionType} is not allowed.` },
            });
            return;
          }
        }

        const target =
          socket.tabTwin.role === 'host'
            ? findGuestSocket(session, payload.guestId)
            : session.hostSocket;
        safeSend(target, { event, payload: withSender(socket, payload) });
        return;
      }

      case 'cursor:move':
      case 'crdt:update':
      case 'webrtc:offer':
      case 'webrtc:answer':
      case 'webrtc:ice-candidate':
      case 'onboarding:guidance': {
        if (!session) return;
        const isHost = socket.tabTwin.role === 'host';
        const targetGuestId = payload.guestId;

        // A viewer can receive host cursor/annotation updates (handled in
        // the isHost branch below) but is never allowed to originate a
        // cursor move or an annotation of their own.
        if (!isHost && (event === 'cursor:move' || event === 'crdt:update')) {
          const guest = session.guests.find((g) => g.id === socket.tabTwin.guestId);
          if (guest?.role === 'viewer') {
            rejectViewerMessage(socket, event);
            return;
          }
        }

        if (isHost) {
          const guest = session.guests.find((g) => g.id === targetGuestId);
          if (!guest) return;

          if (guest.socket) {
            safeSend(guest.socket, { event, payload: withSender(socket, payload) });
          } else if (guest.serverId) {
            publishToRemote(guest.serverId, {
              sessionId: session.id,
              guestId: guest.id,
              event,
              payload: withSender(socket, payload),
            });
          }
        } else {
          if (session.hostSocket) {
            safeSend(session.hostSocket, { event, payload: withSender(socket, payload) });
          } else if (session.hostServerId) {
            publishToRemote(session.hostServerId, {
              sessionId: session.id,
              event,
              payload: withSender(socket, payload),
            });
          }
        }
        return;
      }

      case 'cursor:update':
      case 'action:approved':
      case 'agent:action':
      case 'control:revoke': {
        if (!session) return;
        const msg = { event, payload: withSender(socket, payload) };
        const targetGuestId = payload.guestId;

        if (targetGuestId) {
          const guest = session.guests.find((g) => g.id === targetGuestId);
          if (guest?.socket) {
            safeSend(guest.socket, msg);
          } else if (guest?.serverId) {
            publishToRemote(guest.serverId, {
              sessionId: session.id,
              guestId: guest.id,
              event,
              payload: msg.payload,
            });
          }
        } else {
          // Broadcast to all guests across all servers
          const servers = new Set();
          for (const guest of session.guests) {
            if (guest.socket) {
              safeSend(guest.socket, msg);
            } else if (guest.serverId) {
              servers.add(guest.serverId);
            }
          }

          for (const remoteServerId of servers) {
            publishToRemote(remoteServerId, {
              sessionId: session.id,
              guestId: 'broadcast',
              event,
              payload: msg.payload,
            });
          }
        }
        return;
      }

      case 'guest:promote': {
        if (!session || socket.tabTwin.role !== 'host') return;

        const promoted = await sessions.promoteGuest(session.id, payload.guestId);
        if (!promoted) {
          safeSend(socket, {
            event: 'error',
            payload: { message: 'Guest not found or is not a viewer.' },
          });
          return;
        }

        safeSend(socket, {
          event: 'guest:promoted',
          payload: { guest: publicGuest(promoted.guest), guests: publicGuests(promoted.session) },
        });

        const target = promoted.guest.socket;
        const promotedMessage = {
          event: 'guest:promoted',
          payload: { guest: publicGuest(promoted.guest), permissions: promoted.guest.permissions },
        };
        if (target) {
          safeSend(target, promotedMessage);
        } else if (promoted.guest.serverId) {
          publishToRemote(promoted.guest.serverId, {
            sessionId: session.id,
            guestId: promoted.guest.id,
            event: promotedMessage.event,
            payload: promotedMessage.payload,
          });
        }
        return;
      }

      case 'agent:command': {
        if (!session) return;
        const msg = {
          event: 'agent:action',
          payload: {
            command: payload.command,
            actions: payload.actions || [],
            summary: payload.summary || 'Agent command received.',
          },
        };

        if (session.hostSocket) {
          safeSend(session.hostSocket, msg);
        } else if (session.hostServerId) {
          publishToRemote(session.hostServerId, {
            sessionId: session.id,
            event: msg.event,
            payload: msg.payload,
          });
        }
        return;
      }

      default:
        safeSend(socket, { event: 'error', payload: { message: `Unknown event: ${event}` } });
    }
  }

  function publishToRemote(targetServerId, message) {
    redisClient
      .publish(`tabtwin:server:${targetServerId}`, JSON.stringify(message))
      .catch((err) => {
        console.error(
          `[TabTwin] Failed to publish message to remote server ${targetServerId}:`,
          err.message,
        );
      });
  }

  return { handleConnection };
}

export function publicGuest(guest) {
  return {
    id: guest.id,
    name: guest.name,
    role: guest.role || 'guest',
    color: guest.color,
    permissions: guest.permissions,
  };
}

export function withSender(socket, payload) {
  return {
    ...payload,
    senderRole: socket.tabTwin.role,
    guestId: payload.guestId || socket.tabTwin.guestId,
  };
}

export function findGuestSocket(session, guestId) {
  return session.guests.find((guest) => guest.id === guestId)?.socket || null;
}

export function broadcastGuests(session, message, guestId = null) {
  for (const guest of session.guests) {
    if (!guestId || guest.id === guestId) {
      safeSend(guest.socket, message);
    }
  }
}
