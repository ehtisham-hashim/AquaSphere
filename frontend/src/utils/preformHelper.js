/**
 * Preform catalog and recipe reference data for Wadaana OS.
 * Standard weights:
 * - Pure Preform 0.5L (Blue)  = 0.015 kg = 15g per bottle
 * - Pure Preform 1.5L (Blue)  = 0.030 kg = 30g per bottle
 * - Mix Preform 0.5L (Blue)   = 0.013 kg = 13g per bottle
 * - Mix Preform 1.5L (Blue)   = 0.027 kg = 27g per bottle
 * - Pure Preform 0.5L (White) = 0.015 kg = 15g per bottle
 * - Pure Preform 1.5L (White) = 0.030 kg = 30g per bottle
 */

export const PREFORM_CATALOG = [
  {
    id: 'pure_05_blue',
    name: 'Pure Preform 0.5L (Blue)',
    type: 'Pure',
    size: '0.5L',
    color: 'Blue',
    gramsPerBottle: 15,
    kgPerBottle: 0.015,
    bgClass: 'bg-blue-50/80 border-blue-200 text-blue-950',
    badgeTypeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeColorClass: 'bg-blue-600 text-white'
  },
  {
    id: 'pure_15_blue',
    name: 'Pure Preform 1.5L (Blue)',
    type: 'Pure',
    size: '1.5L',
    color: 'Blue',
    gramsPerBottle: 30,
    kgPerBottle: 0.030,
    bgClass: 'bg-blue-50/80 border-blue-200 text-blue-950',
    badgeTypeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeColorClass: 'bg-blue-600 text-white'
  },
  {
    id: 'mix_05_blue',
    name: 'Mix Preform 0.5L (Blue)',
    type: 'Mix',
    size: '0.5L',
    color: 'Blue',
    gramsPerBottle: 13,
    kgPerBottle: 0.013,
    bgClass: 'bg-cyan-50/80 border-cyan-200 text-cyan-950',
    badgeTypeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeColorClass: 'bg-cyan-600 text-white'
  },
  {
    id: 'mix_15_blue',
    name: 'Mix Preform 1.5L (Blue)',
    type: 'Mix',
    size: '1.5L',
    color: 'Blue',
    gramsPerBottle: 27,
    kgPerBottle: 0.027,
    bgClass: 'bg-cyan-50/80 border-cyan-200 text-cyan-950',
    badgeTypeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeColorClass: 'bg-cyan-600 text-white'
  },
  {
    id: 'pure_05_white',
    name: 'Pure Preform 0.5L (White)',
    type: 'Pure',
    size: '0.5L',
    color: 'White',
    gramsPerBottle: 15,
    kgPerBottle: 0.015,
    bgClass: 'bg-slate-50 border-slate-300 text-slate-900',
    badgeTypeClass: 'bg-slate-200 text-slate-800 border-slate-300',
    badgeColorClass: 'bg-white text-slate-800 border border-slate-300'
  },
  {
    id: 'pure_15_white',
    name: 'Pure Preform 1.5L (White)',
    type: 'Pure',
    size: '1.5L',
    color: 'White',
    gramsPerBottle: 30,
    kgPerBottle: 0.030,
    bgClass: 'bg-slate-50 border-slate-300 text-slate-900',
    badgeTypeClass: 'bg-slate-200 text-slate-800 border-slate-300',
    badgeColorClass: 'bg-white text-slate-800 border border-slate-300'
  }
];

/**
 * Resolves a finished good or raw material name to standard preform properties.
 * @param {string} name
 * @returns {object} Preform attributes
 */
export function parsePreformInfo(name = '') {
  const n = String(name).toLowerCase();
  const isMix = n.includes('mix') || n.includes('dasani');
  const type = isMix ? 'Mix' : 'Pure';

  const is15 = n.includes('1.5') || n.includes('1500') || n.includes('1.5l');
  const size = is15 ? '1.5L' : '0.5L';

  const isWhite = n.includes('white') || n.includes('pivrifine');
  const color = isWhite ? 'White' : 'Blue';

  const matched = PREFORM_CATALOG.find(
    p => p.type === type && p.size === size && p.color === color
  ) || PREFORM_CATALOG[0];

  return {
    ...matched,
    rawName: name
  };
}
