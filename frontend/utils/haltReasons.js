/**
 * Computes contextual dynamic reason for a train running at 0 km/h.
 */
export function getZeroSpeedHaltReason({ speed = 0, isHalt = false, stationName = '', stationCode = '' } = {}) {
  const numSpeed = Number(speed) || 0;
  if (numSpeed > 0) return null;

  const name = String(stationName || '').toLowerCase();
  const code = String(stationCode || '').toLowerCase();
  const isJunction = name.includes('junction') || name.includes(' jn') || name.endsWith(' jn') || code.endsWith('jn');

  if (isJunction) {
    return 'Junction Platform Clearance Queuing';
  }
  if (isHalt) {
    return 'Scheduled Station Halt (Boarding/Dwell Time)';
  }
  return 'Waiting for Signal Clearance / Train Precedence';
}
