/**
 * Web Push encryption and VAPID signing using Web Crypto API.
 * No external dependencies required.
 */

/** Helper to get a proper ArrayBuffer from Uint8Array (avoids SharedArrayBuffer TS issues) */
function toBuffer(arr: Uint8Array): ArrayBuffer {
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concatUint8(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
) {
  const clientPublicKey = base64UrlDecode(p256dhKey);
  const clientAuth = base64UrlDecode(authSecret);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey.buffer as ArrayBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientKey },
      localKeyPair.privateKey,
      256
    )
  );

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive encryption key material
  const encoder = new TextEncoder();

  // auth_info = "WebPush: info\0" + clientPublicKey + localPublicKey
  const authInfo = concatUint8(
    encoder.encode("WebPush: info\0"),
    clientPublicKey,
    localPublicKeyRaw
  );

  // PRK = HKDF-Extract(clientAuth, sharedSecret)
  const authHkdfKey = await crypto.subtle.importKey(
    "raw",
    toBuffer(sharedSecret),
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: toBuffer(clientAuth), info: toBuffer(authInfo) },
      authHkdfKey,
      256
    )
  );

  const ikmKey = await crypto.subtle.importKey(
    "raw",
    toBuffer(ikm),
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  // Content encryption key
  const cekInfo = encoder.encode("Content-Encoding: aes128gcm\0");
  const cekBits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: toBuffer(salt), info: toBuffer(cekInfo) },
      ikmKey,
      128
    )
  );

  // Nonce
  const nonceInfo = encoder.encode("Content-Encoding: nonce\0");
  const nonceBits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: toBuffer(salt), info: toBuffer(nonceInfo) },
      ikmKey,
      96
    )
  );

  // Encrypt the payload
  const payloadBytes = encoder.encode(payload);
  // Add padding delimiter
  const paddedPayload = concatUint8(payloadBytes, new Uint8Array([2]));

  const contentKey = await crypto.subtle.importKey(
    "raw",
    toBuffer(cekBits),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toBuffer(nonceBits) },
      contentKey,
      toBuffer(paddedPayload)
    )
  );

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rsBuf = new ArrayBuffer(4);
  new DataView(rsBuf).setUint32(0, 4096);
  const rs = new Uint8Array(rsBuf);
  const idLen = new Uint8Array([65]);

  const cipherText = concatUint8(salt, rs, idLen, localPublicKeyRaw, encrypted);

  return { cipherText, salt, localPublicKey: localPublicKeyRaw };
}

export async function buildVapidHeaders(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<Record<string, string>> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const now = Math.floor(Date.now() / 1000);
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: "mailto:notifications@lockin.app",
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import VAPID private key
  const privateKeyBytes = base64UrlDecode(vapidPrivateKey);
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: base64UrlEncode(privateKeyBytes),
    x: base64UrlEncode(base64UrlDecode(vapidPublicKey).slice(1, 33)),
    y: base64UrlEncode(base64UrlDecode(vapidPublicKey).slice(33, 65)),
  };

  const signingKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      signingKey,
      new TextEncoder().encode(unsignedToken)
    )
  );

  const token = `${unsignedToken}.${base64UrlEncode(signature)}`;

  return {
    Authorization: `vapid t=${token}, k=${vapidPublicKey}`,
  };
}
