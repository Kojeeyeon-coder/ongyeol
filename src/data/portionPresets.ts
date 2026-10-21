import type { FoodUnit, ServingOption } from '../domain/types'

export interface PortionPreset {
  matchNames: readonly string[]
  kcalPer100g?: number
  unit: Exclude<FoodUnit, 'GRAM'>
  options: readonly ServingOption[]
}

const MFDS_NQ = '식품의약품안전처 영양지수 교육자료'
const K_FIND = '식품의약품안전처 K-FIND 식품영양성분 DB'

export const PORTION_PRESETS: readonly PortionPreset[] = [
  {
    matchNames: ['사과', '애플', 'apple'], kcalPer100g: 52, unit: 'PIECE',
    options: [
      { unit: 'PIECE', size: 'SMALL', label: '작음', grams: 160, sourceName: `${MFDS_NQ} 기준의 80% 추정`, sourceUrl: 'https://various.foodsafetykorea.go.kr/nq/data/adult_guidebook.pdf' },
      { unit: 'PIECE', size: 'MEDIUM', label: '보통', grams: 200, sourceName: `${MFDS_NQ} 사과 1/2개=100g에서 환산`, sourceUrl: 'https://various.foodsafetykorea.go.kr/nq/data/adult_guidebook.pdf' },
      { unit: 'PIECE', size: 'LARGE', label: '큼', grams: 240, sourceName: `${MFDS_NQ} 기준의 120% 추정`, sourceUrl: 'https://various.foodsafetykorea.go.kr/nq/data/adult_guidebook.pdf' },
    ],
  },
  {
    matchNames: ['계란', '달걀', '삶은달걀', '계란흰자', '달걀흰자'], kcalPer100g: 145, unit: 'PIECE',
    options: [
      { unit: 'PIECE', size: 'SMALL', label: '작음', grams: 48, sourceName: `${MFDS_NQ} 기준의 80% 추정`, sourceUrl: 'https://various.foodsafetykorea.go.kr/nq/data/adult_guidebook.pdf' },
      { unit: 'PIECE', size: 'MEDIUM', label: '보통', grams: 60, sourceName: `${MFDS_NQ} 달걀 1개=60g`, sourceUrl: 'https://various.foodsafetykorea.go.kr/nq/data/adult_guidebook.pdf' },
      { unit: 'PIECE', size: 'LARGE', label: '큼', grams: 72, sourceName: `${MFDS_NQ} 기준의 120% 추정`, sourceUrl: 'https://various.foodsafetykorea.go.kr/nq/data/adult_guidebook.pdf' },
    ],
  },
  {
    matchNames: ['쌀밥', '밥', '흰밥', '쌀(백미)', '백미'], kcalPer100g: 166, unit: 'BOWL',
    options: [
      { unit: 'BOWL', size: 'SMALL', label: '작은 공기', grams: 168, sourceName: `${MFDS_NQ} 기준의 80% 추정`, sourceUrl: 'https://various.foodsafetykorea.go.kr/nq/ebook/youth/youth_balance.pdf' },
      { unit: 'BOWL', size: 'MEDIUM', label: '보통 공기', grams: 210, sourceName: `${MFDS_NQ} 밥 1공기=210g`, sourceUrl: 'https://various.foodsafetykorea.go.kr/nq/ebook/youth/youth_balance.pdf' },
      { unit: 'BOWL', size: 'LARGE', label: '큰 공기', grams: 252, sourceName: `${MFDS_NQ} 기준의 120% 추정`, sourceUrl: 'https://various.foodsafetykorea.go.kr/nq/ebook/youth/youth_balance.pdf' },
    ],
  },
  {
    matchNames: ['오이', '오이, 개량종, 생것'], kcalPer100g: 12, unit: 'PIECE',
    options: [
      { unit: 'PIECE', size: 'SMALL', label: '작음', grams: 160, sourceName: `${K_FIND} 열량 · 보통 1개 200g의 80% 추정`, sourceUrl: 'https://www.foodsafetykorea.go.kr/portal/healthyfoodlife/foodnutrient/searchDetail.do?food_cd=100106013300100001&search_name=%EC%98%A4%EC%9D%B4' },
      { unit: 'PIECE', size: 'MEDIUM', label: '보통', grams: 200, sourceName: `${K_FIND} 열량 · 보통 1개 중량은 앱 추정`, sourceUrl: 'https://www.foodsafetykorea.go.kr/portal/healthyfoodlife/foodnutrient/searchDetail.do?food_cd=100106013300100001&search_name=%EC%98%A4%EC%9D%B4' },
      { unit: 'PIECE', size: 'LARGE', label: '큼', grams: 240, sourceName: `${K_FIND} 열량 · 보통 1개 200g의 120% 추정`, sourceUrl: 'https://www.foodsafetykorea.go.kr/portal/healthyfoodlife/foodnutrient/searchDetail.do?food_cd=100106013300100001&search_name=%EC%98%A4%EC%9D%B4' },
    ],
  },
]

export const PORTION_DATA_NOTICE = `${K_FIND}와 공공데이터포털 영양 DB를 기준으로 하며, 크기별 작음·큼 값은 보통 중량의 80%·120% 추정값입니다.`

export function findPortionPreset(names: readonly string[]) {
  const normalized = names.map((name) => name.normalize('NFKC').replace(/[\s·,()]/g, '').toLocaleLowerCase('ko-KR'))
  return PORTION_PRESETS.find((preset) => preset.matchNames.some((name) => normalized.includes(name.normalize('NFKC').replace(/[\s·,()]/g, '').toLocaleLowerCase('ko-KR'))))
}
