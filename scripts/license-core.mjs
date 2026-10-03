/* Skyfe device allowlist protocol v1. No runtime npm dependencies. */
import {
  createPrivateKey, createPublicKey, createHash, sign, verify,
} from 'node:crypto';

export const REPOSITORY = 'skyfelongrock/skyfe-licenses';
export const PRODUCT = 'skyfe-boss-timer';
export const DOMAIN = Buffer.from('SKYFE-DEVICE-LIST-V1\n', 'ascii');
export const VALIDITY_SECONDS = 7 * 24 * 60 * 60;
export const MAX_DEVICES = 10000;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
const PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export function fail(code) { throw new Error(code); }
export function sha256(data) { return createHash('sha256').update(data).digest('hex'); }
export function decode64(text, maxLength) {
  if (typeof text !== 'string' || !/^[A-Za-z0-9_-]+$/.test(text)) fail('INVALID_BASE64URL');
  const out = Buffer.from(text, 'base64url');
  if (out.length > maxLength || out.toString('base64url') !== text) fail('INVALID_BASE64URL');
  return out;
}
export function signingKey(seedHex) {
  if (typeof seedHex !== 'string' || !/^[0-9a-fA-F]{64}$/.test(seedHex)) fail('INVALID_SIGNING_SEED');
  return createPrivateKey({key: Buffer.concat([PKCS8_PREFIX, Buffer.from(seedHex, 'hex')]), format: 'der', type: 'pkcs8'});
}
export function publicBytes(key) {
  const der = createPublicKey(key).export({format: 'der', type: 'spki'});
  if (der.length !== 44 || !der.subarray(0, 12).equals(SPKI_PREFIX)) fail('UNEXPECTED_PUBLIC_KEY');
  return der.subarray(12);
}
export function verificationKey(publicBase64) {
  const raw = decode64(publicBase64, 32);
  if (raw.length !== 32) fail('INVALID_PUBLIC_KEY');
  return createPublicKey({key: Buffer.concat([SPKI_PREFIX, raw]), format: 'der', type: 'spki'});
}
export function keyId(publicRaw) { return sha256(publicRaw).slice(0, 32); }

// Full 256-bit device hash. The short display format never truncates the hash.
export function normalizeDevice(input) {
  if (typeof input !== 'string' || input.length > 180) fail('DEVICE_CODE_INVALID');
  let value = input.trim();
  if (/^SKYFE1-/i.test(value)) value = value.slice(7);
  value = value.replace(/[\s-]/g, '');
  if (!/^[a-fA-F0-9]{64}$/.test(value)) fail('DEVICE_CODE_INVALID');
  if (/^0+$/.test(value) || /^f+$/i.test(value)) fail('DEVICE_CODE_INVALID');
  return value.toLowerCase();
}
export function displayDevice(hash) {
  return 'SKYFE1-' + normalizeDevice(hash).toUpperCase().match(/.{8}/g).join('-');
}
export function validVersion(value) {
  return typeof value === 'string' && /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(value) && value.length < 40;
}
export function compareVersions(a, b) {
  if (!validVersion(a) || !validVersion(b)) fail('INVALID_VERSION');
  const av = a.split('.').map(BigInt), bv = b.split('.').map(BigInt);
  for (let i = 0; i < 3; i++) if (av[i] !== bv[i]) return av[i] > bv[i] ? 1 : -1;
  return 0;
}
function safeInteger(value, minimum, code) {
  if (!Number.isSafeInteger(value) || value < minimum) fail(code);
}
export function validateDatabase(db) {
  if (!db || db.schema !== 1 || !Array.isArray(db.devices)) fail('INVALID_DATABASE');
  safeInteger(db.revision, 0, 'INVALID_REVISION');
  if (!validVersion(db.min_app_version)) fail('INVALID_VERSION');
  if (db.devices.length > MAX_DEVICES) fail('DEVICE_LIMIT');
  const devices = db.devices.map(normalizeDevice);
  if (new Set(devices).size !== devices.length) fail('DUPLICATE_DEVICE');
  return {schema: 1, revision: db.revision, min_app_version: db.min_app_version, devices: devices.sort()};
}
export function emptyDatabase() {
  return {schema: 1, revision: 0, min_app_version: '1.1.0', devices: []};
}
export function applyOperation(database, operation, input = '') {
  const db = validateDatabase(database);
  const set = new Set(db.devices);
  let changed = false;
  if (operation === 'add') {
    const hash = normalizeDevice(input);
    changed = !set.has(hash); set.add(hash);
  } else if (operation === 'remove') {
    changed = set.delete(normalizeDevice(input));
  } else if (operation !== 'initialize' && operation !== 'renew') {
    fail('INVALID_OPERATION');
  }
  if (set.size > MAX_DEVICES) fail('DEVICE_LIMIT');
  return {database: {...db, devices: [...set].sort()}, changed};
}

export function createEnvelope(dbInput, seedHex, nowSeconds) {
  const db = validateDatabase(dbInput);
  safeInteger(nowSeconds, 1, 'INVALID_TIME');
  if (db.revision < 1) fail('INVALID_REVISION');
  const privateKey = signingKey(seedHex);
  const rawPublic = publicBytes(privateKey);
  const payload = {
    schema: 1, product: PRODUCT, repository: REPOSITORY,
    revision: db.revision, issued_at: nowSeconds, valid_until: nowSeconds + VALIDITY_SECONDS,
    min_app_version: db.min_app_version, devices: db.devices,
  };
  // Sign these EXACT bytes. Consumers must decode, verify, THEN parse, not reserialize.
  const rawPayload = Buffer.from(JSON.stringify(payload), 'utf8');
  const signature = sign(null, Buffer.concat([DOMAIN, rawPayload]), privateKey);
  return {
    schema: 1, algorithm: 'Ed25519', key_id: keyId(rawPublic),
    payload: rawPayload.toString('base64url'), signature: signature.toString('base64url'),
  };
}
export function verifyEnvelope(envelope, pinnedPublic, options = {}) {
  if (!envelope || envelope.schema !== 1 || envelope.algorithm !== 'Ed25519') fail('INVALID_ENVELOPE');
  const rawPublic = decode64(pinnedPublic, 32);
  if (rawPublic.length !== 32 || envelope.key_id !== keyId(rawPublic)) fail('KEY_ID_MISMATCH');
  const rawPayload = decode64(envelope.payload, MAX_FILE_BYTES);
  const rawSignature = decode64(envelope.signature, 64);
  if (rawSignature.length !== 64 || !verify(null, Buffer.concat([DOMAIN, rawPayload]), verificationKey(pinnedPublic), rawSignature)) {
    fail('SIGNATURE_INVALID');
  }
  let payload;
  try { payload = JSON.parse(rawPayload.toString('utf8')); } catch { fail('INVALID_PAYLOAD_JSON'); }
  if (payload.schema !== 1 || payload.product !== PRODUCT || payload.repository !== REPOSITORY) fail('WRONG_AUDIENCE');
  safeInteger(payload.revision, 1, 'INVALID_REVISION');
  safeInteger(payload.issued_at, 1, 'INVALID_TIME');
  safeInteger(payload.valid_until, 1, 'INVALID_TIME');
  if (payload.valid_until <= payload.issued_at || payload.valid_until - payload.issued_at > VALIDITY_SECONDS) fail('INVALID_VALIDITY');
  validateDatabase({schema: 1, revision: payload.revision, min_app_version: payload.min_app_version, devices: payload.devices});
  // Expired files may be verified by the signer to recover/renew the same state.
  if (options.now !== undefined) {
    if (payload.issued_at > options.now + 300) fail('MANIFEST_FROM_FUTURE');
    if (payload.valid_until <= options.now) fail('MANIFEST_EXPIRED');
  }
  if (options.minimumRevision !== undefined && payload.revision < options.minimumRevision) fail('ROLLBACK_REJECTED');
  if (options.appVersion && compareVersions(options.appVersion, payload.min_app_version) < 0) fail('APP_UPDATE_REQUIRED');
  return payload;
}
export function isDeviceAllowed(payload, device) { return payload.devices.includes(normalizeDevice(device)); }
