export function calculateSpentBudget(selections) {
  let spent = 0;
  if (selections.telescope) spent += selections.telescope.price;
  if (selections.mount) spent += selections.mount.price;
  if (selections.camera) spent += selections.camera.price;
  return spent;
}

export function calculateMaxPriceForCategory(category, selections, budget) {
  const spent = calculateSpentBudget(selections);
  const remaining = budget - spent;

  let unselectedCount = 0;
  if (!selections.telescope && category !== 'telescope') unselectedCount++;
  if (!selections.mount && category !== 'mount') unselectedCount++;
  if (!selections.camera && category !== 'camera') unselectedCount++;

  const minReservePerItem = 200;
  return Math.max(0, remaining - unselectedCount * minReservePerItem);
}

/**
 * Calculate the affordable threshold for a category.
 * This is the maximum price an item in this category can have while still
 * leaving room for other selected items and minimum reserves for unselected ones.
 * Excludes the category's own cost from "spent" to avoid double-counting.
 * @param {string} category - 'telescope', 'mount', or 'camera'
 * @param {Object} selections - Current selections object
 * @param {number} budget - Total budget in GBP
 * @returns {number} Maximum affordable price for this category
 */
export function getAffordableThreshold(category, selections, budget) {
  const MIN_RESERVE = 200;
  let spentOnOthers = 0;
  let reserveForUnselectedOthers = 0;

  for (const cat of ['telescope', 'mount', 'camera']) {
    if (cat === category) continue;
    if (selections[cat]) {
      spentOnOthers += selections[cat].price;
    } else {
      reserveForUnselectedOthers += MIN_RESERVE;
    }
  }

  return Math.max(0, budget - spentOnOthers - reserveForUnselectedOthers);
}

export function isWithinSafePayload(telescope, mount, camera) {
  return telescope.specs.weight_kg + camera.specs.weight_kg <= mount.specs.payload_kg;
}

export function buildSummary(telescope, mount, camera, reducerFactor = 1.0) {
  const flEffMm = Math.round(telescope.specs.focal_length_mm * reducerFactor);
  const fEff = Math.round((flEffMm / telescope.specs.aperture_mm) * 10) / 10;

  const sensorWMm = camera.specs.sensor_px_w * camera.specs.pixel_size_um / 1000;
  const sensorHMm = camera.specs.sensor_px_h * camera.specs.pixel_size_um / 1000;

  const fovWDeg = Math.round((57.296 * sensorWMm / flEffMm) * 100) / 100;
  const fovHDeg = Math.round((57.296 * sensorHMm / flEffMm) * 100) / 100;

  const payloadUsedKg = Math.round((telescope.specs.weight_kg + camera.specs.weight_kg) * 100) / 100;
  const capacityKg = mount.specs.payload_kg;
  const utilPct = Math.round(100 * payloadUsedKg / capacityKg);

  let statusColor;
  if (payloadUsedKg > capacityKg) {
    statusColor = 'red';
  } else if (payloadUsedKg >= 0.8 * capacityKg) {
    statusColor = 'yellow';
  } else {
    statusColor = 'green';
  }

  return {
    optics: { flEffMm, fEff },
    sensor: { sensorWMm, sensorHMm },
    fov: { fovWDeg, fovHDeg },
    load: { payloadUsedKg, capacityKg, utilPct, statusColor },
  };
}

export function getLoadWarningText(statusColor) {
  if (statusColor === 'red') return 'Over capacity \u2014 choose a lighter setup or stronger mount.';
  if (statusColor === 'yellow') return 'Close to limit \u2014 consider trimming weight.';
  return '';
}
