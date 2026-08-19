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
    role: 'guest',
    color: '#00ff00',
    permissions: { canClick: false },
  });
  assert.equal(sanitized.secret, undefined);
});

test('publicGuest surfaces the assigned role when present', () => {
  const guest = { id: 'g-1', name: 'Viewer', role: 'viewer', color: '#000', permissions: {} };
  assert.equal(publicGuest(guest).role, 'viewer');
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

// ---------- Viewer role server-side enforcement (#67) ----------

function createMockSocket() {
  const listeners = {};
  return {
    sent: [],
    closed: null,
    on(evt, cb) {
      listeners[evt] = cb;
    },
    emit(evt, ...args) {
      return listeners[evt]?.(...args);
    },
    send(data) {
      this.sent.push(JSON.parse(data));
    },
    close(code, reason) {
      this.closed = { code, reason };
    },
    readyState: 1,
  };
}

function createMockRedisSub() {
  return { subscribe() {}, on() {} };
}

function buildSession({ guests = [] } = {}) {
  return {
    id: 'sess-1',
    hostSocket: null,
    hostServerId: null,
    guests,
  };
}

test('viewer sending cursor:move is rejected with error and 403 close frame', async () => {
  const viewerSocket = createMockSocket();

  const session = buildSession({
    guests: [{ id: 'viewer-1', role: 'viewer', socket: viewerSocket, permissions: {} }],
  });

  const sessions = {
    getSession: async () => session,
  };

  const handler = createSignalingHandler({
    sessions,
    redisClient: {},
    redisSub: createMockRedisSub(),
    serverId: 'server-test',
  });

  handler.handleConnection(viewerSocket);
  viewerSocket.tabTwin = { role: 'guest', sessionId: 'sess-1', guestId: 'viewer-1' };
  await viewerSocket.emit(
    'message',
    JSON.stringify({
      event: 'cursor:move',
      payload: { sessionId: 'sess-1', x: 5, y: 5 },
    }),
  );

  const errorMsg = viewerSocket.sent.find((m) => m.event === 'error');
  assert.ok(errorMsg, 'expected an error message to be sent to the viewer');
  assert.match(errorMsg.payload.message, /viewers cannot send/i);
  assert.ok(viewerSocket.closed, 'expected the viewer socket to be closed');
  assert.equal(viewerSocket.closed.code, 4403);
});

test('viewer sending crdt:update (annotation) is rejected server-side', async () => {
  const viewerSocket = createMockSocket();

  const session = buildSession({
    guests: [{ id: 'viewer-1', role: 'viewer', socket: viewerSocket, permissions: {} }],
  });

  const sessions = { getSession: async () => session };
  const handler = createSignalingHandler({
    sessions,
    redisClient: {},
    redisSub: createMockRedisSub(),
    serverId: 'server-test',
  });

  handler.handleConnection(viewerSocket);
  viewerSocket.tabTwin = { role: 'guest', sessionId: 'sess-1', guestId: 'viewer-1' };
  await viewerSocket.emit(
    'message',
    JSON.stringify({
      event: 'crdt:update',
      payload: { sessionId: 'sess-1', annotation: { text: 'nope' } },
    }),
  );

  assert.ok(viewerSocket.sent.some((m) => m.event === 'error'));
  assert.ok(viewerSocket.closed);
  assert.equal(viewerSocket.closed.code, 4403);
});

test('viewer sending action:request is rejected regardless of permission map', async () => {
  const viewerSocket = createMockSocket();

  // Even if permissions were accidentally left truthy, role must win.
  const session = buildSession({
    guests: [
      { id: 'viewer-1', role: 'viewer', socket: viewerSocket, permissions: { canClick: true } },
    ],
  });

  const sessions = { getSession: async () => session };
  const handler = createSignalingHandler({
    sessions,
    redisClient: {},
    redisSub: createMockRedisSub(),
    serverId: 'server-test',
  });

  handler.handleConnection(viewerSocket);
  viewerSocket.tabTwin = { role: 'guest', sessionId: 'sess-1', guestId: 'viewer-1' };
  await viewerSocket.emit(
    'message',
    JSON.stringify({
      event: 'action:request',
      payload: { sessionId: 'sess-1', type: 'click' },
    }),
  );

  assert.ok(viewerSocket.sent.some((m) => m.event === 'error'));
  assert.ok(viewerSocket.closed);
  assert.equal(viewerSocket.closed.code, 4403);
});

test('a regular (non-viewer) guest cursor:move is forwarded to the host, not rejected', async () => {
  const guestSocket = createMockSocket();
  const hostSocket = createMockSocket();

  const session = buildSession({
    guests: [{ id: 'guest-1', role: 'guest', socket: guestSocket, permissions: {} }],
  });
  session.hostSocket = hostSocket;

  const sessions = { getSession: async () => session };
  const handler = createSignalingHandler({
    sessions,
    redisClient: {},
    redisSub: createMockRedisSub(),
    serverId: 'server-test',
  });

  handler.handleConnection(guestSocket);
  guestSocket.tabTwin = { role: 'guest', sessionId: 'sess-1', guestId: 'guest-1' };
  await guestSocket.emit(
    'message',
    JSON.stringify({
      event: 'cursor:move',
      payload: { sessionId: 'sess-1', x: 1, y: 2 },
    }),
  );

  assert.equal(guestSocket.closed, null);
  assert.ok(hostSocket.sent.some((m) => m.event === 'cursor:move'));
});

test('host promoting a viewer calls sessions.promoteGuest and notifies both parties', async () => {
  const hostSocket = createMockSocket();
  const viewerSocket = createMockSocket();

  const viewerGuest = {
    id: 'viewer-1',
    name: 'Val',
    role: 'co-host',
    socket: viewerSocket,
    permissions: { canAnnotate: true },
  };
  const session = buildSession({ guests: [viewerGuest] });
  session.hostSocket = hostSocket;

  let promoteCalledWith = null;
  const sessions = {
    getSession: async () => session,
    promoteGuest: async (sessionId, guestId) => {
      promoteCalledWith = { sessionId, guestId };
      return { session, guest: viewerGuest };
    },
  };

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
      event: 'guest:promote',
      payload: { sessionId: 'sess-1', guestId: 'viewer-1' },
    }),
  );

  assert.deepEqual(promoteCalledWith, { sessionId: 'sess-1', guestId: 'viewer-1' });
  assert.ok(hostSocket.sent.some((m) => m.event === 'guest:promoted'));
  assert.ok(viewerSocket.sent.some((m) => m.event === 'guest:promoted'));
});

test('a non-host cannot trigger guest:promote', async () => {
  const guestSocket = createMockSocket();

  let promoteCalled = false;
  const session = buildSession({
    guests: [{ id: 'viewer-1', role: 'viewer', socket: createMockSocket(), permissions: {} }],
  });
  const sessions = {
    getSession: async () => session,
    promoteGuest: async () => {
      promoteCalled = true;
      return null;
    },
  };

  const handler = createSignalingHandler({
    sessions,
    redisClient: {},
    redisSub: createMockRedisSub(),
    serverId: 'server-test',
  });

  handler.handleConnection(guestSocket);
  guestSocket.tabTwin = { role: 'guest', sessionId: 'sess-1', guestId: 'guest-1' };
  await guestSocket.emit(
    'message',
    JSON.stringify({
      event: 'guest:promote',
      payload: { sessionId: 'sess-1', guestId: 'viewer-1' },
    }),
  );

  assert.equal(promoteCalled, false);
});
