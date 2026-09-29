import { format, parseISO } from 'date-fns';
import type { TaxReport } from '@/services/tax-report.service';
import { FBR_DISCLAIMER, GENERAL_REFS, WEALTH_REFS, refsFor } from '@/lib/fbr-references';
import { amount } from '@/lib/statement-export';

const refText = (head: string) => refsFor(head).map((r) => r.section).join(', ');

function fileBase(r: TaxReport) {
  return `tax-report-${r.period.type === 'tax' ? 'TY' : 'CY'}${r.period.year}`;
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

// ─── CSV (one file, sections separated by blank lines) ───────────────────────

export function downloadTaxCsv(r: TaxReport) {
  const cell = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const line = (...c: (string | number | null | undefined)[]) => c.map(cell).join(',');
  const n = (v: string) => Number(v).toFixed(2);
  const out: string[] = [
    line('Money Manager — Tax Year Report'),
    line('Period', r.period.label),
    line('Account holder', r.holderName),
    line('Account', r.accountName),
    line('Currency', r.currency),
    line('Generated', format(parseISO(r.generatedAt), 'yyyy-MM-dd HH:mm')),
    '',
    line('INCOME'),
    line('Head', 'Category', 'Transactions', 'Amount', 'ITO 2001 reference'),
    ...r.income.heads.flatMap((h) => [
      ...h.categories.map((c) => line(h.label, c.name, c.count, n(c.total), refText(h.head))),
      line(`${h.label} — total`, '', '', n(h.total), ''),
    ]),
    line('Total income (excl. "not income")', '', '', n(r.income.total), ''),
    '',
    line('PERSONAL EXPENSES'),
    line('Head', 'Category', 'Transactions', 'Amount', 'ITO 2001 reference'),
    ...r.expenses.heads.flatMap((h) => [
      ...h.categories.map((c) => line(h.label, c.name, c.count, n(c.total), refText(h.head))),
      line(`${h.label} — total`, '', '', n(h.total), ''),
    ]),
    line('Total personal expenses (excl. "not an expense")', '', '', n(r.expenses.total), ''),
    '',
    line('WEALTH RECONCILIATION (s.116)'),
    line('Item', 'Start of period', 'End of period'),
    ...r.wealth.closing.wallets.map((w) => {
      const o = r.wealth.opening.wallets.find((x) => x.id === w.id);
      return line(`Wallet: ${w.name}`, n(o?.amount ?? '0'), n(w.amount));
    }),
    line('Savings goals', n(r.wealth.opening.goals), n(r.wealth.closing.goals)),
    line('Loans given (receivable)', n(r.wealth.opening.receivables), n(r.wealth.closing.receivables)),
    line('Loans taken (payable)', `-${n(r.wealth.opening.payables)}`, `-${n(r.wealth.closing.payables)}`),
    line('Net assets', n(r.wealth.opening.net), n(r.wealth.closing.net)),
    '',
    ...r.wealth.lines.map((l) => line(l.label, n(l.amount))),
    line('Expected closing net assets', n(r.wealth.expectedClosing)),
    line('Actual closing net assets', n(r.wealth.actualClosing)),
    line('Unexplained difference', n(r.wealth.residual)),
    '',
    line('AUDIT FINDINGS'),
    line('Severity', 'Finding', 'Date', 'Item', 'Amount'),
    ...r.audit.findings.flatMap((f) => f.items.map((i) => line(f.severity, f.title, i.date, i.label, i.amount))),
    '',
    line('TRANSACTIONS'),
    line('Date', 'Type', 'Head', 'Category', 'Wallet', 'Description', 'Amount'),
    ...r.transactions.map((t) => line(t.date, t.type, t.head, t.category, t.wallet, t.description, n(t.amount))),
    '',
    line('Disclaimer', FBR_DISCLAIMER),
  ];
  save(new Blob(['﻿' + out.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${fileBase(r)}.csv`);
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

const pdfText = (v: string) =>
  v.replace(/→/g, '->').replace(/›/g, '>').replace(/[–—]/g, '-').replace(/[≥]/g, '>=').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');

const BRAND: [number, number, number] = [79, 70, 229];
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];
const RED: [number, number, number] = [190, 18, 60];
const GREEN: [number, number, number] = [4, 120, 87];
const AMBER: [number, number, number] = [180, 83, 9];

export async function downloadTaxPdf(r: TaxReport) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const cur = pdfText(r.currency);
  let y = 0;

  const heading = (text: string, sub?: string) => {
    if (y > H - 140) {
      doc.addPage();
      y = M;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    doc.text(pdfText(text), M, y);
    if (sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(pdfText(sub), W - M, y, { align: 'right' });
    }
    y += 8;
  };
  const table = (opts: Parameters<typeof autoTable>[1]) => {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M, bottom: 50 },
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 4.5, textColor: INK, overflow: 'linebreak' },
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [238, 242, 255], textColor: INK, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      ...opts,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;
  };

  // Cover band
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 70, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Money Manager', M, 32);
  doc.setFontSize(11);
  doc.text('TAX YEAR REPORT & AUDIT', W - M, 32, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(pdfText(r.period.label), W - M, 50, { align: 'right' });
  doc.text(pdfText(`${r.holderName} · ${r.holderEmail}`), M, 50);
  y = 96;

  // Summary tiles
  const tiles: [string, string, [number, number, number]][] = [
    ['Total income', r.income.total, GREEN],
    ['Personal expenses', r.expenses.total, RED],
    ['Net assets (end)', r.wealth.actualClosing, INK],
    ['Unexplained difference', r.wealth.residual, Number(r.wealth.residual) ? RED : GREEN],
  ];
  const gap = 8;
  const bw = (W - 2 * M - gap * 3) / 4;
  tiles.forEach(([label, value, color], i) => {
    const x = M + i * (bw + gap);
    doc.setFillColor(246, 247, 251);
    doc.setDrawColor(228, 231, 238);
    doc.roundedRect(x, y, bw, 46, 4, 4, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label, x + 8, y + 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...color);
    doc.text(`${cur} ${amount(value)}`, x + 8, y + 34);
  });
  y += 64;

  // Audit summary
  const { errors, warnings, infos } = r.audit;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...(errors ? RED : warnings ? AMBER : GREEN));
  doc.text(
    errors || warnings
      ? `Data audit: ${errors} issue(s), ${warnings} warning(s), ${infos} note(s) — see "Audit findings".`
      : `Data audit: no issues found${infos ? ` (${infos} note(s))` : ''}.`,
    M,
    y,
  );
  y += 24;

  const headTable = (title: string, heads: TaxReport['income']['heads'], total: string, totalLabel: string) => {
    heading(title, 'ITO 2001 references are general pointers — see disclaimer');
    table({
      head: [['Head / category', 'Txns', `Amount (${cur})`, 'Reference']],
      body: heads.flatMap((h) => [
        [{ content: pdfText(h.label), styles: { fontStyle: 'bold' } }, '', { content: amount(h.total), styles: { fontStyle: 'bold' } }, refText(h.head)],
        ...h.categories.map((c) => [`   ${pdfText(c.name)}`, String(c.count), amount(c.total), '']),
      ]),
      foot: [[totalLabel, '', amount(total), '']],
      columnStyles: { 1: { halign: 'right', cellWidth: 40 }, 2: { halign: 'right', cellWidth: 90 }, 3: { cellWidth: 110, textColor: MUTED } },
      didParseCell: (d) => {
        if ((d.section === 'foot' || d.section === 'head') && (d.column.index === 1 || d.column.index === 2)) d.cell.styles.halign = 'right';
      },
    });
  };
  headTable('Income by head', r.income.heads, r.income.total, 'Total income (excluding "not income")');
  headTable('Personal expenses by head (wealth statement)', r.expenses.heads, r.expenses.total, 'Total personal expenses');

  // Wealth
  heading('Wealth reconciliation', WEALTH_REFS.map((x) => x.section).join(', '));
  table({
    head: [['Assets / liabilities', `Start (${cur})`, `End (${cur})`]],
    body: [
      ...r.wealth.closing.wallets.map((w) => [pdfText(`Wallet: ${w.name}`), amount(r.wealth.opening.wallets.find((o) => o.id === w.id)?.amount ?? '0'), amount(w.amount)]),
      ['Savings goals', amount(r.wealth.opening.goals), amount(r.wealth.closing.goals)],
      ['Loans given (receivable)', amount(r.wealth.opening.receivables), amount(r.wealth.closing.receivables)],
      ['Loans taken (payable)', `(${amount(r.wealth.opening.payables)})`, `(${amount(r.wealth.closing.payables)})`],
    ],
    foot: [['Net assets', amount(r.wealth.opening.net), amount(r.wealth.closing.net)]],
    columnStyles: { 1: { halign: 'right', cellWidth: 110 }, 2: { halign: 'right', cellWidth: 110 } },
    didParseCell: (d) => {
      if ((d.section === 'foot' || d.section === 'head') && d.column.index > 0) d.cell.styles.halign = 'right';
    },
  });
  table({
    head: [['Reconciliation', `Amount (${cur})`]],
    body: r.wealth.lines.map((l) => [pdfText(l.label), amount(l.amount)]),
    foot: [
      ['Expected closing net assets', amount(r.wealth.expectedClosing)],
      ['Actual closing net assets', amount(r.wealth.actualClosing)],
      ['Unexplained difference (should be 0.00)', amount(r.wealth.residual)],
    ],
    columnStyles: { 1: { halign: 'right', cellWidth: 130 } },
    didParseCell: (d) => {
      if ((d.section === 'foot' || d.section === 'head') && d.column.index === 1) d.cell.styles.halign = 'right';
      if (d.section === 'foot' && d.row.index === 2 && Number(r.wealth.residual)) d.cell.styles.textColor = RED;
    },
  });

  // Audit findings
  heading('Audit findings');
  if (!r.audit.findings.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GREEN);
    doc.text('No issues found.', M, y + 10);
    y += 30;
  } else {
    table({
      head: [['Severity', 'Finding / item', 'Date', `Amount (${cur})`]],
      body: r.audit.findings.flatMap((f) => [
        [
          { content: f.severity.toUpperCase(), styles: { fontStyle: 'bold', textColor: f.severity === 'error' ? RED : f.severity === 'warning' ? AMBER : MUTED } },
          { content: pdfText(`${f.title} — ${f.detail}`), styles: { fontStyle: 'bold' }, colSpan: 3 },
        ],
        ...f.items.map((i) => ['', `   ${pdfText(i.label)}`, i.date ?? '', i.amount ? amount(i.amount) : '']),
      ]),
      columnStyles: { 0: { cellWidth: 60 }, 2: { cellWidth: 70 }, 3: { halign: 'right', cellWidth: 80 } },
    });
  }

  // Transactions appendix
  heading('Appendix: income and expense transactions');
  table({
    head: [['Date', 'Head', 'Category', 'Description', `Amount (${cur})`]],
    body: r.transactions.map((t) => [t.date, pdfText(t.head), pdfText(t.category), pdfText(t.description), `${t.type === 'INCOME' ? '' : '-'}${amount(t.amount)}`]),
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 3.5, textColor: INK, overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: 58 }, 1: { cellWidth: 100 }, 4: { halign: 'right', cellWidth: 70 } },
  });

  // References + disclaimer
  heading('References (Income Tax Ordinance, 2001)');
  table({
    head: [['Section', 'What it covers']],
    body: GENERAL_REFS.map((g) => [g.section, pdfText(g.note)]),
    columnStyles: { 0: { cellWidth: 70 } },
  });
  if (y > H - 110) {
    doc.addPage();
    y = M;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(doc.splitTextToSize(pdfText(FBR_DISCLAIMER), W - 2 * M), M, y);

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(228, 231, 238);
    doc.line(M, H - 34, W - M, H - 34);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(pdfText(`${r.period.label} · Prepared from your Money Manager records · Not an FBR certification`), M, H - 22);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 22, { align: 'right' });
  }
  doc.save(`${fileBase(r)}.pdf`);
}
