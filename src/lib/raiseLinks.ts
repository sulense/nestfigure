export type RaiseQuery = {
  current?: number;
  annual?: number;
  hourly?: number;
  hoursPerWeek?: number;
  weeksPerYear?: number;
  raisePercent?: number;
  raiseAmount?: number;
  mode?: 'annual' | 'hourly';
  taxRate?: number;
};

/** Build a deep link into the raise calculator with prefilled inputs. */
export function raiseCalculatorUrl(q: RaiseQuery = {}): string {
  const params = new URLSearchParams();
  if (q.mode === 'annual' || q.mode === 'hourly') params.set('mode', q.mode);
  if (q.current != null && Number.isFinite(q.current)) params.set('current', String(q.current));
  if (q.annual != null && Number.isFinite(q.annual)) params.set('annual', String(q.annual));
  if (q.hourly != null && Number.isFinite(q.hourly)) params.set('hourly', String(q.hourly));
  if (q.hoursPerWeek != null && Number.isFinite(q.hoursPerWeek)) {
    params.set('hoursPerWeek', String(q.hoursPerWeek));
  }
  if (q.weeksPerYear != null && Number.isFinite(q.weeksPerYear)) {
    params.set('weeksPerYear', String(q.weeksPerYear));
  }
  if (q.raisePercent != null && Number.isFinite(q.raisePercent)) {
    params.set('raisePercent', String(q.raisePercent));
  }
  if (q.raiseAmount != null && Number.isFinite(q.raiseAmount)) {
    params.set('raiseAmount', String(q.raiseAmount));
  }
  if (q.taxRate != null && Number.isFinite(q.taxRate) && q.taxRate > 0) {
    params.set('taxRate', String(q.taxRate));
  }
  const qs = params.toString();
  return qs ? `/raise-calculator/?${qs}` : '/raise-calculator/';
}
