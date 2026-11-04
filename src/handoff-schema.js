export const HANDOFF_TTL_SECONDS = 300;
export const MAX_IMAGE_DATA_URL_CHARS = 280 * 1024;
export const MAX_REQUEST_BYTES = MAX_IMAGE_DATA_URL_CHARS + 512;

const allowedKeys = new Set([
  'version',
  'portraitDataUrl',
  'gender',
  'totalKcal',
  'groupsCount'
]);

export function validateHandoffPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'Invalid handoff payload' };
  }

  if (Object.keys(value).some(key => !allowedKeys.has(key))) {
    return { ok: false, error: 'Unexpected handoff field' };
  }

  const { version, portraitDataUrl, gender, totalKcal, groupsCount } = value;
  if (version !== 1) return { ok: false, error: 'Unsupported handoff version' };
  if (gender !== 'boy' && gender !== 'girl') return { ok: false, error: 'Invalid character gender' };
  if (!Number.isInteger(totalKcal) || totalKcal < 0 || totalKcal > 25_000) {
    return { ok: false, error: 'Invalid energy result' };
  }
  if (!Number.isInteger(groupsCount) || groupsCount < 0 || groupsCount > 5) {
    return { ok: false, error: 'Invalid food group result' };
  }
  if (typeof portraitDataUrl !== 'string'
    || portraitDataUrl.length > MAX_IMAGE_DATA_URL_CHARS
    || !/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(portraitDataUrl)) {
    return { ok: false, error: 'Invalid character portrait' };
  }

  return {
    ok: true,
    value: { version, portraitDataUrl, gender, totalKcal, groupsCount }
  };
}
