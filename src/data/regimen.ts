import type { Constitution, FoodReference, Grade } from '../domain/types'
import { findPortionPreset } from './portionPresets'
import nutritionCacheData from './nutrition-cache.json'
import colonotoniaData from './colonotonia-guide.json'
import cholecystotoniaData from './cholecystotonia-guide.json'
import gastrotoniaData from './gastrotonia-guide.json'
import pancreotoniaData from './pancreotonia-guide.json'
import hepatotoniaData from './hepatotonia-guide.json'
import pulmotoniaData from './pulmotonia-guide.json'
import renotoniaData from './renotonia-guide.json'
import vesicotoniaData from './vesicotonia-guide.json'

export interface RegimenEntry {
  id: string
  constitution: Constitution
  category: string
  name: string
  aliases: string[]
  grade: Grade
  score: number
  recordable: boolean
  sourceUrl: string
  sourceAccessedAt: string
  dataVersion: string
  reviewStatus: 'source-extracted-unverified'
}

const asEntries = (data: unknown) => data as RegimenEntry[]
interface NutritionCacheItem { id: string; name: string; kcalPer100g: number | null; sourceName?: string }
const nutritionItems = (nutritionCacheData as { items?: NutritionCacheItem[] }).items ?? []

function normalizedFoodName(name: string) {
  return name.normalize('NFKC').replace(/[\s·,()]/g, '').toLocaleLowerCase('ko-KR')
}

function findNutrition(names: readonly string[]) {
  const candidates = names.map(normalizedFoodName)
  return nutritionItems.find((item) => item.kcalPer100g && candidates.some((name) => normalizedFoodName(item.name) === name))
    ?? nutritionItems.find((item) => item.kcalPer100g && candidates.some((name) => normalizedFoodName(item.name).includes(name) || name.includes(normalizedFoodName(item.name))))
}
export const PULMOTONIA_GUIDE = asEntries(pulmotoniaData)
export const HEPATOTONIA_GUIDE = asEntries(hepatotoniaData)
export const CHOLECYSTOTONIA_GUIDE = asEntries(cholecystotoniaData)
export const GASTROTONIA_GUIDE = asEntries(gastrotoniaData)
export const PANCREOTONIA_GUIDE = asEntries(pancreotoniaData)
export const COLONOTONIA_GUIDE = asEntries(colonotoniaData)
export const RENOTONIA_GUIDE = asEntries(renotoniaData)
export const VESICOTONIA_GUIDE = asEntries(vesicotoniaData)

function aliasesFromName(name: string) {
  return [...new Set(name.split(/[\/()]/).map((item) => item.replace(/[A-Za-z]/g, '').trim()).filter((item) => item.length > 1 && item !== name))]
}

function toRecordFoods(entries: RegimenEntry[]): FoodReference[] {
  return entries.filter((item) => item.recordable).map((item) => {
    const aliases = [...item.aliases, ...aliasesFromName(item.name)]
    const portion = findPortionPreset([item.name, ...aliases])
    const nutrition = findNutrition([item.name, ...aliases])
    return {
      id: item.id, name: item.name, category: item.category, aliases,
      suitability: { [item.constitution]: item.grade },
      kcalPer100g: nutrition?.kcalPer100g ?? portion?.kcalPer100g,
      nutritionSource: nutrition ? `${nutrition.sourceName || '공공데이터포털'} 영양 API 캐시` : portion ? '앱 기본 중량 데이터' : undefined,
      nutritionFoodId: nutrition?.id,
      allowedUnits: portion ? ['GRAM', portion.unit] : ['GRAM', 'PIECE'],
      servingOptions: portion ? [...portion.options] : undefined,
      sourceUrls: { 목양: item.sourceUrl, 목음: item.sourceUrl, 토양: item.sourceUrl, 토음: item.sourceUrl, 금양: item.sourceUrl, 금음: item.sourceUrl, 수양: item.sourceUrl, 수음: item.sourceUrl },
      sourceAccessedAt: item.sourceAccessedAt,
    }
  })
}

export const PULMOTONIA_RECORD_FOODS = toRecordFoods(PULMOTONIA_GUIDE)
export const HEPATOTONIA_RECORD_FOODS = toRecordFoods(HEPATOTONIA_GUIDE)
export const CHOLECYSTOTONIA_RECORD_FOODS = toRecordFoods(CHOLECYSTOTONIA_GUIDE)
export const GASTROTONIA_RECORD_FOODS = toRecordFoods(GASTROTONIA_GUIDE)
export const PANCREOTONIA_RECORD_FOODS = toRecordFoods(PANCREOTONIA_GUIDE)
export const COLONOTONIA_RECORD_FOODS = toRecordFoods(COLONOTONIA_GUIDE)
export const RENOTONIA_RECORD_FOODS = toRecordFoods(RENOTONIA_GUIDE)
export const VESICOTONIA_RECORD_FOODS = toRecordFoods(VESICOTONIA_GUIDE)

export const FULL_REGIMEN_BY_CONSTITUTION: Record<Constitution, RegimenEntry[]> = { 목양: HEPATOTONIA_GUIDE, 목음: CHOLECYSTOTONIA_GUIDE, 토양: PANCREOTONIA_GUIDE, 토음: GASTROTONIA_GUIDE, 금양: PULMOTONIA_GUIDE, 금음: COLONOTONIA_GUIDE, 수양: RENOTONIA_GUIDE, 수음: VESICOTONIA_GUIDE }
export const RECORD_FOODS_BY_CONSTITUTION: Record<Constitution, FoodReference[]> = { 목양: HEPATOTONIA_RECORD_FOODS, 목음: CHOLECYSTOTONIA_RECORD_FOODS, 토양: PANCREOTONIA_RECORD_FOODS, 토음: GASTROTONIA_RECORD_FOODS, 금양: PULMOTONIA_RECORD_FOODS, 금음: COLONOTONIA_RECORD_FOODS, 수양: RENOTONIA_RECORD_FOODS, 수음: VESICOTONIA_RECORD_FOODS }

function sharedFoodKey(name: string) {
  return name.normalize('NFKC').replace(/[\s·,()]/g, '').toLocaleLowerCase('ko-KR')
}

export const SHARED_FOOD_REFERENCES: FoodReference[] = [...Object.entries(RECORD_FOODS_BY_CONSTITUTION).reduce((index, [constitution, foods]) => {
  for (const food of foods) {
    const key = sharedFoodKey(food.name)
    const current = index.get(key)
    if (current) {
      current.suitability[constitution as Constitution] = food.suitability[constitution as Constitution]
      current.aliases = [...new Set([...current.aliases, ...food.aliases])]
      current.sourceUrls = { ...current.sourceUrls, [constitution]: food.sourceUrls[constitution as Constitution] }
    } else {
      index.set(key, { ...food, id: `shared-${key}`, suitability: { ...food.suitability }, aliases: [...food.aliases], sourceUrls: { ...food.sourceUrls } })
    }
  }
  return index
}, new Map<string, FoodReference>()).values()]

const framing = '아래 내용은 출처가 설명하는 8체질 전통 이론상의 경향을 완화해 요약한 것으로, 성격 검사·의학적 진단·치료 지침이 아닙니다.'
export const PROFILE_BY_CONSTITUTION: Record<Constitution, { title: string; framing: string; temperament: readonly string[]; body: readonly string[]; sourceUrl: string }> = {
  목양: { title: '목양체질', framing, temperament: ['평소 말수가 적고 차분한 경향으로 출처에서 소개됩니다.', '활동 의욕이나 표현 방식에는 개인차가 크며 체질만으로 성격을 단정하지 않습니다.'], body: ['전통 이론에서는 간·담이 강하고 폐·대장이 약한 체질로 설명합니다.', '출처는 땀과 온수욕·등산에 관한 생활 경향을 언급하지만 개인의 상태를 대신 판단하지 않습니다.'], sourceUrl: 'https://irehclinic.com/8constitution/hepatotonia' },
  목음: { title: '목음체질', framing, temperament: ['감정적 자극에 민감하고 반응이 빠른 경향으로 소개됩니다.', '급한 면이 있을 수 있다는 설명이 있지만 개인의 실제 성격을 단정하지 않습니다.'], body: ['전통 이론에서는 담·간이 강하고 대장·폐가 약한 체질로 설명합니다.', '출처는 복부 보온과 음주 주의에 관한 생활 경향을 언급하지만 개인의 상태를 대신 판단하지 않습니다.'], sourceUrl: 'https://irehclinic.com/8constitution/cholecystotonia' },
  토양: { title: '토양체질', framing, temperament: ['빠르게 판단하고 활동하는 것을 선호하며 주도력이 강한 경향으로 소개됩니다.', '서두르기 쉬운 성향으로 설명되지만 개인차가 큽니다.'], body: ['전통 이론에서는 췌장·위장이 강하고 신장·방광이 약한 체질로 설명합니다.', '출처는 여유 있는 생활 리듬을 언급하지만 개인의 상태를 대신 판단하지 않습니다.'], sourceUrl: 'https://irehclinic.com/8constitution/pancreotonia' },
  토음: { title: '토음체질', framing, temperament: ['출처는 비교적 잔병이 적고 병원 방문을 선호하지 않는 경향으로 소개합니다.', '개인의 실제 성향이나 의료 이용 방식을 체질만으로 단정하지 않습니다.'], body: ['전통 이론에서는 위장·췌장이 강하고 방광·신장이 약한 체질로 설명합니다.', '출처는 신선하고 시원한 음식에 관한 섭생 경향을 언급하지만 개인의 상태를 대신 판단하지 않습니다.'], sourceUrl: 'https://irehclinic.com/8constitution/gastrotonia' },
  금양: { title: '금양체질', framing, temperament: ['자신을 드러내기보다 독창적인 방식과 새로운 아이디어를 선호하는 경향으로 설명됩니다.', '모방보다는 창의성을 중시하는 성향으로 소개됩니다.'], body: ['전통 이론에서는 폐·대장 기능이 강하고 간·담 기능이 약한 체질로 설명합니다.', '출처는 푸른 채소와 바다생선을 중심으로 한 섭생을 제시하지만 개인의 상태를 대신 판단하지 않습니다.'], sourceUrl: 'https://irehclinic.com/8constitution/pulmotonia' },
  금음: { title: '금음체질', framing, temperament: ['출처는 감정적 긴장, 특히 크게 화내는 상황을 주의하는 경향으로 설명합니다.', '개인의 실제 성격을 단정할 수 있는 기준은 아닙니다.'], body: ['전통 이론에서는 대장·폐가 강하고 담·간이 약한 체질로 설명합니다.', '출처는 몸을 시원하게 유지하는 생활 경향을 언급하지만 개인의 건강 상태를 대신 판단하지 않습니다.'], sourceUrl: 'https://irehclinic.com/8constitution/colonotonia' },
  수양: { title: '수양체질', framing, temperament: ['세밀하고 조직적이며 확인을 중시하는 경향으로 소개됩니다.', '운동 감각이 발달한 편으로 설명되지만 개인차가 큽니다.'], body: ['전통 이론에서는 신장·방광이 강하고 췌장·위장이 약한 체질로 설명합니다.', '출처는 계절과 땀에 따른 생활 경향을 언급하지만 개인의 상태를 대신 판단하지 않습니다.'], sourceUrl: 'https://irehclinic.com/8constitution/renotonia' },
  수음: { title: '수음체질', framing, temperament: ['출처에는 구체적인 성격 경향보다 식사량과 소화 관련 생활 특징이 중심으로 제시됩니다.', '성격을 체질만으로 단정하지 않습니다.'], body: ['전통 이론에서는 방광·신장이 강하고 위장·췌장이 약한 체질로 설명합니다.', '출처는 적은 양과 따뜻한 음식에 관한 섭생 경향을 언급하지만 개인의 상태를 대신 판단하지 않습니다.'], sourceUrl: 'https://irehclinic.com/8constitution/vesicotonia' },
}
