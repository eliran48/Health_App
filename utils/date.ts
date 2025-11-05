export function toLocalISODate(date = new Date()): string {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

export function addHours(timeStr: string, hours: number): string {
  if (!timeStr.includes(':')) return '';
  const [h, m] = timeStr.split(":").map(Number);
  const base = new Date();
  base.setHours(h, m || 0, 0, 0);
  base.setHours(base.getHours() + hours);
  return base.toTimeString().slice(0, 5);
}

export function getWeekStartDate(date: Date): Date {
  const d = new Date(date.valueOf()); // Create a copy to avoid mutation
  const day = d.getDay(); // 0 for Sunday, 1 for Monday
  const diff = d.getDate() - day;
  d.setDate(diff);
  return d;
}
