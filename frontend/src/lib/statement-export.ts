import { format, parseISO } from 'date-fns';
import type { Statement } from '@/services/statement.service';

// 1234.5 → "1,234.50" (statement columns carry no currency symbol; it's in the header)
export function amount(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value;
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const day = (d: string) => format(parseISO(d), 'dd MMM yyyy');

export function periodLabel(s: Statement) {
  return `${day(s.period.startDate)} – ${day(s.period.endDate)}`;
}

function fileBase(s: Statement) {
  const scope = s.scope.label.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'wallet';
  return `statement-${scope}-${s.period.startDate}_to_${s.period.endDate}`;
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

export function downloadStatementCsv(s: Statement) {
  const cell = (v: string | number | null | undefined) => {
    const str = v == null ? '' : String(v);
    return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const line = (...cells: (string | number | null | undefined)[]) => cells.map(cell).join(',');
  const num = (v: string) => (Number(v) ? Number(v).toFixed(2) : '');

  const lines = [
    line('Money Manager — Account Statement'),
    line('Account holder', s.holderName),
    line('Email', s.holderEmail),
    line('Account', s.accountName),
    line('Wallets', s.scope.walletId ? s.scope.label : `All wallets (${s.scope.wallets.join('; ')})`),
    line('Period', `${s.period.startDate} to ${s.period.endDate}`),
    line('Currency', s.currency),
    line('Generated', format(parseISO(s.generatedAt), 'yyyy-MM-dd HH:mm')),
    '',
    line('Date', 'Description', 'Category', 'Wallet', 'Debit', 'Credit', 'Balance'),
    line(s.period.startDate, 'Opening balance', '', '', '', '', Number(s.openingBalance).toFixed(2)),
    ...s.rows.map((r) => line(r.date, r.description, r.category, r.wallet, num(r.debit), num(r.credit), Number(r.balance).toFixed(2))),
    line('', 'Totals', '', '', Number(s.totalDebit).toFixed(2), Number(s.totalCredit).toFixed(2), ''),
    line(s.period.endDate, 'Closing balance', '', '', '', '', Number(s.closingBalance).toFixed(2)),
  ];
  // BOM so Excel opens it as UTF-8 (keeps "—", "›" and Urdu text intact)
  save(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${fileBase(s)}.csv`);
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

// The built-in PDF font only covers Latin-1; swap the few symbols we use and
// replace anything else (e.g. Urdu) rather than print garbage.
function pdfText(v: string) {
  return v
    .replace(/→/g, '->')
    .replace(/›/g, '>')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
}

const BRAND: [number, number, number] = [79, 70, 229];
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];
const DEBIT: [number, number, number] = [190, 18, 60];
const CREDIT: [number, number, number] = [4, 120, 87];

export async function downloadStatementPdf(s: Statement) {
  // Loaded on demand: keeps ~350 KB of PDF code out of the main bundle
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;

  // Header band
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 64, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Money Manager', M, 38);
  doc.setFontSize(12);
  doc.text('ACCOUNT STATEMENT', W - M, 38, { align: 'right' });

  // Holder / statement details
  const info = (label: string, value: string, x: number, y: number, align: 'left' | 'right' = 'left') => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, y, { align });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(pdfText(value), x, y + 13, { align });
  };
  info('Account holder', s.holderName, M, 90);
  info('Email', s.holderEmail, M, 120);
  info('Account', s.accountName, M, 150);
  info('Statement period', periodLabel(s), W - M, 90, 'right');
  info('Wallets', s.scope.walletId ? s.scope.label : `All wallets (${s.scope.wallets.length})`, W - M, 120, 'right');
  info('Generated on', format(parseISO(s.generatedAt), 'dd MMM yyyy, HH:mm'), W - M, 150, 'right');

  // Summary boxes
  const boxes: [string, string, [number, number, number]][] = [
    ['Opening balance', s.openingBalance, INK],
    ['Total credits (in)', s.totalCredit, CREDIT],
    ['Total debits (out)', s.totalDebit, DEBIT],
    ['Closing balance', s.closingBalance, INK],
  ];
  const gap = 8;
  const bw = (W - 2 * M - gap * 3) / 4;
  const by = 182;
  boxes.forEach(([label, value, color], i) => {
    const x = M + i * (bw + gap);
    doc.setFillColor(246, 247, 251);
    doc.setDrawColor(228, 231, 238);
    doc.roundedRect(x, by, bw, 46, 4, 4, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label, x + 8, by + 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...color);
    doc.text(`${pdfText(s.currency)} ${amount(value)}`, x + 8, by + 34);
  });

  // Ledger table
  const body = [
    [day(s.period.startDate), 'Opening balance', '', '', '', '', amount(s.openingBalance)],
    ...s.rows.map((r) => [
      day(r.date),
      pdfText(r.description),
      pdfText(r.category ?? ''),
      pdfText(r.wallet),
      Number(r.debit) ? amount(r.debit) : '',
      Number(r.credit) ? amount(r.credit) : '',
      amount(r.balance),
    ]),
  ];
  autoTable(doc, {
    startY: by + 64,
    margin: { left: M, right: M, bottom: 50 },
    head: [['Date', 'Description', 'Category', 'Wallet', 'Debit', 'Credit', 'Balance']],
    body,
    foot: [
      ['', 'Totals', '', '', amount(s.totalDebit), amount(s.totalCredit), ''],
      [day(s.period.endDate), 'Closing balance', '', '', '', '', amount(s.closingBalance)],
    ],
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 5, textColor: INK, overflow: 'linebreak' },
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [238, 242, 255], textColor: INK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 58 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 72 },
      3: { cellWidth: 70 },
      4: { cellWidth: 58, halign: 'right', textColor: DEBIT },
      5: { cellWidth: 58, halign: 'right', textColor: CREDIT },
      6: { cellWidth: 64, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Opening-balance row and footer: plain ink, numbers right-aligned
      if (data.section === 'body' && data.row.index === 0) data.cell.styles.fontStyle = 'bold';
      if (data.section === 'foot' && data.column.index >= 4) data.cell.styles.halign = 'right';
      if (data.section === 'head' && data.column.index >= 4) data.cell.styles.halign = 'right';
    },
  });

  // Footer on every page
  const pages = doc.getNumberOfPages();
  const H = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(228, 231, 238);
    doc.line(M, H - 34, W - M, H - 34);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`System-generated statement from Money Manager · All amounts in ${pdfText(s.currency)}`, M, H - 22);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 22, { align: 'right' });
  }

  doc.save(`${fileBase(s)}.pdf`);
}
