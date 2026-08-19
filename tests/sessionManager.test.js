import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionManager, publicGuests, safeSend } from '../server/sessionManager.js';

class MockRedis {
  constructor() {
    this.store = new Map();
  }

  async set(key, value, ...args) {
    const isNx = args.includes('NX');
    if (isNx && this.store.has(key)) {
      return null;
    }
    this.store.set(key, value);
    return 'OK';
  }

  async get(key) {
    return this.store.get(key) || null;
  }

  async del(key) {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  async scan(cursor, ...args) {
    const keys = Array.from(this.store.keys());
    return ['0', keys];
  }
}

test('createSession generates unique session ID, hostToken, and default permissions', async () => {
  const redisClient = new MockRedis();
  const manager = createSessionManager({
    clientUrl: 'http://localhost:5173',
    redisClient,
    serverId: 'test-server-1',
  });

  const session = await manager.createSession({ hostName: 'Alice' });
  assert.ok(session.id, 'Session should have an ID');
  assert.equal(typeof session.id, 'string');
  assert.equal(session.id.length, 8, 'Session ID should be an 8-character hex string');
  assert.equal(session.hostName, 'Alice');
  assert.ok(session.hostToken, 'Session should have a hostToken');
  assert.equal(session.hostToken.length, 64, 'Host token should be 64-character hex string');
  assert.deepEqual(session.permissions, {
    canHighlight: true,
    canAnnotate: true,
    canScroll: true,
    canClick: false,
    canType: false,
    canNavigate: false,
  });
});

test('getSession retrieves session and hydrates socket references', async () => {
  const redisClient = new MockRedis();
  const manager = createSessionManager({
    clientUrl: 'http://localhost:5173',
    redisClient,
    serverId: 'test-server-1',
  });

  const created = await manager.createSession({ hostName: 'Bob' });
  const fetched = await manager.getSession(created.id);

  assert.ok(fetched);
  assert.equal(fetched.id, created.id);
  assert.equal(fetched.hostName, 'Bob');
  assert.equal(fetched.hostSocket, null);
  assert.deepEqual(fetched.guests, []);
});

test('attachHost associates hostSocket with session', async () => {
  const redisClient = new MockRedis();
  const manager = createSessionManager({
    clientUrl: 'http://localhost:5173',
    redisClient,
    serverId: 'test-server-1',
  });

  const created = await manager.createSession({ hostName: 'Charlie' });
  const dummySocket = { id: 'sock-1' };
  const updated = await manager.attachHost(created.id, dummySocket);

  assert.ok(updated);
  assert.equal(updated.hostSocket, dummySocket);
});

test('addGuest and removeSocket manage participant lifecycle correctly', async () => {
  const redisClient = new MockRedis();
  const manager = createSessionManager({
    clientUrl: 'http://localhost:5173',
    redisClient,
    serverId: 'test-server-1',
  });

  const created = await manager.createSession({ hostName: 'Diana' });
  const guestSocket = { id: 'guest-sock-1', readyState: 1, send: () => {} };
  const joined = await manager.addGuest(created.id, guestSocket, { name: 'Eve' });

  assert.ok(joined);
  assert.equal(joined.guest.name, 'Eve');
  assert.equal(joined.session.guests.length, 1);
  assert.equal(joined.session.guests[0].socket, guestSocket);
  assert.ok(joined.guest.color.startsWith('#'), 'Guest should have a hex color assigned');

  await manager.removeSocket(guestSocket);
  const fetched = await manager.getSession(created.id);
  assert.ok(fetched);
  assert.equal(fetched.guests.length, 0);
});

test('endSession removes session from storage and closes sockets', async () => {
  const redisClient = new MockRedis();
  const manager = createSessionManager({
    clientUrl: 'http://localhost:5173',
    redisClient,
    serverId: 'test-server-1',
  });

  const created = await manager.createSession({ hostName: 'Grace' });
  const existed = await manager.getSession(created.id);
  assert.ok(existed);

  const ended = await manager.endSession(created.id);
  assert.equal(ended, true);
  const afterClose = await manager.getSession(created.id);
  assert.equal(afterClose, null);
});

test('count returns total sessions in redis', async () => {
  const redisClient = new MockRedis();
  const manager = createSessionManager({
    clientUrl: 'http://localhost:5173',
    redisClient,
    serverId: 'test-server-1',
  });

  await manager.createSession({ hostName: 'Host1' });
  await manager.createSession({ hostName: 'Host2' });

  const total = await manager.count();
  assert.equal(total, 2);
});

// ---------- Read-only viewer role (#67) ----------

test('createSession issues a distinct viewer link/token gated by viewerTokenHash', async () => {
  const redisClient = new MockRedis();
  const manager = createSessionManager({
    clientUrl: 'http://localhost:5173',
    redisClient,
    serverId: 'test-server-1',
  });

  const session = await manager.createSession({ hostName: 'Host' });
  assert.ok(
    session.viewerToken,
    'Session should have a plaintext viewerToken in the create response',
  );
  assert.ok(
    session.viewerLink.includes(session.viewerToken),
    'viewerLink should embed the viewer token',
  );
  assert.ok(session.viewerLink.includes('role=viewer'));
});

test('addGuest assigns role "guest" when no viewer token is supplied', async () => {
  const redisClient = new MockRedis();
  const manager = createSessionManager({
    clientUrl: 'http://localhost:5173',
    redisClient,
    serverId: 'test-server-1',
  });

  const created = await manager.createSession({ hostName: 'Host' });
  const socket = { readyState: 1, send: () => {} };
  const joined = await manager.addGuest(created.id, socket, { name: 'Sam' });

  assert.equal(joined.guest.role, 'guest');
  assert.deepEqual(joined.guest.permissions, {
    canHighlight: true,
    canAnnotate: true,
    canScroll: true,
    canClick: false,
    canType: false,
    canNavigate: false,
  });
});

test('addGuest assigns role "viewer" and forces every permission off when the correct viewer token is supplied', async () => {
  const redisClient = new MockRedis();
  const manager = createSessionManager({
    clientUrl: 'http://localhost:5173',
    redisClient,
    serverId: 'test-server-1',
  });

  const created = await manager.createSession({ hostName: 'Host' });
  const socket = { readyState: 1, send: () => {} };
  const joined = await manager.addGuest(created.id, socket, {
    name: 'Watcher',
    viewerToken: created.viewerToken,
  });

  assert.equal(joined.guest.role, 'viewer');
  assert.deepEqual(joined.guest.permissions, {
    canHighlight: false,
    canAnnotate: false,
    canScroll: false,
    canClick: false,
    canType: false,
    canNavigate: false,
  });
});

test('addGuest ignores an invalid/forged viewer token and falls back to role "guest"', async () => {
  const redisClient = new MockRedis();
  const manager = createSessionManager({
    clientUrl: 'http://localhost:5173',
    redisClient,
    serverId: 'test-server-1',
  });

  const created = await manager.createSession({ hostName: 'Host' });
  const socket = { readyState: 1, send: () => {} };
  const joined = await manager.addGuest(created.id, socket, {
    name: 'Attacker',
    viewerToken: 'not-the-real-token',
  });

  assert.equal(joined.guest.role, 'guest');
});

test('promoteGuest upgrades a viewer to co-host and restores default permissions', async () => {
  const redisClient = new MockRedis();
  const manager = createSessionManager({
    clientUrl: 'http://localhost:5173',
    redisClient,
    serverId: 'test-server-1',
  });

  const created = await manager.createSession({ hostName: 'Host' });
  const socket = { readyState: 1, send: () => {} };
  const joined = await manager.addGuest(created.id, socket, {
    name: 'Watcher',
    viewerToken: created.viewerToken,
  });

  const promoted = await manager.promoteGuest(created.id, joined.guest.id);
  assert.ok(promoted);
  assert.equal(promoted.guest.role, 'co-host');
  assert.deepEqual(promoted.guest.permissions, {
    canHighlight: true,
    canAnnotate: true,
    canScroll: true,
    canClick: false,
    canType: false,
    canNavigate: false,
  });
});

test('promoteGuest is a no-op for a guest who is not a viewer', async () => {
  const redisClient = new MockRedis();
  const manager = createSessionManager({
    clientUrl: 'http://localhost:5173',
    redisClient,
    serverId: 'test-server-1',
  });

  const created = await manager.createSession({ hostName: 'Host' });
  const socket = { readyState: 1, send: () => {} };
  const joined = await manager.addGuest(created.id, socket, { name: 'Sam' });

  const promoted = await manager.promoteGuest(created.id, joined.guest.id);
  assert.equal(promoted, null);
});

test('promoteGuest returns null for an unknown guest id', async () => {
  const redisClient = new MockRedis();
  const manager = createSessionManager({
    clientUrl: 'http://localhost:5173',
    redisClient,
    serverId: 'test-server-1',
  });

  const created = await manager.createSession({ hostName: 'Host' });
  const promoted = await manager.promoteGuest(created.id, 'does-not-exist');
  assert.equal(promoted, null);
});

test('publicGuests formats guest array safely', () => {
  const session = {
    guests: [
      {
        id: 'g1',
        name: 'Alice',
        color: '#ff0000',
        permissions: { canClick: true },
        secret: 'hide-me',
      },
    ],
  };
  const publicList = publicGuests(session);
  assert.equal(publicList.length, 1);
  assert.deepEqual(publicList[0], {
    id: 'g1',
    name: 'Alice',
    role: 'guest',
    color: '#ff0000',
    permissions: { canClick: true },
  });
  assert.equal(publicList[0].secret, undefined);
});

test('safeSend sends JSON message only when readyState is 1', () => {
  let sentData = null;
  const openSocket = {
    readyState: 1,
    send(data) {
      sentData = data;
    },
  };

  safeSend(openSocket, { test: 'hello' });
  assert.equal(sentData, '{"test":"hello"}');

  let closedSent = false;
  const closedSocket = {
    readyState: 3,
    send() {
      closedSent = true;
    },
  };
  safeSend(closedSocket, { test: 'world' });
  assert.equal(closedSent, false);
});
