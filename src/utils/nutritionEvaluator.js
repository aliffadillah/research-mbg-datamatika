/**
 * Nutrition Evaluator for MBG Program
 * Evaluates detected food totals against AKG lunch standards
 *
 * Energy contributions:
 * - Protein = 4 kcal/gram
 * - Carbohydrates = 4 kcal/gram
 * - Fat = 9 kcal/gram
 *
 * AKG Lunch Standards (30-35% of daily):
 * - Protein: 10-15% of total energy
 * - Fat: 20-30% of total energy
 * - Carbs: 50-65% of total energy
 */

// ── Constants ──────────────────────────────────────────────────────────────────
export const ENERGY_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
}

export const MACRO_STANDARDS = {
  protein: { min: 10, max: 15, label: 'Protein' },
  fat: { min: 20, max: 30, label: 'Lemak' },
  carbs: { min: 50, max: 65, label: 'Karbohidrat' },
}

export const PORTION_PERCENTAGES = {
  besar: { min: 0.30, max: 0.35, label: 'Porsi Besar (30-35% AKG)' },
  kecil: { min: 0.20, max: 0.25, label: 'Porsi Kecil (20-25% AKG)' },
}

/**
 * Calculate energy contribution from macronutrients
 * @param {Object} macros - { protein: grams, carbs: grams, fat: grams }
 * @returns {Object} - { protein_kcal, carbs_kcal, fat_kcal, total_kcal, protein_pct, carbs_pct, fat_pct }
 */
export function calculateEnergyContribution(macros) {
  const protein_kcal = (macros.protein ?? 0) * ENERGY_PER_GRAM.protein
  const carbs_kcal = (macros.carbs ?? 0) * ENERGY_PER_GRAM.carbs
  const fat_kcal = (macros.fat ?? 0) * ENERGY_PER_GRAM.fat
  const total_kcal = protein_kcal + carbs_kcal + fat_kcal

  return {
    protein_kcal,
    carbs_kcal,
    fat_kcal,
    total_kcal: Math.round(total_kcal * 10) / 10,
    protein_pct: total_kcal > 0 ? Math.round((protein_kcal / total_kcal) * 100 * 10) / 10 : 0,
    carbs_pct: total_kcal > 0 ? Math.round((carbs_kcal / total_kcal) * 100 * 10) / 10 : 0,
    fat_pct: total_kcal > 0 ? Math.round((fat_kcal / total_kcal) * 100 * 10) / 10 : 0,
  }
}

/**
 * Evaluate if a macro percentage falls within standard range
 * @param {number} pct - Percentage value
 * @param {Object} standard - { min, max, label }
 * @returns {Object} - { met: boolean, status: string, pct, standard }
 */
export function evaluateMacroStandard(pct, standard) {
  const met = pct >= standard.min && pct <= standard.max
  let status

  if (pct < standard.min) {
    const diff = standard.min - pct
    status = `Kurang ${diff.toFixed(1)}%`
  } else if (pct > standard.max) {
    const diff = pct - standard.max
    status = `Berlebih ${diff.toFixed(1)}%`
  } else {
    status = 'Sesuai'
  }

  return {
    met,
    status,
    pct: Math.round(pct * 10) / 10,
    standard,
  }
}

/**
 * Evaluate macronutrient balance against AKG standards
 * @param {Object} macros - { protein: grams, carbs: grams, fat: grams }
 * @returns {Object} - Evaluation results for each macronutrient
 */
export function evaluateMacroBalance(macros) {
  const energy = calculateEnergyContribution(macros)

  const results = {}
  let allMet = true

  for (const [key, standard] of Object.entries(MACRO_STANDARDS)) {
    const pct = energy[`${key}_pct`]
    const evalResult = evaluateMacroStandard(pct, standard)
    results[key] = {
      ...evalResult,
      grams: macros[key] ?? 0,
      kcal: energy[`${key}_kcal`],
    }
    if (!evalResult.met) allMet = false
  }

  return {
    macros: results,
    energy,
    allMet,
  }
}

/**
 * Calculate AKG lunch target based on daily AKG values
 * @param {Object} dailyAKG - { energy, protein, carbs, fat, fiber }
 * @param {string} portion - 'besar' or 'kecil'
 * @returns {Object} - Target values for lunch
 */
export function calculateLunchTarget(dailyAKG, portion = 'besar') {
  const percentages = PORTION_PERCENTAGES[portion] ?? PORTION_PERCENTAGES.besar
  const avgPct = (percentages.min + percentages.max) / 2

  return {
    energy: Math.round((dailyAKG.energy ?? 0) * avgPct),
    protein: Math.round((dailyAKG.protein ?? 0) * avgPct * 10) / 10,
    carbs: Math.round((dailyAKG.carbs ?? 0) * avgPct * 10) / 10,
    fat: Math.round((dailyAKG.fat ?? 0) * avgPct * 10) / 10,
    fiber: Math.round((dailyAKG.fiber ?? 0) * avgPct * 10) / 10,
    portion_label: percentages.label,
    portion_pct: `${Math.round(percentages.min * 100)}-${Math.round(percentages.max * 100)}%`,
  }
}

/**
 * Evaluate if lunch totals meet AKG portion targets
 * @param {Object} totals - { calories, protein, carbs, fat, fiber }
 * @param {Object} target - Lunch target from calculateLunchTarget
 * @returns {Object} - Per-nutrient evaluation results
 */
export function evaluateAKGCompliance(totals, target) {
  const results = {}
  let allMet = true

  const nutrients = ['energy', 'protein', 'carbs', 'fat', 'fiber']
  const units = { energy: 'kkal', protein: 'g', carbs: 'g', fat: 'g', fiber: 'g' }

  for (const key of nutrients) {
    const actual = totals[`${key === 'energy' ? 'calories' : key}`] ?? 0
    const tgt = target[key] ?? 0
    const pct = tgt > 0 ? (actual / tgt) * 100 : 0

    const met = pct >= 80 && pct <= 120 // 80-120% of target is acceptable

    results[key] = {
      actual: Math.round(actual * 10) / 10,
      target: tgt,
      percentage: Math.round(pct * 10) / 10,
      met,
      unit: units[key],
    }

    if (!met) allMet = false
  }

  return {
    nutrients: results,
    allMet,
    target,
  }
}

/**
 * Main evaluation function - combines all evaluations
 * @param {Object} detectedTotals - { calories, protein, carbs, fat, fiber } from detection
 * @param {Object} dailyAKG - Daily AKG values from database
 * @param {string} portion - 'besar' or 'kecil'
 * @returns {Object} - Complete evaluation result
 */
export function evaluateNutrition(detectedTotals, dailyAKG, portion = 'besar') {
  const macros = {
    protein: detectedTotals.protein ?? 0,
    carbs: detectedTotals.carbs ?? 0,
    fat: detectedTotals.fat ?? 0,
  }

  // 1. Macronutrient balance evaluation
  const macroEvaluation = evaluateMacroBalance(macros)

  // 2. Calculate lunch targets from daily AKG
  const lunchTarget = calculateLunchTarget(dailyAKG, portion)

  // 3. AKG compliance evaluation
  const compliance = evaluateAKGCompliance(detectedTotals, lunchTarget)

  // 4. Final verdict
  const allCompliant = macroEvaluation.allMet && compliance.allMet

  return {
    // Total energy breakdown
    totals: {
      calories: Math.round((detectedTotals.calories ?? 0) * 10) / 10,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      fiber: Math.round((detectedTotals.fiber ?? 0) * 10) / 10,
    },

    // Energy contribution breakdown
    energyContribution: macroEvaluation.energy,

    // Macronutrient balance status
    macroBalance: macroEvaluation.macros,

    // AKG compliance for each nutrient
    compliance: compliance.nutrients,

    // Target used for evaluation
    target: lunchTarget,

    // Final verdict
    compliant: allCompliant,
    portion,
    summary: allCompliant
      ? 'Menu MBG SESUAI standar AKG'
      : 'Menu MBG BELUM SESUAI standar AKG',
  }
}

/**
 * Format evaluation result for display
 * @param {Object} evaluation - Result from evaluateNutrition
 * @returns {Object} - Formatted strings for UI display
 */
export function formatEvaluation(evaluation) {
  const lines = []

  lines.push(`Total Energi: ${evaluation.totals.calories} kkal`)
  lines.push('')

  for (const [key, data] of Object.entries(evaluation.macroBalance)) {
    const statusText = data.met ? 'Memenuhi Standar' : 'Tidak Memenuhi Standar'
    lines.push(`${data.standard.label}: ${data.grams}g (${data.pct}% energi) → ${statusText}`)
  }

  lines.push('')
  lines.push(`Evaluasi AKG Makan Siang: ${evaluation.compliant ? 'Sesuai' : 'Tidak Sesuai'}`)

  return {
    summary: evaluation.summary,
    compliant: evaluation.compliant,
    formatted: lines.join('\n'),
    components: {
      totalEnergy: `${evaluation.totals.calories} kkal`,
      protein: {
        grams: `${evaluation.macroBalance.protein.grams}g`,
        pct: `${evaluation.macroBalance.protein.pct}%`,
        status: evaluation.macroBalance.protein.met ? 'Memenuhi Standar' : 'Tidak Memenuhi Standar',
        met: evaluation.macroBalance.protein.met,
      },
      fat: {
        grams: `${evaluation.macroBalance.fat.grams}g`,
        pct: `${evaluation.macroBalance.fat.pct}%`,
        status: evaluation.macroBalance.fat.met ? 'Memenuhi Standar' : 'Tidak Memenuhi Standar',
        met: evaluation.macroBalance.fat.met,
      },
      carbs: {
        grams: `${evaluation.macroBalance.carbs.grams}g`,
        pct: `${evaluation.macroBalance.carbs.pct}%`,
        status: evaluation.macroBalance.carbs.met ? 'Memenuhi Standar' : 'Tidak Memenuhi Standar',
        met: evaluation.macroBalance.carbs.met,
      },
    },
  }
}