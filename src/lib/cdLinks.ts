import type { Compounding } from './cdMath';

export type CdQuery = {
  principal?: number;
  rate?: number;
  /** 'apy' (default) or 'apr' */
  rateType?: 'apy' | 'apr';
  term?: number;
  termUnit?: 'months' | 'years';
  compounding?: Compounding;
  monthlyDeposit?: number;
};

/** Build a deep link into the CD calculator with prefilled inputs. */
export function cdCalculatorUrl(q: CdQuery = {}): string {
  const params = new URLSearchParams();
  if (q.principal != null && Number.isFinite(q.principal)) {
    params.set('principal', String(q.principal));
  }
  if (q.rate != null && Number.isFinite(q.rate)) {
    params.set('rate', String(q.rate));
  }
  if (q.rateType === 'apr' || q.rateType === 'apy') {
    params.set('rateType', q.rateType);
  }
  if (q.term != null && Number.isFinite(q.term)) {
    params.set('term', String(q.term));
  }
  if (q.termUnit === 'months' || q.termUnit === 'years') {
    params.set('termUnit', q.termUnit);
  }
  if (q.compounding) {
    params.set('compounding', q.compounding);
  }
  if (q.monthlyDeposit != null && Number.isFinite(q.monthlyDeposit) && q.monthlyDeposit > 0) {
    params.set('monthlyDeposit', String(q.monthlyDeposit));
  }
  const qs = params.toString();
  return qs ? `/cd-calculator/?${qs}` : '/cd-calculator/';
}
