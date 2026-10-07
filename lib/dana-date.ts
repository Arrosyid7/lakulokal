export function formatDanaValidUpTo(date = new Date(Date.now() + 15 * 60 * 1000)) {
  const jakartaDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return `${jakartaDate.toISOString().slice(0, 19)}+07:00`;
}
