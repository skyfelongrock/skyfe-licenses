import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PRODUCT, REPOSITORY, VALIDITY_SECONDS, signingKey, publicBytes, normalizeDevice, displayDevice,
  emptyDatabase, validateDatabase, applyOperation, createEnvelope, verifyEnvelope, isDeviceAllowed,
  compareVersions, decode64,
} from './license-core.mjs';

// PUBLIC deterministic test vector only. NEVER use this seed as SKYFE_SIGNING_SEED.
const TEST_SEED = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
const PUB = publicBytes(signingKey(TEST_SEED)).toString('base64url');
const H1 = '1234567890abcdef'.repeat(4), H2 = 'abcdef0123456789'.repeat(4);
const NOW = 1791028800;
const database = () => ({schema: 1, revision: 1, min_app_version: '1.1.0', devices: [H1]});
const envelope = () => createEnvelope(database(), TEST_SEED, NOW);
const throwsCode = (fn, text) => assert.throws(fn, new RegExp(text));

test('Full formatted Device Code round-trips without truncation', () => {
  assert.equal(normalizeDevice(displayDevice(H1)), H1);
  assert.equal(normalizeDevice('  '+displayDevice(H1).toLowerCase()+'  '), H1);
});
test('Malformed, short and placeholder IDs are rejected', () => {
  for (const value of ['', 'A'.repeat(16), 'g'.repeat(64), '0'.repeat(64), 'f'.repeat(64), 'X'.repeat(1000), '; touch /tmp/x']) {
    throwsCode(() => normalizeDevice(value), 'DEVICE_CODE_INVALID');
  }
});
test('Only the v1 prefix is accepted', () => throwsCode(() => normalizeDevice('SKYFE2-'+H1), 'DEVICE_CODE_INVALID'));
test('Add stores a normalized device', () => {
  const res = applyOperation(emptyDatabase(), 'add', displayDevice(H1));
  assert.deepEqual(res.database.devices, [H1]); assert.equal(res.changed, true);
});
test('Duplicate add is idempotent', () => {
  const res = applyOperation(database(), 'add', displayDevice(H1));
  assert.equal(res.changed, false); assert.equal(res.database.devices.length, 1);
});
test('Remove revokes the requested device', () => {
  const res = applyOperation(database(), 'remove', H1);
  assert.equal(res.changed, true); assert.deepEqual(res.database.devices, []);
});
test('Removing absent device preserves the rest', () => {
  const res = applyOperation(database(), 'remove', H2);
  assert.equal(res.changed, false); assert.deepEqual(res.database.devices, [H1]);
});
test('Renew never clears devices', () => assert.deepEqual(applyOperation(database(), 'renew').database.devices, [H1]));
test('Database duplicate and invalid revision rejected', () => {
  throwsCode(() => validateDatabase({...database(), devices: [H1, H1]}), 'DUPLICATE');
  throwsCode(() => validateDatabase({...database(), revision: -1}), 'INVALID_REVISION');
});
test('Ed25519 signature accepted with pinned public key', () => {
  const result = verifyEnvelope(envelope(), PUB, {now: NOW, appVersion: '1.1.0'});
  assert.equal(result.product, PRODUCT); assert.equal(result.repository, REPOSITORY);
  assert.equal(isDeviceAllowed(result, H1), true); assert.equal(isDeviceAllowed(result, H2), false);
});
test('Changing payload bytes breaks the signature', () => {
  const env = envelope();
  const p = JSON.parse(Buffer.from(env.payload, 'base64url')); p.devices.push(H2);
  env.payload = Buffer.from(JSON.stringify(p)).toString('base64url');
  throwsCode(() => verifyEnvelope(env, PUB), 'SIGNATURE_INVALID');
});
test('Changing a signature byte rejected', () => {
  const env = envelope(); const s = Buffer.from(env.signature, 'base64url'); s[0] ^= 1;
  env.signature = s.toString('base64url'); throwsCode(() => verifyEnvelope(env, PUB), 'SIGNATURE_INVALID');
});
test('A different signing key is not trusted', () => {
  const otherPub = publicBytes(signingKey('10'.repeat(32))).toString('base64url');
  throwsCode(() => verifyEnvelope(envelope(), otherPub), 'KEY_ID_MISMATCH');
});
test('Wrong algorithm is rejected', () => throwsCode(() => verifyEnvelope({...envelope(), algorithm:'none'}, PUB), 'INVALID_ENVELOPE'));
test('Manifest freshness and expiry enforced', () => {
  throwsCode(() => verifyEnvelope(envelope(), PUB, {now: NOW+VALIDITY_SECONDS}), 'MANIFEST_EXPIRED');
  throwsCode(() => verifyEnvelope(envelope(), PUB, {now: NOW-301}), 'MANIFEST_FROM_FUTURE');
  assert.ok(verifyEnvelope(envelope(), PUB, {now: NOW+VALIDITY_SECONDS-1}));
});
test('Signer can verify and renew an expired manifest', () => assert.ok(verifyEnvelope(envelope(), PUB)));
test('Observed revisions cannot be rolled backwards', () => throwsCode(() => verifyEnvelope(envelope(), PUB, {minimumRevision:2}), 'ROLLBACK_REJECTED'));
test('Semver comparison is numeric, not lexicographic', () => {
  assert.equal(compareVersions('1.10.0','1.9.0'),1);
  assert.equal(compareVersions('2.0.0','1.99.99'),1);
  assert.equal(compareVersions('1.1.0','1.1.0'),0);
});
test('Minimum app version enforced', () => throwsCode(() => verifyEnvelope(envelope(), PUB, {appVersion:'1.0.0'}), 'APP_UPDATE_REQUIRED'));
test('Noncanonical base64 and oversized values rejected', () => {
  throwsCode(() => decode64('YQ==', 32), 'INVALID_BASE64URL');
  throwsCode(() => decode64('!', 32), 'INVALID_BASE64URL');
  throwsCode(() => decode64(Buffer.alloc(65).toString('base64url'),64), 'INVALID_BASE64URL');
});
test('Wrong repository/product signed by the correct key is rejected', () => {
  // These values cannot be created by createEnvelope, so exercise a signed foreign payload.
  return import('node:crypto').then(({sign}) => import('./license-core.mjs').then(({DOMAIN}) => {
    const env = envelope(); const p = JSON.parse(Buffer.from(env.payload,'base64url'));
    p.repository = 'other/repo'; const bytes = Buffer.from(JSON.stringify(p));
    env.payload=bytes.toString('base64url'); env.signature=sign(null,Buffer.concat([DOMAIN,bytes]),signingKey(TEST_SEED)).toString('base64url');
    throwsCode(()=>verifyEnvelope(env,PUB),'WRONG_AUDIENCE');
  }));
});
test('Workflow has no public PR/issue trigger and pins checkout', () => {
  const yaml = fs.readFileSync(new URL('../.github/workflows/skyfe-license.yml', import.meta.url), 'utf8');
  assert.ok(yaml.includes('workflow_dispatch:'));
  assert.ok(!yaml.includes('pull_request:') && !yaml.includes('pull_request_target:') && !yaml.includes('issue_comment:'));
  assert.ok(yaml.includes('actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683'));
  assert.ok(yaml.includes('cancel-in-progress: false'));
});
test('Secret-bearing manager does not git-add the whole workspace or use shell eval', () => {
  const text = fs.readFileSync(new URL('./license-admin.mjs',import.meta.url), 'utf8');
  assert.ok(text.includes("['add', '--', ...files]"));
  assert.ok(!text.includes('shell: true'));
  assert.ok(text.includes('input: seed'));
  assert.ok(!text.includes('console.log(seed)'));
  assert.ok(text.includes('SIGNING_KEY_MISMATCH_NO_ROTATION'));
});
