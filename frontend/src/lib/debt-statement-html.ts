import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import type { StatementInput } from '@/lib/debt-statement';

// The statement as a designed email: header, total box, one table per loan,
// footer. Email apps ignore <style> blocks and modern CSS, so this is plain
// tables with inline styles, fixed colours and a 600px column — it pastes
// into Gmail/Outlook and looks the same there.

const C = {
  brand: '#4F46E5',
  brandDark: '#3730A3',
  ink: '#111827',
  muted: '#6B7280',
  line: '#E5E7EB',
  soft: '#F9FAFB',
  page: '#F3F4F6',
  green: '#047857',
  greenBg: '#ECFDF5',
  red: '#B91C1C',
  redBg: '#FEF2F2',
};
const FONT = "font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const day = (iso: string) => format(parseISO(iso.slice(0, 10)), 'd MMM yyyy');

export function statementHtml({ personName, debts, walletName, lang, ownerName, currency }: StatementInput): string {
  const T = (ur: string, en: string) => (lang === 'ur' ? ur : en);
  const m = (v: string | number) => esc(formatCurrency(Math.abs(Number(v)), currency));
  const name = esc(personName.trim());
  const sorted = [...debts].sort((a, b) => a.date.localeCompare(b.date));
  const net = sorted.reduce((t, d) => (d.status === 'CLOSED' ? t : t + (d.type === 'RECEIVABLE' ? 1 : -1) * Number(d.remainingAmount)), 0);

  // fixed widths so every loan's table lines up
  const th = (label: string, align = 'left', width = '') =>
    `<th align="${align}"${width ? ` width="${width}"` : ''} style="${FONT}font-size:11px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:.04em;padding:8px 10px;border-bottom:1px solid ${C.line};background:${C.soft};">${label}</th>`;
  const td = (html: string, align = 'left', extra = '') =>
    `<td align="${align}" style="${FONT}font-size:13px;color:${C.ink};padding:8px 10px;border-bottom:1px solid ${C.line};vertical-align:top;${extra}">${html}</td>`;
  // dates and amounts never wrap
  const tdN = (html: string, align = 'left', extra = '') => td(html, align, `white-space:nowrap;${extra}`);

  const loans = sorted
    .map((d, i) => {
      const owedToMe = d.type === 'RECEIVABLE';
      const closed = d.status === 'CLOSED';
      const badge = closed
        ? `<span style="${FONT}white-space:nowrap;background:${C.soft};color:${C.muted};border:1px solid ${C.line};border-radius:999px;padding:2px 8px;font-size:11px;">${T('Poora wapis', 'Settled')}</span>`
        : owedToMe
          ? `<span style="${FONT}white-space:nowrap;background:${C.greenBg};color:${C.green};border-radius:999px;padding:2px 8px;font-size:11px;font-weight:600;">${T('Aap ke zimme', 'You owe me')}</span>`
          : `<span style="${FONT}white-space:nowrap;background:${C.redBg};color:${C.red};border-radius:999px;padding:2px 8px;font-size:11px;font-weight:600;">${T('Mere zimme', 'I owe you')}</span>`;

      let balance = Number(d.totalAmount);
      const rows = [
        `<tr>${tdN(day(d.date))}${td(owedToMe ? T('Aap ko diye', 'Lent to you') : T('Aap se liye', 'Borrowed from you'))}${td(esc(walletName(d.walletId) ?? '—'), 'left', `color:${C.muted};`)}${tdN(m(d.totalAmount), 'right')}${tdN(m(balance), 'right', 'font-weight:600;')}</tr>`,
      ];
      for (const e of [...(d.entries ?? [])].sort((a, b) => a.date.localeCompare(b.date))) {
        balance -= Number(e.amount);
        const label = owedToMe ? T('Wapis mile', 'Paid back') : T('Wapis kiye', 'Repaid');
        const note = e.note?.trim() ? `<br><span style="color:${C.muted};font-size:12px;">${esc(e.note.trim())}</span>` : '';
        rows.push(
          `<tr>${tdN(day(e.date))}${td(label + note)}${td(esc(walletName(e.walletId) ?? '—'), 'left', `color:${C.muted};`)}${tdN(`− ${m(e.amount)}`, 'right', `color:${C.green};`)}${tdN(m(Math.max(0, balance)), 'right', 'font-weight:600;')}</tr>`,
        );
      }
      const due = !closed && d.dueDate ? ` · ${T('Wapsi ki tareekh', 'Due')}: <b>${day(d.dueDate)}</b>` : '';
      return `
        <tr><td style="padding:${i === 0 ? '4px' : '22px'} 0 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="${FONT}font-size:14px;font-weight:600;color:${C.ink};">${i + 1}. ${day(d.date)}${d.description?.trim() ? ` — ${esc(d.description.trim())}` : ''}</td>
            <td align="right">${badge}</td>
          </tr></table>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;border:1px solid ${C.line};border-radius:8px;border-collapse:separate;overflow:hidden;">
            <tr>${th(T('Tareekh', 'Date'), 'left', '20%')}${th(T('Tafseel', 'Details'), 'left', '30%')}${th(T('Wallet', 'Wallet'), 'left', '18%')}${th(T('Raqam', 'Amount'), 'right', '16%')}${th(T('Baqi', 'Balance'), 'right', '16%')}</tr>
            ${rows.join('')}
            <tr><td colspan="5" style="${FONT}font-size:13px;padding:9px 10px;background:${C.soft};color:${C.ink};">
              ${closed ? `<span style="color:${C.muted};">${T('Yeh hisaab barabar ho chuka hai.', 'This one is fully settled.')}</span>` : `${T('Baqi', 'Outstanding')}: <b style="color:${owedToMe ? C.green : C.red};">${m(d.remainingAmount)}</b>${due}`}
            </td></tr>
          </table>
        </td></tr>`;
    })
    .join('');

  const totalLabel = net > 0 ? T('Kul baqi — aap ke zimme', 'Total you owe me') : net < 0 ? T('Kul baqi — mere zimme', 'Total I owe you') : T('Hisaab barabar', 'All square');
  const totalColor = net > 0 ? C.green : net < 0 ? C.red : C.ink;
  const today = format(new Date(), 'd MMM yyyy');
  const owner = esc(ownerName || 'Money Manager');

  return `<!doctype html><html><body style="margin:0;padding:0;background:${C.page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${C.line};border-radius:12px;overflow:hidden;">
  <tr><td style="background:${C.brand};background-image:linear-gradient(135deg,${C.brand},${C.brandDark});padding:22px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="${FONT}color:#ffffff;">
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">Money Manager</div>
        <div style="font-size:20px;font-weight:700;margin-top:2px;">${T('Hisaab ki tafseel', 'Statement of account')}</div>
      </td>
      <td align="right" style="${FONT}color:#ffffff;font-size:12px;opacity:.9;">${T('Tareekh', 'Date')}<br><b style="font-size:13px;">${today}</b></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:24px 28px 8px;${FONT}font-size:14px;line-height:1.6;color:${C.ink};">
    ${T(`Assalam o Alaikum <b>${name}</b>,`, `Dear <b>${name}</b>,`)}<br>
    ${T('Aap ke aur mere darmiyan len den ki tafseel neeche hai.', 'Please find below the details of the amounts between us.')}
  </td></tr>
  <tr><td style="padding:8px 28px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-radius:10px;background:${C.soft};"><tr>
      <td style="padding:16px 18px;${FONT}">
        <div style="font-size:12px;color:${C.muted};">${totalLabel}</div>
        <div style="font-size:26px;font-weight:700;color:${totalColor};margin-top:2px;">${m(net)}</div>
      </td>
      <td align="right" style="padding:16px 18px;${FONT}font-size:12px;color:${C.muted};">${sorted.length} ${T('hisaab', sorted.length === 1 ? 'item' : 'items')}<br>${T('Tak', 'As of')} ${today}</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:14px 28px 8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${loans}</table>
  </td></tr>
  <tr><td style="padding:18px 28px 24px;${FONT}font-size:13px;line-height:1.6;color:${C.ink};">
    ${T('Agar kisi raqam mein farq ho to is email ka jawab de kar bata dein.', 'If anything looks different, simply reply to this email.')}<br><br>
    ${T('Shukriya,', 'Kind regards,')}<br><b>${owner}</b>
  </td></tr>
  <tr><td style="border-top:1px solid ${C.line};background:${C.soft};padding:12px 28px;${FONT}font-size:11px;color:${C.muted};">
    ${T(`${owner} ne yeh statement Money Manager se bheja hai.`, `Sent by ${owner} with Money Manager.`)}
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
