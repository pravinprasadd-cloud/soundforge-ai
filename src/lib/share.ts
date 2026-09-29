export function shareToWhatsApp(title: string, lines: string[]) {
  const body = `*${title}*\n\n${lines.join('\n')}`;
  const url = `https://wa.me/?text=${encodeURIComponent(body)}`;
  window.open(url, '_blank');
}