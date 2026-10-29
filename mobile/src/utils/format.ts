/** Shared formatting. Indian digit grouping is done by hand so output is identical on every JS engine. */

export function groupIndian(n: number): string {
  const [whole, frac] = Math.abs(n).toFixed(2).split('.');
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  const sign = n < 0 ? '-' : '';
  return frac === '00' ? sign + grouped : `${sign}${grouped}.${frac}`;
}

/** `₹1,23,456`, or `₹499.50` when there are paise. Accepts API strings like "500.00". */
export function formatInr(amount: string | number | null | undefined): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) {
    return '₹0';
  }
  return `₹${groupIndian(n)}`;
}

export function digitsOnly(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '');
}

/** Last 10 digits, so +91 / 0 prefixes are dropped. */
export function tenDigits(phone: string | null | undefined): string {
  return digitsOnly(phone).slice(-10);
}

/** `+91 98765 43210`. Returns what it has if the number is short. */
export function formatPhone(phone: string | null | undefined): string {
  const d = tenDigits(phone);
  if (d.length < 10) {
    return d;
  }
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}

/** `+91 98••• ••210`: enough to recognise a customer on a shared screen. */
export function maskPhone(phone: string | null | undefined): string {
  const d = tenDigits(phone);
  if (d.length < 10) {
    return d;
  }
  return `+91 ${d.slice(0, 2)}••• ••${d.slice(7)}`;
}

/** `KL07AB1234` to `KL 07 AB 1234` for display only. */
export function formatPlate(plate: string | null | undefined): string {
  const p = (plate ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const m = p.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/);
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : p;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatTime(d: Date): string {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
}

/** `Today, 2:35 pm` / `Yesterday, 9:05 am` / `3 Oct, 2:35 pm` (add the year when it is not this year). */
export function formatDateTime(iso: string | Date, now: Date = new Date()): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((day(now) - day(d)) / 86400000);
  const time = formatTime(d);
  if (diffDays === 0) {
    return `Today, ${time}`;
  }
  if (diffDays === 1) {
    return `Yesterday, ${time}`;
  }
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? `${date}, ${time}` : `${date} ${d.getFullYear()}, ${time}`;
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
