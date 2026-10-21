import { describe, expect, it } from 'vitest'
import { FOOD_REFERENCES } from '../data/foodReferences'
import { GRADE_META, calculateFoodKcal, getSharedFoods } from './suitability'

describe('적합도 규칙', () => {
  it('등급 점수 매핑을 유지한다', () => {
    expect(GRADE_META.OO.score).toBe(100)
    expect(GRADE_META.O.score).toBe(75)
    expect(GRADE_META['△'].score).toBe(50)
    expect(GRADE_META.X.score).toBe(25)
    expect(GRADE_META.XX.score).toBe(0)
  })

  it('100g 기준 kcal를 섭취량으로 환산한다', () => {
    expect(calculateFoodKcal({ ...FOOD_REFERENCES[0], kcalPer100g: 200 }, 150)).toBe(300)
  })

  it('함께 먹기는 두 체질 모두 OO/O/△인 음식만 반환한다', () => {
    const result = getSharedFoods('목양', '금양', FOOD_REFERENCES)
    expect(result.every(({ firstGrade, secondGrade }) => !['X', 'XX'].includes(firstGrade) && !['X', 'XX'].includes(secondGrade))).toBe(true)
  })
})
