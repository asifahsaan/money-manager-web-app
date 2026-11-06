import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { pdfText } from '@/lib/statement-export';
import type { StatementInput } from '@/lib/debt-statement';

// The person statement as an A4 PDF — the same content as the designed email,
// for attaching to an email, sending on WhatsApp or keeping for records.

type RGB = [number, number, number];
const BRAND: RGB = [79, 70, 229];
const INK: RGB = [17, 24, 39];
const MUTED: RGB = [107, 114, 128];
const LINE: RGB = [229, 231, 235];
const SOFT: RGB = [249, 250, 251];
const GREEN: RGB = [4, 120, 87];
const RED: RGB = [185, 28, 28];
const APP_URL = 'money-manager-web-app.vercel.app';

const day = (iso: string) => format(parseISO(iso.slice(0, 10)), 'd MMM yyyy');

export function statementPdfName(personName: string) {
  const who = personName.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'person';
  return `statement-${who}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
}

export async function statementPdf({ personName, debts, walletName, lang, ownerName, currency }: StatementInput): Promise<Blob> {
  // Loaded on demand: keeps the PDF code out of the main bundle
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const T = (ur: string, en: string) => (lang === 'ur' ? ur : en);
  const m = (v: string | number) => pdfText(formatCurrency(Math.abs(Number(v)), currency));
  const name = pdfText(personName.trim());
  const owner = pdfText(ownerName.trim() || 'Money Manager');
  const sorted = [...debts].sort((a, b) => a.date.localeCompare(b.date));
  const net = sorted.reduce((t, d) => (d.status === 'CLOSED' ? t : t + (d.type === 'RECEIVABLE' ? 1 : -1) * Number(d.remainingAmount)), 0);
  const today = format(new Date(), 'd MMM yyyy');

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const text = (s: string, x: number, y: number, size: number, color: RGB, bold = false, align: 'left' | 'right' = 'left') => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(s, x, y, { align });
  };

  // Header band
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 76, 'F');
  text('MONEY MANAGER', M, 30, 8.5, [224, 231, 255], true);
  text(T('Hisaab ki tafseel', 'Statement of account'), M, 52, 18, [255, 255, 255], true);
  text(T('Tareekh', 'Date'), W - M, 30, 8.5, [224, 231, 255], false, 'right');
  text(today, W - M, 46, 11, [255, 255, 255], true, 'right');

  // Between
  text(T('Kis ke darmiyan', 'Between'), M, 104, 8, MUTED);
  text(`${owner}  &  ${name}`, M, 118, 12, INK, true);

  // Total box
  const totalLabel = net > 0 ? T('Kul baqi - aap ke zimme', 'Total you owe me') : net < 0 ? T('Kul baqi - mere zimme', 'Total I owe you') : T('Hisaab barabar', 'All square');
  doc.setFillColor(...SOFT);
  doc.setDrawColor(...LINE);
  doc.roundedRect(M, 134, W - 2 * M, 58, 6, 6, 'FD');
  text(totalLabel, M + 14, 155, 9, MUTED);
  text(m(net), M + 14, 179, 20, net > 0 ? GREEN : net < 0 ? RED : INK, true);
  text(`${sorted.length} ${T('hisaab', sorted.length === 1 ? 'item' : 'items')}`, W - M - 14, 160, 9, MUTED, false, 'right');
  text(`${T('Tak', 'As of')} ${today}`, W - M - 14, 174, 9, MUTED, false, 'right');

  let y = 220;
  sorted.forEach((d, i) => {
    const owedToMe = d.type === 'RECEIVABLE';
    const closed = d.status === 'CLOSED';
    if (y > H - 160) {
      doc.addPage();
      y = 50;
    }
    const title = `${i + 1}. ${pdfText(d.description?.trim() || day(d.date))}`;
    const badge = closed ? T('Poora wapis', 'Settled') : owedToMe ? T('Aap ke zimme', 'You owe me') : T('Mere zimme', 'I owe you');
    text(title, M, y, 11, INK, true);
    text(badge, W - M, y, 9, closed ? MUTED : owedToMe ? GREEN : RED, true, 'right');

    let balance = Number(d.totalAmount);
    const rows: string[][] = [[
      day(d.date),
      owedToMe ? T('Aap ko diye', 'Lent to you') : T('Aap se liye', 'Borrowed from you'),
      pdfText(walletName(d.walletId) ?? ''),
      m(d.totalAmount),
      m(balance),
    ]];
    for (const e of [...(d.entries ?? [])].sort((a, b) => a.date.localeCompare(b.date))) {
      balance -= Number(e.amount);
      const label = owedToMe ? T('Wapis mile', 'Paid back') : T('Wapis kiye', 'Repaid');
      rows.push([
        day(e.date),
        e.note?.trim() ? `${label}\n${pdfText(e.note.trim())}` : label,
        pdfText(walletName(e.walletId) ?? ''),
        `- ${m(e.amount)}`,
        m(Math.max(0, balance)),
      ]);
    }
    const due = !closed && d.dueDate ? `   ·   ${T('Wapsi ki tareekh', 'Due')}: ${day(d.dueDate)}` : '';
    const foot = closed ? T('Yeh hisaab barabar ho chuka hai.', 'This one is fully settled.') : `${T('Baqi', 'Outstanding')}: ${m(d.remainingAmount)}${due}`;

    autoTable(doc, {
      startY: y + 8,
      margin: { left: M, right: M, bottom: 50 },
      head: [[T('Tareekh', 'Date'), T('Tafseel', 'Details'), 'Wallet', T('Raqam', 'Amount'), T('Baqi', 'Balance')]],
      body: rows,
      foot: [[{ content: foot, colSpan: 5 }]],
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 6, textColor: INK, lineColor: LINE, lineWidth: 0.5, overflow: 'linebreak' },
      headStyles: { fillColor: SOFT, textColor: MUTED, fontStyle: 'bold', fontSize: 8 },
      footStyles: { fillColor: SOFT, textColor: closed ? MUTED : owedToMe ? GREEN : RED, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 72 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 92, textColor: MUTED },
        3: { cellWidth: 82, halign: 'right' },
        4: { cellWidth: 82, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'head' && data.column.index >= 3) data.cell.styles.halign = 'right';
        if (data.section === 'body' && data.column.index === 3 && data.row.index > 0) data.cell.styles.textColor = GREEN;
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 30;
  });

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE);
    doc.line(M, H - 34, W - M, H - 34);
    text(`${T(`${owner} ki taraf se, Money Manager se banaya gaya`, `Prepared by ${owner} with Money Manager`)} · ${APP_URL}`, M, H - 22, 7.5, MUTED);
    text(`${T('Safha', 'Page')} ${p} / ${pages}`, W - M, H - 22, 7.5, MUTED, false, 'right');
  }

  return doc.output('blob');
}
