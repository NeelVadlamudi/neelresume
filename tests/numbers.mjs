export function extractNumbers(text) {
  return text.match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?%?\+?|\d+(?:\.\d+)?%?\+?/g) || [];
}
