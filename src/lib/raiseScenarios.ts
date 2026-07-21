import { calculateRaise } from './raiseMath';
import { raiseCalculatorUrl } from './raiseLinks';

export type RaiseScenario = {
  /** URL slug under /guides/ */
  slug: string;
  cardTitle: string;
  cardBlurb: string;
  title: string;
  description: string;
  headline: string;
  /** annual | hourly */
  mode: 'annual' | 'hourly';
  annualSalary: number;
  hourlyRate: number;
  hoursPerWeek: number;
  weeksPerYear: number;
  /** Percents shown in the comparison table */
  samplePercents: number[];
  defaultPercent: number;
  primaryQuestion: string;
};

export const RAISE_SCENARIOS: RaiseScenario[] = [
  {
    slug: 'raise-60000-5-percent',
    cardTitle: 'How much is a 5% raise on $60,000?',
    cardBlurb: 'Stated-sample arithmetic only: $60k + 5% with period breakdown and prefilled calculator.',
    title: 'How Much Is a 5% Raise on $60,000? (Sample Math) | Nestfigure',
    description:
      'Educational raise math for $60,000 at 5% (and nearby sample percents). Not a job offer. Free prefilled raise calculator.',
    headline: 'How much is a 5% raise on $60,000?',
    mode: 'annual',
    annualSalary: 60000,
    hourlyRate: 0,
    hoursPerWeek: 40,
    weeksPerYear: 52,
    samplePercents: [3, 5, 7, 10],
    defaultPercent: 5,
    primaryQuestion: 'How much is a 5% raise on $60,000?',
  },
  {
    slug: 'raise-20-hour-5-percent',
    cardTitle: 'What is a 5% raise on $20 an hour?',
    cardBlurb: 'Hourly sample at 40×52 stated schedule—new rate, annualized dollars, and calculator link.',
    title: 'What Is a 5% Raise on $20 an Hour? (Sample Math) | Nestfigure',
    description:
      'Educational example: 5% on $20/hour at a stated 40 hours/week × 52 weeks/year schedule. Change inputs in the free raise calculator.',
    headline: 'What is a 5% raise on $20 an hour?',
    mode: 'hourly',
    annualSalary: 0,
    hourlyRate: 20,
    hoursPerWeek: 40,
    weeksPerYear: 52,
    samplePercents: [2, 3, 5, 10],
    defaultPercent: 5,
    primaryQuestion: 'What is a 5% raise on $20 an hour?',
  },
  {
    slug: 'raise-70000-3-percent',
    cardTitle: 'What would a 3% raise on $70,000 look like?',
    cardBlurb: 'Stated $70k sample with 3% (and nearby percents)—monthly/weekly views and deep links.',
    title: 'What Would a 3% Raise on $70,000 Look Like? (Sample Math) | Nestfigure',
    description:
      'Educational raise arithmetic for $70,000 at 3% and other sample percents. Not career advice. Prefill Nestfigure’s free raise calculator.',
    headline: 'What would a 3% raise on $70,000 look like?',
    mode: 'annual',
    annualSalary: 70000,
    hourlyRate: 0,
    hoursPerWeek: 40,
    weeksPerYear: 52,
    samplePercents: [2, 3, 4, 5],
    defaultPercent: 3,
    primaryQuestion: 'What would a 3% raise on $70,000 look like?',
  },
  {
    slug: 'raise-50000-10-percent',
    cardTitle: 'How much is a 10% raise on $50,000?',
    cardBlurb: 'Stated $50k + 10% sample table, period splits, and link to model your own numbers.',
    title: 'How Much Is a 10% Raise on $50,000? (Sample Math) | Nestfigure',
    description:
      'Educational estimate for a 10% raise on $50,000 annual pay (sample inputs only). Free raise calculator with prefills.',
    headline: 'How much is a 10% raise on $50,000?',
    mode: 'annual',
    annualSalary: 50000,
    hourlyRate: 0,
    hoursPerWeek: 40,
    weeksPerYear: 52,
    samplePercents: [5, 7, 10, 15],
    defaultPercent: 10,
    primaryQuestion: 'How much is a 10% raise on $50,000?',
  },
];

export function money(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n);
}

export function moneyHr(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n);
}

export function scenarioResult(s: RaiseScenario, raisePercent = s.defaultPercent) {
  return calculateRaise({
    inputMode: s.mode,
    annualSalary: s.annualSalary,
    hourlyRate: s.hourlyRate,
    hoursPerWeek: s.hoursPerWeek,
    weeksPerYear: s.weeksPerYear,
    raisePercent,
    optionalTaxRatePercent: 0,
  });
}

export function scenarioRows(s: RaiseScenario) {
  return s.samplePercents.map((pct) => {
    const r = scenarioResult(s, pct);
    return {
      pct,
      raiseAmount: r.raiseAmountAnnual,
      newAnnual: r.newAnnual,
      newMonthly: r.newMonthly,
      newHourly: r.newHourly,
      raiseAmountStr: money(r.raiseAmountAnnual),
      newAnnualStr: money(r.newAnnual),
      newMonthlyStr: money(r.newMonthly),
      newHourlyStr: moneyHr(r.newHourly),
    };
  });
}

export function scenarioCalcUrl(s: RaiseScenario, raisePercent = s.defaultPercent): string {
  if (s.mode === 'hourly') {
    return raiseCalculatorUrl({
      mode: 'hourly',
      hourly: s.hourlyRate,
      hoursPerWeek: s.hoursPerWeek,
      weeksPerYear: s.weeksPerYear,
      raisePercent,
    });
  }
  return raiseCalculatorUrl({
    mode: 'annual',
    annual: s.annualSalary,
    raisePercent,
  });
}

export function getRaiseScenario(slug: string): RaiseScenario | undefined {
  return RAISE_SCENARIOS.find((s) => s.slug === slug);
}

export function basePayLabel(s: RaiseScenario): string {
  if (s.mode === 'hourly') {
    return `${moneyHr(s.hourlyRate)}/hour · ${s.hoursPerWeek} hrs/wk · ${s.weeksPerYear} wks/yr`;
  }
  return `${money(s.annualSalary)} annual`;
}
