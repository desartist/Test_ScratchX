export function buildShareMessage(text, imageUrl) {
  if (!imageUrl) return text;
  return `${text}\n\n📷 View image: ${imageUrl}`;
}
