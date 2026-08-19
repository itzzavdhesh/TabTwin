import test from 'node:test';
import assert from 'node:assert/strict';
import {
  publicGuest,
  withSender,
  findGuestSocket,
  broadcastGuests,
  createSignalingHandler,
} from '../server/signalingHandler.js';

test('publicGuest returns sanitized guest object', () => {
  const guest = {
    id: 'g-123',
    name: 'Bob',
    color: '#00ff00',
    permissions: { canClick: false },
    secret: 'hidden',
  };

  const sanitized = publicGuest(guest);
  assert.deepEqual(sanitized, {
    id: 'g-123',
    name: 'Bob',
    color: '#00ff00',
    permissions: { canClick: false },
  });
  assert.equal(sanitized.secret, undefined);
});

test('withSender enriches payload with senderRole and guestId', () => {
  const socket = {
    tabTwin: {
      role: 'guest',
      guestId: 'guest-456',
    },
  };

  const payload = { action: 'hover', x: 10, y: 20 };
  const enriched = withSender(socket, payload);

  assert.equal(enriched.senderRole, 'guest');
  assert.equal(enriched.guestId, 'guest-456');
  assert.equal(enriched.action, 'hover');
  assert.equal(enriched.x, 10);
});

test('findGuestSocket retrieves matching guest socket or null', () => {
  const mockSocket1 = { id: 's1' };
  const mockSocket2 = { id: 's2' };
  const session = {
    guests: [
      { id: 'g1', socket: mockSocket1 },
      { id: 'g2', socket: mockSocket2 },
    ],
  };

  assert.equal(findGuestSocket(session, 'g2'), mockSocket2);
  assert.equal(findGuestSocket(session, 'g3'), null);
});

test('broadcastGuests sends message to all or targeted guest', () => {
  const received = [];
  const session = {
    guests: [
      {
        id: 'g1',
        socket: {
          readyState: 1,
          send(data) {
            received.push({ id: 'g1', data });
          },
        },
      },
      {
        id: 'g2',
        socket: {
          readyState: 1,
          send(data) {
            received.push({ id: 'g2', data });
          },
        },
      },
    ],
  };

  broadcastGuests(session, { test: 1 });
  assert.equal(received.length, 2);

  received.length = 0;
  broadcastGuests(session, { test: 2 }, 'g2');
  assert.equal(received.length, 1);
  assert.equal(received[0].id, 'g2');
});

test('createSignalingHandler returns handleConnection function', () => {
  const mockRedisSub = {
    subscribe() {},
    on() {},
  };

  const handler = createSignalingHandler({
    sessions: {},
    redisClient: {},
    redisSub: mockRedisSub,
    serverId: 'server-test',
  });

  assert.equal(typeof handler.handleConnection, 'function');
});

// ---------- In-session chat overlay (#68) ----------

function createMockSocket() {
  const listeners = {};
  return {
    sent: [],
    on(evt, cb) {
      listeners[evt] = cb;
    },
    emit(evt, ...args) {
      return listeners[evt]?.(...args);
    },
    send(data) {
      this.sent.push(JSON.parse(data));
    },
    readyState: 1,
  };
}

function createMockRedisSub() {
  return { subscribe() {}, on() {} };
}

test('chat:message from a guest is broadcast to the host and every other guest, never persisted on the session object', async () => {
  const senderSocket = createMockSocket();
  const hostSocket = createMockSocket();
  const otherGuestSocket = createMockSocket();

  const session = {
    id: 'sess-1',
    hostName: 'Alex',
    hostSocket,
    hostServerId: null,
    guests: [
      { id: 'guest-1', name: 'Sam', socket: senderSocket, permissions: {} },
      { id: 'guest-2', name: 'Riya', socket: otherGuestSocket, permissions: {} },
    ],
  };

  const sessions = { getSession: async () => session };
  const handler = createSignalingHandler({
    sessions,
    redisClient: {},
    redisSub: createMockRedisSub(),
    serverId: 'server-test',
  });

  handler.handleConnection(senderSocket);
  senderSocket.tabTwin = { role: 'guest', sessionId: 'sess-1', guestId: 'guest-1' };

  await senderSocket.emit(
    'message',
    JSON.stringify({
      event: 'chat:message',
      payload: { sessionId: 'sess-1', content: '  Can you scroll down?  ' },
    }),
  );

  const hostMsg = hostSocket.sent.find((m) => m.event === 'chat:message');
  const otherGuestMsg = otherGuestSocket.sent.find((m) => m.event === 'chat:message');

  assert.ok(hostMsg, 'host should receive the chat message');
  assert.ok(otherGuestMsg, 'the other guest should receive the chat message');
  assert.equal(hostMsg.payload.content, 'Can you scroll down?', 'content should be trimmed');
  assert.equal(hostMsg.payload.senderId, 'guest-1');
  assert.equal(hostMsg.payload.senderName, 'Sam');
  assert.equal(hostMsg.payload.senderRole, 'guest');
  assert.ok(hostMsg.payload.id, 'message should have a unique id');
  assert.ok(typeof hostMsg.payload.timestamp === 'number');

  // Nothing chat-related should ever be written onto the session object
  // itself — chat only exists as an in-flight relay.
  assert.equal(session.chatMessages, undefined);
  assert.equal(session.activityLog, undefined);
});

test('chat:message from the host is broadcast to all guests with senderRole "host"', async () => {
  const hostSocket = createMockSocket();
  const guestSocket = createMockSocket();

  const session = {
    id: 'sess-1',
    hostName: 'Alex',
    hostSocket,
    hostServerId: null,
    guests: [{ id: 'guest-1', name: 'Sam', socket: guestSocket, permissions: {} }],
  };

  const sessions = { getSession: async () => session };
  const handler = createSignalingHandler({
    sessions,
    redisClient: {},
    redisSub: createMockRedisSub(),
    serverId: 'server-test',
  });

  handler.handleConnection(hostSocket);
  hostSocket.tabTwin = { role: 'host', sessionId: 'sess-1', guestId: null };

  await hostSocket.emit(
    'message',
    JSON.stringify({
      event: 'chat:message',
      payload: { sessionId: 'sess-1', content: 'Welcome!' },
    }),
  );

  const guestMsg = guestSocket.sent.find((m) => m.event === 'chat:message');
  assert.ok(guestMsg);
  assert.equal(guestMsg.payload.senderId, 'host');
  assert.equal(guestMsg.payload.senderName, 'Alex');
  assert.equal(guestMsg.payload.senderRole, 'host');
});

test('chat:message with only whitespace content is dropped, not broadcast', async () => {
  const senderSocket = createMockSocket();
  const hostSocket = createMockSocket();

  const session = {
    id: 'sess-1',
    hostName: 'Alex',
    hostSocket,
    hostServerId: null,
    guests: [{ id: 'guest-1', name: 'Sam', socket: senderSocket, permissions: {} }],
  };

  const sessions = { getSession: async () => session };
  const handler = createSignalingHandler({
    sessions,
    redisClient: {},
    redisSub: createMockRedisSub(),
    serverId: 'server-test',
  });

  handler.handleConnection(senderSocket);
  senderSocket.tabTwin = { role: 'guest', sessionId: 'sess-1', guestId: 'guest-1' };

  await senderSocket.emit(
    'message',
    JSON.stringify({
      event: 'chat:message',
      payload: { sessionId: 'sess-1', content: '   ' },
    }),
  );

  assert.equal(hostSocket.sent.length, 0, 'no chat message should be broadcast for empty content');
});

test('chat:reaction is broadcast with the messageId, emoji, and reactor identity', async () => {
  const senderSocket = createMockSocket();
  const hostSocket = createMockSocket();

  const session = {
    id: 'sess-1',
    hostName: 'Alex',
    hostSocket,
    hostServerId: null,
    guests: [{ id: 'guest-1', name: 'Sam', socket: senderSocket, permissions: {} }],
  };

  const sessions = { getSession: async () => session };
  const handler = createSignalingHandler({
    sessions,
    redisClient: {},
    redisSub: createMockRedisSub(),
    serverId: 'server-test',
  });

  handler.handleConnection(senderSocket);
  senderSocket.tabTwin = { role: 'guest', sessionId: 'sess-1', guestId: 'guest-1' };

  await senderSocket.emit(
    'message',
    JSON.stringify({
      event: 'chat:reaction',
      payload: { sessionId: 'sess-1', messageId: 'msg-123', emoji: '👍' },
    }),
  );

  const reactionMsg = hostSocket.sent.find((m) => m.event === 'chat:reaction');
  assert.ok(reactionMsg);
  assert.deepEqual(reactionMsg.payload, {
    messageId: 'msg-123',
    emoji: '👍',
    senderId: 'guest-1',
    senderName: 'Sam',
  });
});
