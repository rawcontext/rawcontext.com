/**
 * The address travels from the server to the island reversed, so it never
 * appears in the HTML in a form an address scraper recognises. Reversing is
 * its own inverse, so one function serves both directions.
 */
export const flip = (text: string): string => Array.from(text).reverse().join('');
