import type { FoodReference } from '../domain/types'

const ACCESSED = '2026-10-20'
const SOURCE_URLS = {
  목양: 'https://irehclinic.com/hepatotonia', 목음: 'https://irehclinic.com/cholecystotonia',
  토양: 'https://irehclinic.com/pancreotonia', 토음: 'https://irehclinic.com/gastrotonia',
  금양: 'https://irehclinic.com/pulmotonia', 금음: 'https://irehclinic.com/colonotonia',
  수양: 'https://irehclinic.com/renotonia', 수음: 'https://irehclinic.com/vesicotonia',
} as const

export const FOOD_REFERENCES: FoodReference[] = [
  {
    id: 'beef', name: '쇠고기', category: '동물성단백질', aliases: ['소고기'], kcalPer100g: 250,
    suitability: { 목양: 'OO', 목음: 'OO', 토양: 'OO', 토음: '△', 금양: 'XX', 금음: 'XX', 수양: '△', 수음: 'OO' },
    sourceUrls: SOURCE_URLS, sourceAccessedAt: ACCESSED,
  },
  {
    id: 'pork', name: '돼지고기', category: '동물성단백질', aliases: [], kcalPer100g: 242,
    suitability: { 목양: '△', 목음: 'OO', 토양: 'OO', 토음: 'OO', 금양: 'XX', 금음: 'XX', 수양: 'XX', 수음: 'XX' },
    sourceUrls: SOURCE_URLS, sourceAccessedAt: ACCESSED,
  },
  {
    id: 'chicken', name: '닭고기', category: '동물성단백질', aliases: ['오리고기'], kcalPer100g: 165,
    suitability: { 목양: 'O', 목음: '△', 토양: 'XX', 토음: 'XX', 금양: 'XX', 금음: 'XX', 수양: 'OO', 수음: 'OO' },
    sourceUrls: SOURCE_URLS, sourceAccessedAt: ACCESSED,
  },
  {
    id: 'warm-milk', name: '우유·유제품(따뜻하게)', category: '동물성단백질', aliases: ['따뜻한 우유'], kcalPer100g: 61,
    suitability: { 목양: 'O', 목음: 'O', 토양: '△', 토음: '△', 금양: 'XX', 금음: 'XX', 수양: '△', 수음: '△' },
    sourceUrls: SOURCE_URLS, sourceAccessedAt: ACCESSED,
  },
  {
    id: 'egg-white', name: '계란흰자', category: '동물성단백질', aliases: ['달걀흰자'], kcalPer100g: 52,
    suitability: { 목양: 'O', 목음: 'O', 토양: 'O', 토음: 'O', 금양: 'O', 금음: 'O', 수양: '△', 수음: '△' },
    sourceUrls: SOURCE_URLS, sourceAccessedAt: ACCESSED,
  },
  {
    id: 'sea-fish', name: '대부분의 바다생선', category: '동물성단백질', aliases: ['바다생선'], kcalPer100g: 140,
    suitability: { 목양: 'XX', 목음: 'XX', 토양: 'O', 토음: 'O', 금양: 'OO', 금음: 'OO', 수양: '△', 수음: 'X' },
    sourceUrls: SOURCE_URLS, sourceAccessedAt: ACCESSED,
  },
  {
    id: 'white-rice', name: '쌀(백미)', category: '탄수화물(곡류)', aliases: ['쌀', '백미', '밥', '흰밥'], kcalPer100g: 130,
    allowedUnits: ['GRAM', 'BOWL'],
    suitability: { 목양: 'O', 목음: 'O', 토양: 'O', 토음: 'O', 금양: 'OO', 금음: 'OO', 수양: 'O', 수음: 'O' },
    sourceUrls: SOURCE_URLS, sourceAccessedAt: ACCESSED,
  },
  {
    id: 'brown-rice', name: '현미', category: '탄수화물(곡류)', aliases: [], kcalPer100g: 123,
    suitability: { 목양: 'O', 목음: '△', 토양: 'XX', 토음: 'XX', 금양: 'X', 금음: 'X', 수양: 'OO', 수음: 'OO' },
    sourceUrls: SOURCE_URLS, sourceAccessedAt: ACCESSED,
  },
  {
    id: 'barley', name: '보리', category: '탄수화물(곡류)', aliases: [], kcalPer100g: 123,
    suitability: { 목양: '△', 목음: '△', 토양: 'O', 토음: 'O', 금양: '△', 금음: '△', 수양: 'X', 수음: 'XX' },
    sourceUrls: SOURCE_URLS, sourceAccessedAt: ACCESSED,
  },
  {
    id: 'apple', name: '사과', category: '과일', aliases: ['애플', 'apple'],
    allowedUnits: ['GRAM', 'PIECE'],
    suitability: { 목양: 'O', 목음: '△', 토양: 'XX', 토음: 'XX', 금양: 'XX', 금음: 'X', 수양: 'OO', 수음: 'OO' },
    sourceUrls: SOURCE_URLS, sourceAccessedAt: ACCESSED,
  },
]

export const DATA_NOTICE = '화면·계산 검증용 제한 데이터 · 전체 표 등록 전 사용 허가 및 전문가 검수 필요'
