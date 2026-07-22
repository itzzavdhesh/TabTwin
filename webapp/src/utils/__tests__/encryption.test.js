import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateHostKeyPair,
  exportPublicKeyToJWK,
  importPublicKeyFromJWK,
  encodeJWKToBase64,
  decodeBase64ToJWK,
  deriveSharedSecret,
  deriveAESKey,
  generateIV,
  encryptMessage,
  decryptMessage,
  wrapEncryptedMessage,
  unwrapEncryptedMessage,
  isEncryptionEnabled,
  shouldEncryptEvent
} from '../encryption.js';

describe('Encryption Module', () => {
  let hostKeyPair;
  let joinerKeyPair;
  let sharedSecret;
  let aesKey;

  beforeEach(async () => {
    hostKeyPair = await generateHostKeyPair();
    joinerKeyPair = await generateHostKeyPair();
  });

  describe('Key Generation', () => {
    it('should generate a valid ECDH key pair', async () => {
      expect(hostKeyPair).toBeDefined();
      expect(hostKeyPair.publicKey).toBeDefined();
      expect(hostKeyPair.privateKey).toBeDefined();
    });

    it('should export and import public key to/from JWK format', async () => {
      const jwkString = await exportPublicKeyToJWK(hostKeyPair.publicKey);
      expect(typeof jwkString).toBe('string');

      const importedKey = await importPublicKeyFromJWK(jwkString);
      expect(importedKey).toBeDefined();
    });

    it('should encode and decode JWK to/from base64', async () => {
      const jwkString = await exportPublicKeyToJWK(hostKeyPair.publicKey);
      const base64 = encodeJWKToBase64(jwkString);
      expect(typeof base64).toBe('string');

      const decoded = decodeBase64ToJWK(base64);
      expect(decoded).toBe(jwkString);
    });
  });

  describe('Shared Secret Derivation', () => {
    it('should derive a shared secret from two key pairs', async () => {
      const secret1 = await deriveSharedSecret(hostKeyPair.publicKey, joinerKeyPair.privateKey);
      expect(secret1).toBeInstanceOf(ArrayBuffer);
      expect(secret1.byteLength).toBe(32); // 256 bits
    });

    it('should produce the same shared secret on both sides', async () => {
      const secret1 = await deriveSharedSecret(hostKeyPair.publicKey, joinerKeyPair.privateKey);
      const secret2 = await deriveSharedSecret(joinerKeyPair.publicKey, hostKeyPair.privateKey);

      expect(new Uint8Array(secret1)).toEqual(new Uint8Array(secret2));
    });

    it('should derive an AES key from shared secret', async () => {
      const secret = await deriveSharedSecret(hostKeyPair.publicKey, joinerKeyPair.privateKey);
      const key = await deriveAESKey(secret);
      expect(key).toBeDefined();
      expect(key.type).toBe('secret');
    });
  });

  describe('IV Generation', () => {
    it('should generate a random IV of correct length', () => {
      const iv = generateIV();
      expect(iv).toBeInstanceOf(Uint8Array);
      expect(iv.length).toBe(12); // 96 bits for GCM
    });

    it('should generate different IVs each time', () => {
      const iv1 = generateIV();
      const iv2 = generateIV();
      expect(iv1).not.toEqual(iv2);
    });
  });

  describe('Message Encryption and Decryption', () => {
    beforeEach(async () => {
      const secret = await deriveSharedSecret(hostKeyPair.publicKey, joinerKeyPair.privateKey);
      aesKey = await deriveAESKey(secret);
    });

    it('should encrypt a message', async () => {
      const message = { event: 'test', data: 'hello' };
      const encrypted = await encryptMessage(message, aesKey);

      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('ciphertext');
      expect(typeof encrypted.iv).toBe('string');
      expect(typeof encrypted.ciphertext).toBe('string');
    });

    it('should decrypt an encrypted message', async () => {
      const message = { event: 'test', data: 'hello' };
      const encrypted = await encryptMessage(message, aesKey);
      const decrypted = await decryptMessage(encrypted, aesKey);

      expect(decrypted).toEqual(message);
    });

    it('should handle complex message structures', async () => {
      const message = {
        event: 'cursor:move',
        payload: { x: 100, y: 200, timestamp: Date.now() }
      };
      const encrypted = await encryptMessage(message, aesKey);
      const decrypted = await decryptMessage(encrypted, aesKey);

      expect(decrypted).toEqual(message);
    });

    it('should fail decryption with wrong key', async () => {
      const message = { event: 'test', data: 'secret' };
      const encrypted = await encryptMessage(message, aesKey);

      const wrongSecret = await deriveSharedSecret(
        joinerKeyPair.publicKey,
        joinerKeyPair.privateKey
      );
      const wrongKey = await deriveAESKey(wrongSecret);

      await expect(decryptMessage(encrypted, wrongKey)).rejects.toThrow();
    });

    it('should fail decryption with invalid IV', async () => {
      const message = { event: 'test', data: 'secret' };
      const encrypted = await encryptMessage(message, aesKey);

      encrypted.iv = encodeURIComponent(Buffer.alloc(12).toString('base64'));

      await expect(decryptMessage(encrypted, aesKey)).rejects.toThrow();
    });
  });

  describe('Message Wrapping and Unwrapping', () => {
    beforeEach(async () => {
      const secret = await deriveSharedSecret(hostKeyPair.publicKey, joinerKeyPair.privateKey);
      aesKey = await deriveAESKey(secret);
    });

    it('should wrap a message with encryption metadata', async () => {
      const message = { event: 'cursor:move', payload: { x: 100, y: 200 } };
      const wrapped = await wrapEncryptedMessage(message, aesKey);

      expect(wrapped).toHaveProperty('type', 'encrypted');
      expect(wrapped).toHaveProperty('iv');
      expect(wrapped).toHaveProperty('ciphertext');
    });

    it('should unwrap an encrypted message', async () => {
      const message = { event: 'cursor:move', payload: { x: 100, y: 200 } };
      const wrapped = await wrapEncryptedMessage(message, aesKey);
      const unwrapped = await unwrapEncryptedMessage(wrapped, aesKey);

      expect(unwrapped).toEqual(message);
    });

    it('should pass through non-encrypted messages', async () => {
      const message = { event: 'session:joined', payload: { guest: 'user' } };
      const result = await unwrapEncryptedMessage(message, aesKey);

      expect(result).toEqual(message);
    });
  });

  describe('Event Encryption Policy', () => {
    it('should encrypt data events', () => {
      expect(shouldEncryptEvent('cursor:move')).toBe(true);
      expect(shouldEncryptEvent('action:request')).toBe(true);
      expect(shouldEncryptEvent('crdt:update')).toBe(true);
    });

    it('should not encrypt session signaling events', () => {
      expect(shouldEncryptEvent('session:join')).toBe(false);
      expect(shouldEncryptEvent('session:joined')).toBe(false);
      expect(shouldEncryptEvent('control:revoke')).toBe(false);
      expect(shouldEncryptEvent('webrtc:offer')).toBe(false);
      expect(shouldEncryptEvent('webrtc:answer')).toBe(false);
      expect(shouldEncryptEvent('webrtc:candidate')).toBe(false);
      expect(shouldEncryptEvent('error')).toBe(false);
    });

    it('should report encryption enabled status', () => {
      expect(isEncryptionEnabled()).toBe(true);
    });
  });

  describe('Round-trip Encryption', () => {
    beforeEach(async () => {
      const secret = await deriveSharedSecret(hostKeyPair.publicKey, joinerKeyPair.privateKey);
      aesKey = await deriveAESKey(secret);
    });

    it('should handle multiple sequential encryptions', async () => {
      const messages = [
        { event: 'cursor:move', payload: { x: 10, y: 20 } },
        { event: 'cursor:move', payload: { x: 30, y: 40 } },
        { event: 'cursor:move', payload: { x: 50, y: 60 } }
      ];

      for (const msg of messages) {
        const wrapped = await wrapEncryptedMessage(msg, aesKey);
        const unwrapped = await unwrapEncryptedMessage(wrapped, aesKey);
        expect(unwrapped).toEqual(msg);
      }
    });

    it('should produce unique ciphertexts for same plaintext', async () => {
      const message = { event: 'test', data: 'same' };

      const encrypted1 = await encryptMessage(message, aesKey);
      const encrypted2 = await encryptMessage(message, aesKey);

      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    });
  });
});
