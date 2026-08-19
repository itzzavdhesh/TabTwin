import test from 'node:test';
import assert from 'node:assert/strict';
import {
  publicGuest,
  withSender,
  findGuestSocket,
  broadcastGuests,
  createSignalingHandler,
  attachHeartbeat,
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

// ---------- Heartbeat-based dead-connection cleanup (#69) ----------

function createMockClientSocket({ isAlive = true } = {}) {
  return {
    isAlive,
    pingCalls: 0,
    terminateCalls: 0,
    ping() {
      this.pingCalls++;
    },
    terminate() {
      this.terminateCalls++;
    },
  };
}

function createMockWss(clients) {
  const listeners = {};
  return {
    clients,
    on(evt, cb) {
      listeners[evt] = cb;
    },
    emit(evt) {
      listeners[evt]?.();
    },
  };
}

test('attachHeartbeat pings a live client and flips isAlive to false to arm the next check', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });

  const client = createMockClientSocket({ isAlive: true });
  const wss = createMockWss(new Set([client]));

  attachHeartbeat(wss, { intervalMs: 1000 });
  t.mock.timers.tick(1000);

  assert.equal(client.pingCalls, 1);
  assert.equal(client.isAlive, false);
  assert.equal(client.terminateCalls, 0);
});

test('attachHeartbeat terminates a client that never answered the previous ping', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });

  const client = createMockClientSocket({ isAlive: false });
  const wss = createMockWss(new Set([client]));

  attachHeartbeat(wss, { intervalMs: 1000 });
  t.mock.timers.tick(1000);

  assert.equal(client.terminateCalls, 1);
  assert.equal(
    client.pingCalls,
    0,
    'a terminated client should not also be pinged in the same sweep',
  );
});

test('attachHeartbeat detects and terminates a dead connection within roughly one interval', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });

  // Simulates a client whose pong never arrives (crashed tab, dropped
  // network) — isAlive stays false across the second sweep, so it must be
  // terminated on the very next tick after being marked unanswered.
  const client = createMockClientSocket({ isAlive: true });
  const wss = createMockWss(new Set([client]));

  attachHeartbeat(wss, { intervalMs: 5000 });

  t.mock.timers.tick(5000); // first sweep: pings, marks isAlive = false
  assert.equal(client.terminateCalls, 0);

  t.mock.timers.tick(5000); // second sweep: no pong arrived, so terminate
  assert.equal(client.terminateCalls, 1);
});

test('attachHeartbeat stops its interval when the server emits close', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });

  const client = createMockClientSocket({ isAlive: true });
  const wss = createMockWss(new Set([client]));

  attachHeartbeat(wss, { intervalMs: 1000 });
  wss.emit('close');

  t.mock.timers.tick(5000);
  assert.equal(client.pingCalls, 0, 'no further pings should fire after the server closed');
});
