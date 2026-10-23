'use strict';
const { randomBytes, createHash, timingSafeEqual } = require('node:crypto');
const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 30 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function normalizeParentEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}
function issueVerificationToken(now = Date.now()) {
  if (!Number.isSafeInteger(now) || now < 0) throw new TypeError('Invalid time');
  const token = randomBytes(TOKEN_BYTES).toString('hex');
  return { token, tokenHash: hashToken(token), expiresAt: new Date(now + TOKEN_TTL_MS).toISOString() };
}
function hashToken(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new TypeError('Invalid token');
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
function verifyToken(token, storedHash, expiresAt, now = Date.now()) {
  if (typeof storedHash !== 'string' || !/^[a-f0-9]{64}$/.test(storedHash)) return false;
  if (!Number.isFinite(now) || !Number.isFinite(Date.parse(expiresAt))) return false;
  if (Date.parse(expiresAt) <= now) return false;
  let candidate;
  try { candidate = Buffer.from(hashToken(token), 'hex'); } catch { return false; }
  return timingSafeEqual(candidate, Buffer.from(storedHash, 'hex'));
}
function eligibleParentRecipient(student) {
  if (!student || !student.parent_email_verified_at) return null;
  return normalizeParentEmail(student.parent_email);
}
module.exports = { TOKEN_TTL_MS, normalizeParentEmail, issueVerificationToken, hashToken, verifyToken, eligibleParentRecipient };
