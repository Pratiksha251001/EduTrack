'use strict';
const { normalizeParentEmail } = require('./parent-email-verification.cjs');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS = new Set(['daily_attendance', 'low_attendance']);
function prepareParentNotice({student, kind, date, attendanceRate, totalSessions}) {
  if (!student || typeof student.id !== 'string' || !UUID.test(student.id)) return {ok:false, reason:'invalid_student'};
  if (!KINDS.has(kind) || typeof date !== 'string' || !DATE.test(date) ||
      Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
      new Date(`${date}T00:00:00Z`).toISOString().slice(0,10) !== date) return {ok:false,reason:'invalid_notice'};
  const email = normalizeParentEmail(student.parent_email);
  if (!email || !student.parent_email_verified_at ||
      !Number.isFinite(Date.parse(student.parent_email_verified_at))) return {ok:false,reason:'unverified_parent'};
  if (kind === 'low_attendance') {
    if (!Number.isSafeInteger(totalSessions) || totalSessions <= 0 ||
        typeof attendanceRate !== 'number' || !Number.isFinite(attendanceRate) ||
        attendanceRate < 0 || attendanceRate >= 75) return {ok:false,reason:'not_eligible'};
  }
  const key = `${student.id}:${kind}:${date}`;
  return {ok:true,recipient:email,key,kind,date};
}
function classifyProviderResult({httpOk, simulated=false, providerAccepted=false}) {
  if (simulated) return 'simulated';
  if (!httpOk || !providerAccepted) return 'failed';
  return 'provider_accepted';
}
module.exports = {prepareParentNotice,classifyProviderResult};
