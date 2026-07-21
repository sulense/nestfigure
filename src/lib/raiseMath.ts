/**
 * Raise / salary-increase math — pure arithmetic only.
 * Educational estimates; not payroll, tax advice, or employer policy.
 */

export type PayInputMode = 'annual' | 'hourly';
export type PayFrequency = 'annual' | 'monthly' | 'biweekly' | 'weekly' | 'hourly';

export interface RaiseInputs {
  /** How current pay is entered */
  inputMode: PayInputMode;
  /** Annual salary when inputMode is annual */
  annualSalary: number;
  /** Hourly rate when inputMode is hourly */
  hourlyRate: number;
  hoursPerWeek: number;
  weeksPerYear: number;
  /** Raise percent, e.g. 5 for 5% */
  raisePercent: number;
  /** Optional user-entered effective tax rate % for a rough net view (0–100) */
  optionalTaxRatePercent: number;
}

export interface RaiseResult {
  currentAnnual: number;
  raiseAmountAnnual: number;
  raisePercent: number;
  newAnnual: number;
  currentMonthly: number;
  newMonthly: number;
  currentBiweekly: number;
  newBiweekly: number;
  currentWeekly: number;
  newWeekly: number;
  currentHourly: number;
  newHourly: number;
  /** Rough nets if tax rate provided; null if rate is 0 or invalid */
  roughNet: null | {
    taxRatePercent: number;
    currentAnnualNet: number;
    newAnnualNet: number;
    raiseAnnualNet: number;
    currentMonthlyNet: number;
    newMonthlyNet: number;
  };
}

export function annualFromHourly(hourlyRate: number, hoursPerWeek: number, weeksPerYear: number): number {
  const h = Math.max(0, hourlyRate || 0);
  const hours = Math.max(0, hoursPerWeek || 0);
  const weeks = Math.max(0, weeksPerYear || 0);
  return h * hours * weeks;
}

export function currentAnnualPay(input: RaiseInputs): number {
  if (input.inputMode === 'hourly') {
    return annualFromHourly(input.hourlyRate, input.hoursPerWeek, input.weeksPerYear);
  }
  return Math.max(0, input.annualSalary || 0);
}

/**
 * Compute raise from percent of current annual pay.
 * raisePercent is the percent points (5 = 5%).
 */
export function calculateRaise(input: RaiseInputs): RaiseResult {
  const currentAnnual = currentAnnualPay(input);
  const raisePercent = Math.max(0, input.raisePercent || 0);
  const raiseAmountAnnual = currentAnnual * (raisePercent / 100);
  const newAnnual = currentAnnual + raiseAmountAnnual;

  const hoursPerYear = Math.max(
    0,
    (input.hoursPerWeek || 0) * (input.weeksPerYear || 0),
  );
  const currentHourly =
    input.inputMode === 'hourly'
      ? Math.max(0, input.hourlyRate || 0)
      : hoursPerYear > 0
        ? currentAnnual / hoursPerYear
        : 0;
  const newHourly =
    input.inputMode === 'hourly'
      ? currentHourly * (1 + raisePercent / 100)
      : hoursPerYear > 0
        ? newAnnual / hoursPerYear
        : 0;

  const taxRate = Math.min(100, Math.max(0, input.optionalTaxRatePercent || 0));
  let roughNet: RaiseResult['roughNet'] = null;
  if (taxRate > 0 && taxRate < 100) {
    const keep = 1 - taxRate / 100;
    roughNet = {
      taxRatePercent: taxRate,
      currentAnnualNet: currentAnnual * keep,
      newAnnualNet: newAnnual * keep,
      raiseAnnualNet: raiseAmountAnnual * keep,
      currentMonthlyNet: (currentAnnual * keep) / 12,
      newMonthlyNet: (newAnnual * keep) / 12,
    };
  }

  return {
    currentAnnual,
    raiseAmountAnnual,
    raisePercent,
    newAnnual,
    currentMonthly: currentAnnual / 12,
    newMonthly: newAnnual / 12,
    currentBiweekly: currentAnnual / 26,
    newBiweekly: newAnnual / 26,
    currentWeekly: currentAnnual / 52,
    newWeekly: newAnnual / 52,
    currentHourly,
    newHourly,
    roughNet,
  };
}

/** Percent raise given current and new annual amounts */
export function percentFromAmounts(currentAnnual: number, newAnnual: number): number {
  const c = Math.max(0, currentAnnual || 0);
  if (c <= 0) return 0;
  return ((Math.max(0, newAnnual || 0) - c) / c) * 100;
}

/** Dollar raise from percent */
export function amountFromPercent(currentAnnual: number, raisePercent: number): number {
  return Math.max(0, currentAnnual || 0) * (Math.max(0, raisePercent || 0) / 100);
}
