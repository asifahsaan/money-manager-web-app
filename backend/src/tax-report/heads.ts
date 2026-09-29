// Heads used to group categories for an income tax return (Pakistan).
// Income heads follow the heads of income in the Income Tax Ordinance 2001;
// expense heads follow the "personal expenses" block of the wealth statement.
// Section references are shown by the frontend (src/lib/fbr-references.ts).

export const INCOME_HEADS = ['SALARY', 'PROPERTY', 'BUSINESS', 'CAPITAL_GAINS', 'OTHER_SOURCES', 'NOT_INCOME'] as const;
export const EXPENSE_HEADS = [
  'RENT', 'RATES_TAXES', 'VEHICLE', 'TRAVELLING', 'ELECTRICITY', 'WATER', 'GAS', 'TELEPHONE',
  'INSURANCE', 'MEDICAL', 'EDUCATIONAL', 'CLUB', 'FUNCTIONS', 'DONATION_ZAKAT', 'OTHER_HOUSEHOLD', 'NOT_EXPENSE',
] as const;

export type IncomeHead = (typeof INCOME_HEADS)[number];
export type ExpenseHead = (typeof EXPENSE_HEADS)[number];
export type Head = IncomeHead | ExpenseHead;

export const HEAD_LABELS: Record<Head, string> = {
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

// Keyword rules, first match wins. Checked against the category name, then its parent's.
const INCOME_RULES: [RegExp, IncomeHead][] = [
  [/debt|loan|borrow|refund|opening/i, 'NOT_INCOME'],
  [/salary|pay ?roll|allowance|tips?\b|bonus|overtime|pension/i, 'SALARY'],
  [/rent|property|tenant/i, 'PROPERTY'],
  [/freelanc|business|client|project|consult|sale|shop|fiverr|upwork/i, 'BUSINESS'],
  [/capital|share|stock|crypto|gain|plot|property sale/i, 'CAPITAL_GAINS'],
  [/dividend|profit|interest|investment|award|prize|lottery|gift|other/i, 'OTHER_SOURCES'],
];
const EXPENSE_RULES: [RegExp, ExpenseHead][] = [
  [/loan|debt|repay|transfer/i, 'NOT_EXPENSE'],
  [/rent/i, 'RENT'],
  [/tax|cess|challan|token/i, 'RATES_TAXES'],
  [/fuel|petrol|diesel|car|bike|vehicle|mechanic|parking|toll/i, 'VEHICLE'],
  [/transport|travel|careem|uber|indrive|bykea|bus|train|flight|air|taxi/i, 'TRAVELLING'],
  [/electric|wapda|lesco|k-?electric|iesco|fesco/i, 'ELECTRICITY'],
  [/water/i, 'WATER'],
  [/gas|sui|lpg/i, 'GAS'],
  [/phone|mobile|internet|net\b|net payment|wifi|ptcl|package|bills?/i, 'TELEPHONE'],
  [/insurance|security|takaful/i, 'INSURANCE'],
  [/health|medic|doctor|hospital|pharma|clinic/i, 'MEDICAL'],
  [/educat|school|college|university|tuition|course|book/i, 'EDUCATIONAL'],
  [/club|gym|fitness|sport/i, 'CLUB'],
  [/wedding|function|event|party|gathering/i, 'FUNCTIONS'],
  [/zakat|donat|charity|sadq|khairat|fitra/i, 'DONATION_ZAKAT'],
];

export function defaultHead(
  type: 'INCOME' | 'EXPENSE',
  name: string,
  parentName?: string | null,
): Head {
  const rules = type === 'INCOME' ? INCOME_RULES : EXPENSE_RULES;
  for (const candidate of [name, parentName].filter(Boolean) as string[]) {
    const hit = rules.find(([re]) => re.test(candidate));
    if (hit) return hit[1];
  }
  return type === 'INCOME' ? 'OTHER_SOURCES' : 'OTHER_HOUSEHOLD';
}

export function isValidHead(type: 'INCOME' | 'EXPENSE', head: string): head is Head {
  return type === 'INCOME'
    ? (INCOME_HEADS as readonly string[]).includes(head)
    : (EXPENSE_HEADS as readonly string[]).includes(head);
}
