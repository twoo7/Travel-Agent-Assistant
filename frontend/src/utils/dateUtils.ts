export function calcNights(checkIn: string, checkOut: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const nights = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / msPerDay
  );
  return Math.max(nights, 1);
}
