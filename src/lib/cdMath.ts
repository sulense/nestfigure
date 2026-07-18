/** Certificate of deposit compound interest math */

export type Compounding =
  | 'daily'
  | 'monthly'
  | 'quarterly'
  | 'semiannually'
  | 'annually'
  | 'continuous';

export const COMPOUNDING_OPTIONS: { value: Compounding; label: string; n: number | null }[] = [
  { value: 'daily', label: 'Daily', n: 365 },
  { value: 'monthly', label: 'Monthly', n: 12 },
  { value: 'quarterly', label: 'Quarterly', n: 4 },
  { value: 'semiannually', label: 'Semi-annually', n: 2 },
  { value: 'annually', label: 'Annually', n: 1 },
  { value: 'continuous', label: 'Continuous', n: null },
];

export interface CdInputs {
  principal: number;
  /** Annual percentage yield or nominal rate as percent, e.g. 4.5 */
  ratePercent: number;
  /** Rate is APY (true) or nominal APR (false) */
  rateIsApy: boolean;
  termMonths: number;
  compounding: Compounding;
  /** Optional monthly deposit added at end of each month */
  monthlyDeposit: number;
}

export interface CdPeriodRow {
  period: number;
  label: string;
  deposit: number;
  interest: number;
  balance: number;
}

export interface CdResult {
  finalBalance: number;
  totalInterest: number;
  totalDeposits: number;
  effectiveApy: number;
  rows: CdPeriodRow[];
}

function periodsPerYear(c: Compounding): number | null {
  const found = COMPOUNDING_OPTIONS.find((o) => o.value === c);
  return found?.n ?? null;
}

/**
 * Convert APY (%) to nominal annual rate for given compounding,
 * or return nominal as-is.
 */
export function nominalRateFromInput(
  ratePercent: number,
  rateIsApy: boolean,
  compounding: Compounding,
): number {
  const r = ratePercent / 100;
  if (!rateIsApy) return r;
  if (compounding === 'continuous') {
    // APY = e^r - 1  =>  r = ln(1+APY)
    return Math.log(1 + r);
  }
  const n = periodsPerYear(compounding) ?? 12;
  // APY = (1 + r/n)^n - 1  =>  r = n * ((1+APY)^(1/n) - 1)
  return n * (Math.pow(1 + r, 1 / n) - 1);
}

export function calculateCd(input: CdInputs): CdResult {
  const principal = Math.max(0, input.principal || 0);
  const termMonths = Math.max(0, input.termMonths || 0);
  const monthlyDeposit = Math.max(0, input.monthlyDeposit || 0);
  const years = termMonths / 12;
  const nominal = nominalRateFromInput(input.ratePercent, input.rateIsApy, input.compounding);

  if (termMonths === 0 || (principal === 0 && monthlyDeposit === 0)) {
    return {
      finalBalance: principal,
      totalInterest: 0,
      totalDeposits: principal,
      effectiveApy: input.rateIsApy ? input.ratePercent / 100 : 0,
      rows: [],
    };
  }

  // Month-step simulation for deposits + readable schedule
  let balance = principal;
  let totalDeposits = principal;
  const rows: CdPeriodRow[] = [];
  const monthlyRate = monthlyGrowthFactor(nominal, input.compounding);

  for (let m = 1; m <= Math.ceil(termMonths); m++) {
    const fraction = m > termMonths ? termMonths - (m - 1) : 1;
    const before = balance;
    // Compound for this month (or partial)
    if (input.compounding === 'continuous') {
      balance = balance * Math.exp(nominal * (fraction / 12));
    } else {
      // Approximate monthly growth from annual nominal & compounding frequency
      balance = balance * Math.pow(1 + monthlyRate, fraction);
    }
    const interest = balance - before;

    let deposit = 0;
    if (monthlyDeposit > 0 && m <= termMonths) {
      // deposits at end of each full month within term
      if (fraction === 1 || m < Math.ceil(termMonths)) {
        deposit = monthlyDeposit * (fraction === 1 ? 1 : 0);
        // only full months get deposit for simplicity
        if (fraction === 1) {
          balance += monthlyDeposit;
          totalDeposits += monthlyDeposit;
          deposit = monthlyDeposit;
        }
      }
    }

    rows.push({
      period: m,
      label: `Month ${m}`,
      deposit,
      interest,
      balance,
    });

    if (m >= termMonths) break;
  }

  // Pure closed form when no monthly deposits (more precise)
  if (monthlyDeposit === 0) {
    let finalBalance: number;
    if (input.compounding === 'continuous') {
      finalBalance = principal * Math.exp(nominal * years);
    } else {
      const n = periodsPerYear(input.compounding) ?? 12;
      finalBalance = principal * Math.pow(1 + nominal / n, n * years);
    }
    const totalInterest = finalBalance - principal;

    // rebuild yearly summary rows for display if term long
    const displayRows = buildSummaryRows(principal, finalBalance, termMonths, nominal, input.compounding);

    const effectiveApy =
      years > 0 ? Math.pow(finalBalance / principal, 1 / years) - 1 : 0;

    return {
      finalBalance,
      totalInterest,
      totalDeposits: principal,
      effectiveApy,
      rows: displayRows,
    };
  }

  const finalBalance = balance;
  const totalInterest = finalBalance - totalDeposits;
  const effectiveApy =
    years > 0 && principal > 0
      ? Math.pow(finalBalance / Math.max(totalDeposits, 1), 1 / years) - 1
      : 0;

  return {
    finalBalance,
    totalInterest,
    totalDeposits,
    effectiveApy: Math.max(0, effectiveApy),
    rows: summarizeMonthlyRows(rows),
  };
}

function monthlyGrowthFactor(nominal: number, compounding: Compounding): number {
  if (compounding === 'continuous') return Math.exp(nominal / 12) - 1;
  const n = periodsPerYear(compounding) ?? 12;
  // effective growth per month
  return Math.pow(1 + nominal / n, n / 12) - 1;
}

function buildSummaryRows(
  principal: number,
  finalBalance: number,
  termMonths: number,
  nominal: number,
  compounding: Compounding,
): CdPeriodRow[] {
  const rows: CdPeriodRow[] = [];
  const steps = termMonths <= 24 ? termMonths : Math.min(termMonths, 12);
  // show each month if <= 24, else ~12 evenly spaced points
  if (termMonths <= 24) {
    for (let m = 1; m <= termMonths; m++) {
      const y = m / 12;
      const bal = compoundAmount(principal, nominal, compounding, y);
      const prev = m === 1 ? principal : compoundAmount(principal, nominal, compounding, (m - 1) / 12);
      rows.push({
        period: m,
        label: `Month ${m}`,
        deposit: 0,
        interest: bal - prev,
        balance: bal,
      });
    }
  } else {
    const yearCount = Math.ceil(termMonths / 12);
    for (let y = 1; y <= yearCount; y++) {
      const months = Math.min(y * 12, termMonths);
      const t = months / 12;
      const bal = compoundAmount(principal, nominal, compounding, t);
      const prevT = (months - 12) / 12;
      const prev = y === 1 ? principal : compoundAmount(principal, nominal, compounding, Math.max(0, prevT));
      rows.push({
        period: y,
        label: `Year ${y}`,
        deposit: 0,
        interest: bal - prev,
        balance: bal,
      });
    }
  }
  // ensure last row matches final
  if (rows.length) {
    rows[rows.length - 1].balance = finalBalance;
  }
  return rows;
}

function compoundAmount(
  principal: number,
  nominal: number,
  compounding: Compounding,
  years: number,
): number {
  if (years <= 0) return principal;
  if (compounding === 'continuous') {
    return principal * Math.exp(nominal * years);
  }
  const n = periodsPerYear(compounding) ?? 12;
  return principal * Math.pow(1 + nominal / n, n * years);
}

function summarizeMonthlyRows(rows: CdPeriodRow[]): CdPeriodRow[] {
  if (rows.length <= 24) return rows;
  // yearly rollup
  const byYear = new Map<number, CdPeriodRow>();
  for (const r of rows) {
    const year = Math.ceil(r.period / 12);
    const existing = byYear.get(year);
    if (!existing) {
      byYear.set(year, {
        period: year,
        label: `Year ${year}`,
        deposit: r.deposit,
        interest: r.interest,
        balance: r.balance,
      });
    } else {
      existing.deposit += r.deposit;
      existing.interest += r.interest;
      existing.balance = r.balance;
    }
  }
  return [...byYear.values()];
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n || 0);
}

export function formatPercent(n: number): string {
  return `${((n || 0) * 100).toFixed(2)}%`;
}
