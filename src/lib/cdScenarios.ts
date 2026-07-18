import { calculateCd, type Compounding } from './cdMath';
import { cdCalculatorUrl } from './cdLinks';

export type CdScenario = {
  /** URL slug under /guides/ */
  slug: string;
  /** Short card title */
  cardTitle: string;
  cardBlurb: string;
  /** SEO */
  title: string;
  description: string;
  headline: string;
  /** Scenario inputs */
  principal: number;
  termMonths: number;
  /** Sample APYs shown in the article (not live rates) */
  sampleApys: number[];
  defaultApy: number;
  compounding: Compounding;
  /** Primary PAA-style question */
  primaryQuestion: string;
};

export const CD_SCENARIOS: CdScenario[] = [
  {
    slug: 'cd-10000-one-year',
    cardTitle: 'How much will a $10,000 CD make in one year?',
    cardBlurb: 'Build-time Nestfigure math at sample APYs for $10k · 12 months—not a live bank rate.',
    title: 'How Much Will a $10,000 CD Make in One Year? (Sample APY Math) | Nestfigure',
    description:
      'Educational CD interest examples for $10,000 over 12 months at labeled sample APYs (e.g. 4.50%). Not a bank quote. Free prefilled calculator. CFPB/FDIC/NCUA links.',
    headline: 'How much will a $10,000 CD make in one year?',
    principal: 10000,
    termMonths: 12,
    sampleApys: [4, 4.5, 5],
    defaultApy: 4.5,
    compounding: 'daily',
    primaryQuestion: 'How much will a $10,000 CD make in one year?',
  },
  {
    slug: 'cd-10000-6-months',
    cardTitle: 'How much will a $10,000 CD make in 6 months?',
    cardBlurb: 'Half-year sample APY table for $10k with calculator deep links and CFPB caveats.',
    title: 'How Much Will a $10,000 CD Make in 6 Months? (Sample APY Math) | Nestfigure',
    description:
      'Educational estimate for $10,000 over 6 months at sample APYs using Nestfigure math. Not a live rate offer. Prefill the free CD calculator.',
    headline: 'How much will a $10,000 CD make in 6 months?',
    principal: 10000,
    termMonths: 6,
    sampleApys: [4, 4.5, 5],
    defaultApy: 4.5,
    compounding: 'daily',
    primaryQuestion: 'How much will a $10,000 CD make in 6 months?',
  },
  {
    slug: 'cd-20000-5-years',
    cardTitle: 'What if I put $20,000 in a CD for 5 years?',
    cardBlurb: 'Five-year $20k sample balances, liquidity tradeoffs, and early-withdrawal notes from CFPB.',
    title: 'What If I Put $20,000 in a CD for 5 Years? (Sample APY Math) | Nestfigure',
    description:
      'Educational projection for $20,000 over 60 months at labeled sample APYs. Early-withdrawal and insurance context from CFPB/FDIC/NCUA. Not a bank offer.',
    headline: 'What if I put $20,000 in a CD for 5 years?',
    principal: 20000,
    termMonths: 60,
    sampleApys: [4, 4.5, 5],
    defaultApy: 4.5,
    compounding: 'daily',
    primaryQuestion: 'What if I put $20,000 in a CD for 5 years?',
  },
  {
    slug: 'cd-100000-6-months',
    cardTitle: 'How much will $100,000 make in a 6 month CD?',
    cardBlurb: 'Six-month $100k sample math plus FDIC/NCUA insurance pointers (no fake rates).',
    title: 'How Much Will $100,000 Make in a 6 Month CD? (Sample APY Math) | Nestfigure',
    description:
      'Educational estimate for $100,000 over 6 months at sample APYs. Verify deposit insurance with FDIC EDIE or NCUA materials. Not a live bank rate.',
    headline: 'How much will $100,000 make in a 6 month CD?',
    principal: 100000,
    termMonths: 6,
    sampleApys: [4, 4.5, 5],
    defaultApy: 4.5,
    compounding: 'daily',
    primaryQuestion: 'How much will $100,000 make in a 6 month CD?',
  },
];

export function money(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n);
}

export function termLabel(months: number): string {
  if (months % 12 === 0) {
    const y = months / 12;
    return y === 1 ? '1 year' : `${y} years`;
  }
  return months === 1 ? '1 month' : `${months} months`;
}

export function scenarioRows(s: CdScenario) {
  return s.sampleApys.map((apy) => {
    const r = calculateCd({
      principal: s.principal,
      ratePercent: apy,
      rateIsApy: true,
      termMonths: s.termMonths,
      compounding: s.compounding,
      monthlyDeposit: 0,
    });
    return {
      apy,
      interest: r.totalInterest,
      balance: r.finalBalance,
      interestStr: money(r.totalInterest),
      balanceStr: money(r.finalBalance),
    };
  });
}

export function scenarioCalcUrl(s: CdScenario, apy = s.defaultApy): string {
  return cdCalculatorUrl({
    principal: s.principal,
    rate: apy,
    rateType: 'apy',
    term: s.termMonths,
    termUnit: 'months',
    compounding: s.compounding,
  });
}

export function getScenario(slug: string): CdScenario | undefined {
  return CD_SCENARIOS.find((s) => s.slug === slug);
}
