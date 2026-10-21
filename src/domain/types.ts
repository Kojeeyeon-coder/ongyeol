export const CONSTITUTIONS = ['목양', '목음', '토양', '토음', '금양', '금음', '수양', '수음'] as const
export type Constitution = (typeof CONSTITUTIONS)[number]
export const PROFILE_CONSTITUTIONS = [...CONSTITUTIONS, '체질 모름'] as const
export type ProfileConstitution = (typeof PROFILE_CONSTITUTIONS)[number]

export const GRADES = ['OO', 'O', '△', 'X', 'XX'] as const
export type Grade = (typeof GRADES)[number]
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
export type FoodUnit = 'GRAM' | 'BOWL' | 'PIECE' | 'SERVING'
export type PortionSize = 'SMALL' | 'MEDIUM' | 'LARGE'

export interface ServingOption {
  unit: Exclude<FoodUnit, 'GRAM'>
  size: PortionSize
  label: string
  grams: number
  sourceName: string
  sourceUrl: string
}

export interface UserProfile {
  id: string
  name: string
  constitution: ProfileConstitution
  createdAt: string
  updatedAt: string
}

export interface FoodReference {
  id: string
  name: string
  category: string
  aliases: string[]
  suitability: Partial<Record<ProfileConstitution, Grade>>
  kcalPer100g?: number
  nutritionSource?: string
  nutritionFoodId?: string
  allowedUnits?: FoodUnit[]
  servingOptions?: ServingOption[]
  sourceUrls: Record<Constitution, string>
  sourceAccessedAt: string
}

export interface FoodSelection {
  foodId?: string
  name: string
  quantity: number
  unit: FoodUnit
  unitGrams?: number
  resolvedGrams?: number
  nutritionFoodId?: string
}

export interface MealEntry {
  id: string
  profileId: string
  mealType: MealType
  eatenAt: string
  foods: FoodSelection[]
  note?: string
  photoId?: string
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  activeProfileId: string
  onboardingCompleted: boolean
  updatedAt: string
}
