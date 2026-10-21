import type { Constitution, FoodReference, Grade, MealEntry, ProfileConstitution } from './types'

export const GRADE_META: Record<Grade, { score: number; label: string }> = {
  OO: { score: 100, label: '가장 높은 적합 등급' },
  O: { score: 75, label: '적합 등급' },
  '△': { score: 50, label: '잦은 섭취 주의' },
  X: { score: 25, label: '주의' },
  XX: { score: 0, label: '가장 강한 주의 등급' },
}

export function getGrade(food: FoodReference, constitution: ProfileConstitution) {
  if (constitution === '체질 모름') return undefined
  return food.suitability[constitution]
}

export function calculateFoodKcal(food: FoodReference | undefined, grams: number | undefined) {
  if (!food?.kcalPer100g || typeof grams !== 'number' || !Number.isFinite(grams) || grams <= 0) return null
  return Math.round((food.kcalPer100g * grams) / 100)
}

export function calculateMealSummary(
  meal: MealEntry,
  constitution: ProfileConstitution,
  references: FoodReference[],
) {
  let kcal = 0
  let kcalMissing = 0
  const scores: number[] = []
  const warningFoods: Array<{ name: string; grade: Grade }> = []
  for (const selected of meal.foods) {
    const reference = references.find((item) => item.id === selected.foodId)
    if (!reference) {
      kcalMissing += 1
      continue
    }
    const grade = getGrade(reference, constitution)
    if (grade) {
      scores.push(GRADE_META[grade].score)
      if (grade === 'X' || grade === 'XX') warningFoods.push({ name: selected.name, grade })
    }
    const itemKcal = calculateFoodKcal(reference, selected.resolvedGrams)
    if (itemKcal === null) kcalMissing += 1
    else kcal += itemKcal
  }
  return {
    kcal,
    kcalMissing,
    score: scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null,
    warningFoods,
  }
}

export function getSharedFoods(
  first: Constitution,
  second: Constitution,
  references: FoodReference[],
) {
  return references
    .flatMap((food) => {
      const firstGrade = getGrade(food, first)
      const secondGrade = getGrade(food, second)
      if (!firstGrade || !secondGrade) return []
      return [{
        food,
        firstGrade,
        secondGrade,
        sharedScore: Math.min(GRADE_META[firstGrade].score, GRADE_META[secondGrade].score),
        scoreSum: GRADE_META[firstGrade].score + GRADE_META[secondGrade].score,
      }]
    })
    .filter(({ firstGrade, secondGrade }) => !['X', 'XX'].includes(firstGrade) && !['X', 'XX'].includes(secondGrade))
    .sort((a, b) => b.sharedScore - a.sharedScore || b.scoreSum - a.scoreSum || a.food.name.localeCompare(b.food.name, 'ko'))
}
