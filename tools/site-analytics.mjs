const analyticsScript = '<script src="../../analytics.js" defer></script>';

// Keep personal-site analytics in the exported wrapper, outside the app source.
export function addSiteAnalytics(html) {
  if (!/<\/head\s*>/i.test(html)) throw new Error('The export has no closing head tag.');
  if (html.includes(analyticsScript)) return html;
  return html.replace(/([ \t]*)<\/head\s*>/i,
    (_, indent) => `${indent}  ${analyticsScript}\n${indent}</head>`);
}
