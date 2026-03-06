export const GBP_TO_USD_RATE = 1.27;
export const JSON_FILE_PATH = 'data/products.json';
export const EXAMPLE_IMAGES_PATH = 'data/example_images.json';

export const state = {
  productsData: null,
  exampleImagesData: null,
  currentSelections: { telescope: null, mount: null, camera: null },
  lastRandomSelection: null,
  videoReadyStates: { telescope: false, mount: false, camera: false },
  currentCurrency: 'GBP',
  currentBudget: 2500,
};

export function getCurrencySymbol() {
  return state.currentCurrency === 'GBP' ? '\u00a3' : '$';
}

export function convertPrice(gbpPrice) {
  if (state.currentCurrency === 'USD') {
    return Math.round(gbpPrice * GBP_TO_USD_RATE * 100) / 100;
  }
  return gbpPrice;
}

export function formatPrice(price) {
  const converted = convertPrice(price);
  const symbol = getCurrencySymbol();
  return `${symbol}${converted.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
