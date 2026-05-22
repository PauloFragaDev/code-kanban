export const uuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.trunc(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Returns either '#1f2937' (dark gray) or '#ffffff' (white) depending on the
 * relative luminance of the supplied background color so the text is readable.
 * Accepts hex strings like '#84cc16' or '#84CC16'.
 */
export const getContrastTextColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return '#ffffff';
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  // Perceived luminance (rec. 601). 0..1 range.
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1f2937' : '#ffffff';
};
