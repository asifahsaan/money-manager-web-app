// Income Tax Ordinance, 2001 (Pakistan) references shown in the Tax Report.
// Only well-established section numbers are listed; wording is a plain-language
// summary, not the legal text. Rates, thresholds and conditions change with each
// Finance Act — always confirm with a tax consultant or the FBR IRIS help.

export const FBR_LAST_REVIEWED = '30 Sep 2026';

export const FBR_DISCLAIMER =
  'This report organises your own records to help prepare an income tax return and wealth statement. ' +
  'It is not tax advice and is not an FBR audit or certification. Section references are general pointers ' +
  'to the Income Tax Ordinance, 2001; eligibility, rates and conditions depend on your circumstances and the ' +
  `current Finance Act. Verify with a tax consultant before filing. References last reviewed: ${FBR_LAST_REVIEWED}.`;

export interface FbrRef {
  section: string;
  note: string;
}

export const GENERAL_REFS: FbrRef[] = [
  { section: 's.74', note: 'Tax year — normal tax year runs 1 July to 30 June.' },
  { section: 's.114', note: 'Return of income.' },
  { section: 's.116', note: 'Wealth statement — assets, liabilities and reconciliation of wealth incl. personal expenses.' },
  { section: 's.111', note: 'Unexplained income or assets — increases in wealth must be explainable.' },
  { section: 's.174', note: 'Records — keep documents supporting your return.' },
  { section: 's.177', note: 'Audit — selection and audit are carried out by the Commissioner, not by software.' },
];

export const HEAD_REFS: Record<string, FbrRef[]> = {
  SALARY: [
    { section: 's.12', note: 'Salary (incl. allowances and bonus from employer).' },
    { section: 's.149', note: 'Tax withheld from salary by employer.' },
  ],
  PROPERTY: [
    { section: 's.15', note: 'Income from property (rent).' },
    { section: 's.155', note: 'Withholding on rent.' },
  ],
  BUSINESS: [{ section: 's.18', note: 'Income from business — includes freelancing/professional income.' }],
  CAPITAL_GAINS: [
    { section: 's.37', note: 'Capital gains on disposal of assets.' },
    { section: 's.37A', note: 'Capital gains on securities.' },
  ],
  OTHER_SOURCES: [
    { section: 's.39', note: 'Income from other sources.' },
    { section: 's.5 / s.150', note: 'Dividends and their withholding.' },
    { section: 's.7B / s.151', note: 'Profit on debt and its withholding.' },
    { section: 's.156', note: 'Prizes and winnings.' },
  ],
  NOT_INCOME: [
    { section: 's.116', note: 'Loans taken/repaid and money moved between your own accounts are not income, but loans must be declared in the wealth statement.' },
    { section: 's.111', note: 'Keep proof of the source of such receipts.' },
  ],
  DONATION_ZAKAT: [
    { section: 's.116', note: 'Personal expenses in the wealth statement.' },
    { section: 's.60', note: 'Zakat paid — deductible allowance (conditions apply).' },
    { section: 's.61', note: 'Donations to approved institutions — tax credit (conditions apply).' },
  ],
  EDUCATIONAL: [
    { section: 's.116', note: 'Personal expenses in the wealth statement.' },
    { section: 's.60D', note: 'Tuition fee — deductible allowance for eligible individuals (conditions apply).' },
  ],
};

/** Every expense head sits in the personal-expenses block of the wealth statement. */
export function refsFor(head: string): FbrRef[] {
  return HEAD_REFS[head] ?? [{ section: 's.116', note: 'Personal expenses in the wealth statement.' }];
}

export const WEALTH_REFS: FbrRef[] = [
  { section: 's.116', note: 'Opening and closing net assets, and reconciliation of the change in wealth.' },
  { section: 's.111', note: 'Any unexplained difference may be treated as unexplained income or assets.' },
];

export const INCOME_HEAD_OPTIONS = ['SALARY', 'PROPERTY', 'BUSINESS', 'CAPITAL_GAINS', 'OTHER_SOURCES', 'NOT_INCOME'] as const;
export const EXPENSE_HEAD_OPTIONS = [
  'RENT', 'RATES_TAXES', 'VEHICLE', 'TRAVELLING', 'ELECTRICITY', 'WATER', 'GAS', 'TELEPHONE',
  'INSURANCE', 'MEDICAL', 'EDUCATIONAL', 'CLUB', 'FUNCTIONS', 'DONATION_ZAKAT', 'OTHER_HOUSEHOLD', 'NOT_EXPENSE',
] as const;

export const HEAD_LABELS: Record<string, string> = {
  SALARY: 'Salary',
  PROPERTY: 'Income from property',
  BUSINESS: 'Income from business / freelancing',
  CAPITAL_GAINS: 'Capital gains',
  OTHER_SOURCES: 'Income from other sources',
  NOT_INCOME: 'Not income (excluded)',
  RENT: 'Rent',
  RATES_TAXES: 'Rates / taxes / charges / cess',
  VEHICLE: 'Vehicle running / maintenance',
  TRAVELLING: 'Travelling',
  ELECTRICITY: 'Electricity',
  WATER: 'Water',
  GAS: 'Gas',
  TELEPHONE: 'Telephone / internet',
  INSURANCE: 'Asset insurance / security',
  MEDICAL: 'Medical',
  EDUCATIONAL: 'Educational',
  CLUB: 'Club / fitness',
  FUNCTIONS: 'Functions / gatherings',
  DONATION_ZAKAT: 'Donation / Zakat',
  OTHER_HOUSEHOLD: 'Other personal / household',
  NOT_EXPENSE: 'Not an expense (excluded)',
};
