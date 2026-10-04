// ملف تقويم iCalendar (RFC 5545) لموعد واحد — يفتحه تقويم iOS وGoogle وOutlook
const esc = (v: string) =>
  v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// الأسطر الأطول من 75 بايت تُطوى بسطر يبدأ بمسافة (مطلب RFC)
function fold(line: string): string {
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > 74) {
      out.push(cur);
      cur = ' ' + ch;
      bytes = 1 + b;
    } else {
      cur += ch;
      bytes += b;
    }
  }
  out.push(cur);
  return out.join('\r\n');
}

export function buildIcs(input: {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string | null;
  url?: string;
  // تنبيه قبل الموعد بدقائق (افتراضيًا ساعتان)
  alarmMinutes?: number;
}): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Salon AI//Booking//AR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${input.uid}@salon-ai.co`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(input.start)}`,
    `DTEND:${stamp(input.end)}`,
    `SUMMARY:${esc(input.summary)}`,
    ...(input.description ? [`DESCRIPTION:${esc(input.description)}`] : []),
    ...(input.location ? [`LOCATION:${esc(input.location)}`] : []),
    ...(input.url ? [`URL:${input.url}`] : []),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(input.summary)}`,
    `TRIGGER:-PT${input.alarmMinutes ?? 120}M`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
