// End-to-End Encryption utility module using Web Crypto API
// Implements ECDH key exchange and AES-GCM encryption

const ENCRYPTION_ENABLED = true;
const IV_LENGTH = 12; // GCM IV is typically 96 bits
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

// Generate ECDH key pair for the session host
export async function generateHostKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    false, // extractable: false for security
    ['deriveKey', 'deriveBits']
  );

  return keyPair;
}

// Export public key to JWK format for URL embedding
export async function exportPublicKeyToJWK(publicKey) {
  const jwk = await crypto.subtle.exportKey('jwk', publicKey);
  return JSON.stringify(jwk);
}

// Import public key from JWK format
export async function importPublicKeyFromJWK(jwkString) {
  const jwk = JSON.parse(jwkString);
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    false,
    []
  );
}

// Encode JWK to URL-safe base64
export function encodeJWKToBase64(jwkString) {
  return btoa(jwkString);
}

// Decode URL-safe base64 to JWK
export function decodeBase64ToJWK(base64String) {
  return atob(base64String);
}

// Derive shared secret from host public key and joiner private key
export async function deriveSharedSecret(hostPublicKey, joinerPrivateKey) {
  return await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: hostPublicKey
    },
    joinerPrivateKey,
    KEY_LENGTH
  );
}

// Derive AES-GCM key from shared secret
export async function deriveAESKey(sharedSecret) {
  return await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    'AES-GCM',
    false,
    ['encrypt', 'decrypt']
  );
}

// Generate random IV for encryption
export function generateIV() {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

// Encrypt message with AES-GCM
export async function encryptMessage(message, aesKey) {
  const iv = generateIV();
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(message));

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv
    },
    aesKey,
    data
  );

  return {
    iv: btoa(String.fromCharCode(...new Uint8Array(iv))),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  };
}

// Decrypt message with AES-GCM
export async function decryptMessage(encryptedMessage, aesKey) {
  const iv = Uint8Array.from(atob(encryptedMessage.iv), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(encryptedMessage.ciphertext), c => c.charCodeAt(0));

  const plaintext = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv
    },
    aesKey,
    ciphertext
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(plaintext));
}

// Wrap a message for transport with encryption metadata
export async function wrapEncryptedMessage(message, aesKey) {
  if (!ENCRYPTION_ENABLED) {
    return message;
  }

  const encrypted = await encryptMessage(message, aesKey);
  return {
    type: 'encrypted',
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext
  };
}

// Unwrap an encrypted message
export async function unwrapEncryptedMessage(wrappedMessage, aesKey) {
  if (!ENCRYPTION_ENABLED || wrappedMessage.type !== 'encrypted') {
    return wrappedMessage;
  }

  return await decryptMessage(
    {
      iv: wrappedMessage.iv,
      ciphertext: wrappedMessage.ciphertext
    },
    aesKey
  );
}

// Check if encryption is enabled
export function isEncryptionEnabled() {
  return ENCRYPTION_ENABLED;
}

// List of events that should NOT be encrypted (session signaling)
const UNENCRYPTED_EVENTS = [
  'session:join',
  'session:joined',
  'control:revoke',
  'webrtc:offer',
  'webrtc:answer',
  'webrtc:candidate',
  'error'
];

// Check if an event should be encrypted
export function shouldEncryptEvent(eventType) {
  if (!ENCRYPTION_ENABLED) {
    return false;
  }
  return !UNENCRYPTED_EVENTS.includes(eventType);
}
