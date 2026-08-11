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
