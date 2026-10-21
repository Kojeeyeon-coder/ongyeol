import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { User } from 'firebase/auth'
import { DATA_NOTICE, FOOD_REFERENCES } from './data/foodReferences'
import { FULL_REGIMEN_BY_CONSTITUTION, PROFILE_BY_CONSTITUTION, RECORD_FOODS_BY_CONSTITUTION, SHARED_FOOD_REFERENCES } from './data/regimen'
import { PORTION_DATA_NOTICE } from './data/portionPresets'
import { PROFILE_CONSTITUTIONS, type FoodUnit, type MealEntry, type MealType, type PortionSize, type ProfileConstitution, type UserProfile } from './domain/types'
import { GRADE_META, calculateFoodKcal, calculateMealSummary, getSharedFoods } from './domain/suitability'
import { deleteMeal, deleteProfile, getAllMeals, getAllProfiles, getPhoto, getSettings, saveMeal, saveProfile, saveSettings } from './storage/db'

type Tab = 'record' | 'guide' | 'together' | 'analysis'
const MEAL_LABELS: Record<MealType, string> = { BREAKFAST: '아침', LUNCH: '점심', DINNER: '저녁', SNACK: '간식' }
const UNIT_LABELS: Record<FoodUnit, string> = { GRAM: 'g', BOWL: '공기', PIECE: '개', SERVING: '인분' }
const ALL_FOOD_REFERENCES = [...FOOD_REFERENCES, ...Object.values(RECORD_FOODS_BY_CONSTITUTION).flat()]

function localDateTimeValue() {
  const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
  return date.toISOString().slice(0, 16)
}

function quantityLabel(quantity: number, unit: FoodUnit, option: { label: string; grams: number } | undefined, gramsPerUnit: number | undefined) {
  if (unit === 'GRAM') return `${quantity}g`
  if (option) return `${option.label} ${quantity}${UNIT_LABELS[unit]} ≈ ${gramsPerUnit}g/${UNIT_LABELS[unit]}`
  return `${quantity}${UNIT_LABELS[unit]} · 직접 입력 ${gramsPerUnit ?? '-'}g/${UNIT_LABELS[unit]}`
}

function createProfile(name: string, constitution: ProfileConstitution): UserProfile {
  const now = new Date().toISOString()
  return { id: crypto.randomUUID(), name: name.trim(), constitution, createdAt: now, updatedAt: now }
}

function GradeBadge({ grade }: { grade?: keyof typeof GRADE_META }) {
  if (!grade) return <span className="grade grade-unknown"><b>정보 없음</b></span>
  return <span className={`grade grade-${grade === '△' ? 'triangle' : grade.toLowerCase()}`}><b>{grade}</b><small>{GRADE_META[grade].score}점</small></span>
}

function Calendar({ profile, meals, selectedDate, onSelect }: { profile: UserProfile; meals: MealEntry[]; selectedDate: string; onSelect: (date: string) => void }) {
  const [visibleMonth, setVisibleMonth] = useState(selectedDate.slice(0, 7))
  useEffect(() => setVisibleMonth(selectedDate.slice(0, 7)), [selectedDate])
  const [year, month] = visibleMonth.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const lastDate = new Date(year, month, 0).getDate()
  const leading = firstDay.getDay()
  const ownMeals = meals.filter((meal) => meal.profileId === profile.id)
  function changeMonth(offset: number) {
    const next = new Date(year, month - 1 + offset, 1)
    setVisibleMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
  }
  function daySummary(day: number) {
    const key = `${visibleMonth}-${String(day).padStart(2, '0')}`
    const dayMeals = ownMeals.filter((meal) => dateKey(new Date(meal.eatenAt)) === key)
    const scores = dayMeals.flatMap((meal) => meal.foods.flatMap((selectedFood) => {
      const reference = ALL_FOOD_REFERENCES.find((food) => food.id === selectedFood.foodId)
      const grade = reference?.suitability[profile.constitution]
      return grade ? [GRADE_META[grade].score] : []
    }))
    return { key, count: dayMeals.length, score: scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null }
  }
  return <section className="calendar card" aria-label="날짜 선택 달력"><div className="calendar-header"><button type="button" onClick={() => changeMonth(-1)} aria-label="이전 달">‹</button><h2>{year}년 {month}월</h2><button type="button" onClick={() => changeMonth(1)} aria-label="다음 달">›</button></div><div className="calendar-weekdays">{['일', '월', '화', '수', '목', '금', '토'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{Array.from({ length: leading }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: lastDate }, (_, index) => { const summary = daySummary(index + 1); return <button type="button" className={`${summary.key === selectedDate ? 'selected' : ''} ${summary.key === dateKey(new Date()) ? 'today' : ''}`} onClick={() => onSelect(summary.key)} key={summary.key}><b>{index + 1}</b>{summary.count > 0 && <small>{summary.count}건 · {summary.score ?? '-'}점</small>}</button> })}</div></section>
}

function ProfileForm({ title, submitLabel = '저장하고 시작하기', initialName = '', initialConstitution = '체질 모름', onSubmit }: { title: string; submitLabel?: string; initialName?: string; initialConstitution?: ProfileConstitution; onSubmit: (name: string, constitution: ProfileConstitution) => Promise<void> }) {
  const [name, setName] = useState(initialName)
  const [constitution, setConstitution] = useState<ProfileConstitution>(initialConstitution)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return setError('사용자 이름을 입력해 주세요.')
    await onSubmit(name, constitution)
  }
  return <form className="stack" onSubmit={submit}>
    <h2>{title}</h2>
    <label>사용자 이름<input value={name} onChange={(event) => setName(event.target.value)} placeholder="이름 또는 별명" /></label>
    <label>전문가에게 안내받은 체질<select value={constitution} onChange={(event) => setConstitution(event.target.value as ProfileConstitution)}>{PROFILE_CONSTITUTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
    {error && <p className="error" role="alert">{error}</p>}
    <button className="primary" type="submit">{submitLabel}</button>
  </form>
}

function Photo({ photoId, alt }: { photoId?: string; alt: string }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!photoId) { setUrl(undefined); return }
    let objectUrl: string | undefined
    getPhoto(photoId).then((blob) => {
      if (!blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [photoId])
  if (!photoId) return <div className="photo-placeholder">사진 없음</div>
  return url ? <img className="meal-photo" src={url} alt={alt} /> : <div className="photo-placeholder">사진 불러오는 중</div>
}

function RecordTab({ profile, meals, onSaved, onDeleted }: { profile: UserProfile; meals: MealEntry[]; onSaved: (meal: MealEntry) => void; onDeleted: (meal: MealEntry) => Promise<void> }) {
  const [mealType, setMealType] = useState<MealType>('BREAKFAST')
  const [eatenAt, setEatenAt] = useState(localDateTimeValue())
  const [selected, setSelected] = useState<string[]>([])
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [units, setUnits] = useState<Record<string, FoodUnit>>({})
  const [unitGrams, setUnitGrams] = useState<Record<string, string>>({})
  const [portionSizes, setPortionSizes] = useState<Record<string, PortionSize>>({})
  const [foodQuery, setFoodQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()))
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<File>()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const ownMeals = useMemo(() => meals.filter((meal) => meal.profileId === profile.id && dateKey(new Date(meal.eatenAt)) === selectedDate).sort((a, b) => b.eatenAt.localeCompare(a.eatenAt)), [meals, profile.id, selectedDate])
  const availableFoods = profile.constitution === '체질 모름' ? FOOD_REFERENCES : RECORD_FOODS_BY_CONSTITUTION[profile.constitution]
  const normalizedQuery = foodQuery.trim().toLocaleLowerCase('ko-KR').replaceAll(' ', '')
  const suggestions = normalizedQuery ? availableFoods.filter((food) => !selected.includes(food.id) && [food.name, ...food.aliases].some((name) => name.toLocaleLowerCase('ko-KR').replaceAll(' ', '').includes(normalizedQuery))).slice(0, 8) : []

  function addFood(id: string) {
    const food = availableFoods.find((item) => item.id === id)!
    const medium = food.servingOptions?.find((item) => item.size === 'MEDIUM')
    const initialUnit = medium?.unit ?? 'GRAM'
    setSelected((current) => current.includes(id) ? current : [...current, id])
    setQuantities((current) => ({ ...current, [id]: current[id] ?? (initialUnit === 'GRAM' ? '100' : '1') }))
    setUnits((current) => ({ ...current, [id]: current[id] ?? initialUnit }))
    if (medium) {
      setPortionSizes((current) => ({ ...current, [id]: 'MEDIUM' }))
      setUnitGrams((current) => ({ ...current, [id]: String(medium.grams) }))
    }
    setFoodQuery('')
  }

  function removeFood(id: string) {
    setSelected((current) => current.filter((item) => item !== id))
  }

  function selectDate(date: string) {
    setSelectedDate(date)
    setEatenAt(`${date}T${eatenAt.slice(11, 16) || '12:00'}`)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!selected.length) return setError('먹은 음식을 하나 이상 선택해 주세요.')
    if (selected.some((id) => !Number.isFinite(Number(quantities[id])) || Number(quantities[id]) <= 0)) return setError('음식별 섭취량을 0보다 크게 입력해 주세요.')
    setSaving(true)
    setError('')
    try {
      const now = new Date().toISOString()
      const meal: MealEntry = {
        id: crypto.randomUUID(), profileId: profile.id, mealType,
        eatenAt: new Date(eatenAt).toISOString(),
        foods: selected.map((id) => {
          const food = availableFoods.find((item) => item.id === id)!
          const unit = units[id] ?? 'GRAM'
          const quantity = Number(quantities[id])
          const option = food.servingOptions?.find((item) => item.unit === unit && item.size === (portionSizes[id] ?? 'MEDIUM'))
          const gramsPerUnit = option?.grams ?? (Number(unitGrams[id]) || undefined)
          return { foodId: id, name: food.name, quantity, unit, unitGrams: unit === 'GRAM' ? undefined : gramsPerUnit, resolvedGrams: unit === 'GRAM' ? quantity : gramsPerUnit ? quantity * gramsPerUnit : undefined }
        }),
        note: note.trim() || undefined, photoId: photo ? crypto.randomUUID() : undefined, createdAt: now, updatedAt: now,
      }
      await saveMeal(meal, photo)
      onSaved(meal)
      setSelected([]); setQuantities({}); setUnits({}); setUnitGrams({}); setPortionSizes({}); setFoodQuery(''); setNote(''); setPhoto(undefined); setEatenAt(localDateTimeValue())
      const input = document.getElementById('meal-photo') as HTMLInputElement | null
      if (input) input.value = ''
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '기록을 저장하지 못했습니다.')
    } finally { setSaving(false) }
  }

  return <section className="record-page"><Calendar profile={profile} meals={meals} selectedDate={selectedDate} onSelect={selectDate} /><div className="page-grid">
    <div>
      <div className="section-heading"><div><span className="eyebrow">{selectedDate} 기록</span><h2>{profile.name}님의 식사를 남겨요</h2></div></div>
      <form className="card stack" onSubmit={submit}>
        <div className="meal-type-grid">{(Object.keys(MEAL_LABELS) as MealType[]).map((type) => <button type="button" className={mealType === type ? 'choice active' : 'choice'} onClick={() => setMealType(type)} key={type}>{MEAL_LABELS[type]}</button>)}</div>
        <div className="form-row"><label>먹은 시각<input required type="datetime-local" value={eatenAt} onChange={(event) => setEatenAt(event.target.value)} /></label><label>식사 사진 <small>(선택)</small><input id="meal-photo" type="file" accept="image/*" capture="environment" onChange={(event) => setPhoto(event.target.files?.[0])} /><span className="field-help">모바일에서는 카메라 촬영 또는 사진 보관함을 선택할 수 있어요.</span></label></div>
        <fieldset><legend>먹은 음식과 양</legend><div className="food-search"><label>음식 검색<input type="search" value={foodQuery} onChange={(event) => setFoodQuery(event.target.value)} placeholder="예: 사과, 쌀, 쇠고기" autoComplete="off" /></label>{normalizedQuery && <div className="suggestions" role="listbox" aria-label="음식 검색 결과">{suggestions.length ? suggestions.map((food) => <button type="button" role="option" key={food.id} onClick={() => addFood(food.id)}><span><b>{food.name}</b><small>{food.category}</small></span><GradeBadge grade={food.suitability[profile.constitution]} /></button>) : <p>등록된 섭생표 음식에서 찾지 못했어요.</p>}</div>}</div><p className="selection-status" aria-live="polite">{selected.length ? `${selected.length}개 음식이 추가되었습니다.` : '검색 결과를 누르면 아래 목록에 추가됩니다.'}</p><div className="selected-foods">{selected.length ? selected.map((id) => {
          const food = availableFoods.find((item) => item.id === id)!
          const unit = units[id] ?? 'GRAM'
          const size = portionSizes[id] ?? 'MEDIUM'
          const options = food.servingOptions?.filter((item) => item.unit === unit) ?? []
          const option = options.find((item) => item.size === size)
          const gramsPerUnit = Number(unitGrams[id]) || option?.grams
          const numericQuantity = Number(quantities[id] ?? (unit === 'GRAM' ? '100' : '1'))
          const resolvedGrams = unit === 'GRAM' ? numericQuantity : gramsPerUnit ? numericQuantity * gramsPerUnit : undefined
          const allowedUnits = food.allowedUnits ?? ['GRAM', 'PIECE']
          const kcal = calculateFoodKcal(food, resolvedGrams)
          return <div className="selected-food" key={id}><div className="selected-food-heading"><span><b>{food.name}</b><small>{food.category}</small></span><GradeBadge grade={food.suitability[profile.constitution]} /><button type="button" onClick={() => removeFood(id)} aria-label={`${food.name} 제거`}>×</button></div><div className="quantity-controls"><label><span>섭취량</span><input type="text" inputMode="decimal" value={quantities[id] ?? (unit === 'GRAM' ? '100' : '1')} onChange={(event) => setQuantities((current) => ({ ...current, [id]: event.target.value.replace(',', '.') }))} /></label><label><span>단위</span><select value={unit} onChange={(event) => { const nextUnit = event.target.value as FoodUnit; const defaultOption = food.servingOptions?.find((item) => item.unit === nextUnit && item.size === 'MEDIUM'); setUnits((current) => ({ ...current, [id]: nextUnit })); setQuantities((current) => ({ ...current, [id]: nextUnit === 'GRAM' ? '100' : '1' })); if (defaultOption) { setPortionSizes((current) => ({ ...current, [id]: 'MEDIUM' })); setUnitGrams((current) => ({ ...current, [id]: String(defaultOption.grams) })) } }}>{allowedUnits.map((item) => <option value={item} key={item}>{UNIT_LABELS[item]}</option>)}</select></label>{unit !== 'GRAM' && <>{options.length > 0 && <label><span>크기</span><select value={size} onChange={(event) => { const nextSize = event.target.value as PortionSize; const nextOption = options.find((item) => item.size === nextSize)!; setPortionSizes((current) => ({ ...current, [id]: nextSize })); setUnitGrams((current) => ({ ...current, [id]: String(nextOption.grams) })) }}>{options.map((item) => <option value={item.size} key={item.size}>{item.label}</option>)}</select></label>}<label><span>1{UNIT_LABELS[unit]} 실제 중량(g)</span><input type="text" inputMode="decimal" value={unitGrams[id] ?? ''} placeholder="직접 입력" onChange={(event) => setUnitGrams((current) => ({ ...current, [id]: event.target.value.replace(',', '.') }))} /></label></>}<div className="quantity-result">{resolvedGrams ? <span><b>{quantityLabel(numericQuantity, unit, option, gramsPerUnit)}</b><br />총 {resolvedGrams}g · {kcal ?? '열량 정보 없음'}{kcal === null ? '' : ' kcal'}{option && <><br /><small>{option.sourceName}</small></>}</span> : `검증된 기준 중량이 없어 실제 g 입력이 필요합니다.`}</div></div></div>
        }) : <div className="empty food-empty">검색 결과에서 먹은 음식을 추가해 주세요.</div>}</div><p className="microcopy">{PORTION_DATA_NOTICE}</p></fieldset>
        <label>메모·코멘트<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="식사 느낌이나 상황을 자유롭게 적어 주세요." rows={3} /></label>
        <p className="microcopy">kcal는 선택한 음식과 입력한 양으로 계산한 예상값입니다. 사진을 자동 분석하지 않습니다.</p>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={saving}>{saving ? '저장 중…' : '식사 기록 저장'}</button>
      </form>
    </div>
    <aside>
      <div className="section-heading"><div><span className="eyebrow">타임라인</span><h2>{selectedDate} 식사</h2></div><span className="count">{ownMeals.length}건</span></div>
      <div className="timeline">{ownMeals.length ? ownMeals.map((meal) => {
        const summary = calculateMealSummary(meal, profile.constitution, ALL_FOOD_REFERENCES)
        return <article className="card meal-card" key={meal.id}><Photo photoId={meal.photoId} alt={`${MEAL_LABELS[meal.mealType]} 식사`} /><div className="meal-content"><div className="meal-meta"><b>{MEAL_LABELS[meal.mealType]}</b><div className="meal-actions"><time>{new Date(meal.eatenAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time><button type="button" onClick={() => { if (confirm('이 식사 기록과 사진을 삭제할까요?')) void onDeleted(meal) }}>삭제</button></div></div><div className="meal-kpis"><strong>{summary.score ?? '-'}점</strong><span>{summary.kcal} kcal{summary.kcalMissing ? ` · ${summary.kcalMissing}개 누락` : ''}</span></div><ul>{meal.foods.map((selectedFood, index) => { const reference = ALL_FOOD_REFERENCES.find((item) => item.id === selectedFood.foodId); const grade = reference && profile.constitution !== '체질 모름' ? reference.suitability[profile.constitution] : undefined; return <li key={`${selectedFood.foodId ?? selectedFood.name}-${index}`}><span>{selectedFood.name} · {selectedFood.quantity}{UNIT_LABELS[selectedFood.unit]}{selectedFood.resolvedGrams && selectedFood.unit !== 'GRAM' ? ` (${selectedFood.resolvedGrams}g)` : ''}</span>{reference && <GradeBadge grade={grade} />}</li> })}</ul>{meal.note && <p className="note">“{meal.note}”</p>}</div></article>
      }) : <div className="empty card"><b>아직 기록이 없어요</b><p>첫 식사 사진과 음식 정보를 남겨 보세요.</p></div>}</div>
    </aside>
  </div></section>
}

function GuideTab({ profile }: { profile: UserProfile }) {
  const [query, setQuery] = useState('')
  const [grade, setGrade] = useState('ALL')
  const [category, setCategory] = useState('ALL')
  if (profile.constitution === '체질 모름') return <section><div className="hero-card"><span className="eyebrow">체질 모름</span><h2>체질을 안내받은 뒤 설정해 주세요</h2><p>앱은 체질을 진단하거나 추천하지 않습니다. 현재도 식사 기록은 남길 수 있으며 적합도 점수는 표시하지 않습니다.</p></div></section>
  const fullGuide = FULL_REGIMEN_BY_CONSTITUTION[profile.constitution]
  const constitutionProfile = PROFILE_BY_CONSTITUTION[profile.constitution]
  if (fullGuide && constitutionProfile) {
    const categories = [...new Set(fullGuide.map((item) => item.category))]
    const entries = fullGuide.filter((item) => `${item.name} ${item.aliases.join(' ')}`.toLocaleLowerCase('ko-KR').includes(query.trim().toLocaleLowerCase('ko-KR')) && (grade === 'ALL' || item.grade === grade) && (category === 'ALL' || item.category === category))
    return <section><div className="constitution-profile hero-card"><span className="eyebrow">{profile.constitution}체질 · 섭생표 안내</span><h2>{constitutionProfile.title} 기본 성향과 특징</h2><p>{constitutionProfile.framing}</p><div className="trait-grid"><article><h3>성향</h3><ul>{constitutionProfile.temperament.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h3>전통 이론상 특징</h3><ul>{constitutionProfile.body.map((item) => <li key={item}>{item}</li>)}</ul></article></div><a href={constitutionProfile.sourceUrl} target="_blank" rel="noreferrer">체질 설명 출처 확인 ↗</a></div><div className="section-heading"><div><span className="eyebrow">전체 섭생표</span><h2>{profile.constitution}체질 {fullGuide.length}개 항목</h2></div><span className="count">검색 결과 {entries.length}개</span></div><div className="guide-filters card"><label>항목 검색<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: 사과, 고등어, 쌀" /></label><label>분류<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="ALL">전체 분류</option>{categories.map((item) => <option value={item} key={item}>{item}</option>)}</select></label><label>등급<select value={grade} onChange={(event) => setGrade(event.target.value)}><option value="ALL">전체 등급</option>{Object.keys(GRADE_META).map((item) => <option key={item}>{item}</option>)}</select></label></div><p className="data-notice">첨부된 이레한의원 {profile.constitution}체질 페이지 원문에서 2026-10-20 추출한 데이터입니다. 전문가 검수 전 참고용이며 의료적 판단이나 섭취 지시가 아닙니다.</p><div className="regimen-table-wrap card"><table className="regimen-table"><thead><tr><th>분류</th><th>음식·항목</th><th>등급·점수</th></tr></thead><tbody>{entries.map((item) => <tr key={item.id}><td>{item.category}</td><td>{item.name}</td><td><GradeBadge grade={item.grade} /></td></tr>)}</tbody></table>{!entries.length && <div className="empty">조건에 맞는 항목이 없습니다.</div>}</div></section>
  }
  const foods = FOOD_REFERENCES.filter((food) => `${food.name} ${food.aliases.join(' ')}`.includes(query) && (grade === 'ALL' || food.suitability[profile.constitution] === grade))
  return <section><div className="hero-card"><span className="eyebrow">{profile.constitution} 섭생표</span><h2>음식별 참고 등급을 확인하세요</h2><p>현재 전체 표 구현은 금양체질부터 진행 중입니다. 다른 체질은 제한된 프로토타입 데이터만 표시합니다.</p></div><div className="toolbar"><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="음식 이름 검색" /><select value={grade} onChange={(event) => setGrade(event.target.value)}><option value="ALL">전체 등급</option>{Object.keys(GRADE_META).map((item) => <option key={item}>{item}</option>)}</select></div><p className="data-notice">{DATA_NOTICE}</p><div className="guide-list">{foods.map((food) => <article className="card guide-row" key={food.id}><div><small>{food.category}</small><h3>{food.name}</h3><a href={food.sourceUrls[profile.constitution]} target="_blank" rel="noreferrer">출처 확인 ↗</a></div><GradeBadge grade={food.suitability[profile.constitution]} /></article>)}</div></section>
}

function TogetherTab({ profiles }: { profiles: UserProfile[] }) {
  const [firstId, setFirstId] = useState(profiles[0]?.id ?? '')
  const [secondId, setSecondId] = useState(profiles[1]?.id ?? '')
  const [category, setCategory] = useState('ALL')
  const [sort, setSort] = useState<'score' | 'category' | 'name'>('score')
  useEffect(() => { if (!profiles.some((item) => item.id === firstId)) setFirstId(profiles[0]?.id ?? ''); if (!profiles.some((item) => item.id === secondId)) setSecondId(profiles[1]?.id ?? '') }, [profiles, firstId, secondId])
  const first = profiles.find((profile) => profile.id === firstId)
  const second = profiles.find((profile) => profile.id === secondId)
  const results = first && second && first.id !== second.id && first.constitution !== '체질 모름' && second.constitution !== '체질 모름' ? getSharedFoods(first.constitution, second.constitution, SHARED_FOOD_REFERENCES) : []
  const categories = [...new Set(results.map((item) => item.food.category))].sort((a, b) => a.localeCompare(b, 'ko'))
  const visibleResults = results.filter((item) => category === 'ALL' || item.food.category === category).sort((a, b) => sort === 'score' ? b.sharedScore - a.sharedScore || b.scoreSum - a.scoreSum || a.food.name.localeCompare(b.food.name, 'ko') : sort === 'category' ? a.food.category.localeCompare(b.food.category, 'ko') || b.sharedScore - a.sharedScore : a.food.name.localeCompare(b.food.name, 'ko'))
  if (profiles.length < 2) return <div className="empty card centered"><h2>사용자 한 명을 더 추가해 주세요</h2><p>두 사용자의 체질을 비교하려면 프로필이 두 개 이상 필요합니다.</p></div>
  return <section><div className="hero-card"><span className="eyebrow">함께 먹기</span><h2>두 사람 모두에게 OO·O·△인 음식</h2><p>한 사람이라도 X·XX 또는 정보 없음이면 결과에서 제외합니다.</p></div><div className="compare-selectors"><label>A 사용자<select value={firstId} onChange={(event) => setFirstId(event.target.value)}>{profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name} · {profile.constitution}</option>)}</select></label><span>＋</span><label>B 사용자<select value={secondId} onChange={(event) => setSecondId(event.target.value)}>{profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name} · {profile.constitution}</option>)}</select></label></div>{firstId === secondId && <p className="error">서로 다른 사용자를 선택해 주세요.</p>}<div className="together-filters card"><label>카테고리<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="ALL">전체 카테고리</option>{categories.map((item) => <option value={item} key={item}>{item}</option>)}</select></label><label>정렬<select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="score">공통 점수 높은 순</option><option value="category">카테고리 순</option><option value="name">음식 이름 순</option></select></label><span>{visibleResults.length}개 음식</span></div><div className="guide-list">{visibleResults.map(({ food, firstGrade, secondGrade, sharedScore }) => <article className="card together-row" key={food.id}><div><small>{food.category}</small><h3>{food.name}</h3><strong>공통 {sharedScore}점</strong></div><div className="people-grades"><span>{first?.name}<GradeBadge grade={firstGrade} /></span><span>{second?.name}<GradeBadge grade={secondGrade} /></span></div></article>)}</div><p className="data-notice">기계적으로 계산한 교집합이며 식단 처방이나 안전 보장을 의미하지 않습니다.</p></section>
}

function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function inPeriod(value: string, anchor: string, mode: 'day' | 'week' | 'month') {
  const date = new Date(value); const base = new Date(`${anchor}T00:00:00`)
  if (mode === 'day') return dateKey(date) === anchor
  if (mode === 'month') return date.getFullYear() === base.getFullYear() && date.getMonth() === base.getMonth()
  const start = new Date(base); const day = (start.getDay() + 6) % 7; start.setDate(start.getDate() - day)
  const end = new Date(start); end.setDate(end.getDate() + 7)
  return date >= start && date < end
}

function AnalysisTab({ profile, meals }: { profile: UserProfile; meals: MealEntry[] }) {
  const [mode, setMode] = useState<'day' | 'week' | 'month'>('day')
  const [anchor, setAnchor] = useState(dateKey(new Date()))
  const filtered = meals.filter((meal) => meal.profileId === profile.id && inPeriod(meal.eatenAt, anchor, mode))
  const summaries = filtered.map((meal) => calculateMealSummary(meal, profile.constitution, ALL_FOOD_REFERENCES))
  const scores = summaries.map((item) => item.score).filter((value): value is number => value !== null)
  const totalKcal = summaries.reduce((sum, item) => sum + item.kcal, 0)
  const recordedDays = new Set(filtered.map((meal) => dateKey(new Date(meal.eatenAt)))).size
  const displayedKcal = mode === 'day' ? totalKcal : recordedDays ? Math.round(totalKcal / recordedDays) : 0
  const missing = summaries.reduce((sum, item) => sum + item.kcalMissing, 0)
  const warnings = summaries.flatMap((item) => item.warningFoods)
  const grades = filtered.flatMap((meal) => meal.foods.flatMap((selected) => {
    const reference = ALL_FOOD_REFERENCES.find((item) => item.id === selected.foodId)
    const grade = reference?.suitability[profile.constitution]
    return grade ? [grade] : []
  }))
  const distribution = (Object.keys(GRADE_META) as Array<keyof typeof GRADE_META>).map((grade) => ({ grade, count: grades.filter((item) => item === grade).length }))
  const maxCount = Math.max(1, ...distribution.map((item) => item.count))
  return <section><div className="hero-card"><span className="eyebrow">섭생 분석</span><h2>{profile.name}님의 기록을 돌아봐요</h2><p>섭생 점수는 음식 선택 건별 등급의 단순 평균이며 섭취량으로 가중하지 않습니다.</p></div><Calendar profile={profile} meals={meals} selectedDate={anchor} onSelect={setAnchor} /><div className="period-controls"><div>{(['day', 'week', 'month'] as const).map((item) => <button className={mode === item ? 'choice active' : 'choice'} onClick={() => setMode(item)} key={item}>{item === 'day' ? '일자' : item === 'week' ? '주간' : '월간'}</button>)}</div><input type="date" value={anchor} onChange={(event) => setAnchor(event.target.value)} /></div><div className="kpi-grid"><article className="kpi"><small>식사 기록</small><strong>{filtered.length}<em>건</em></strong></article><article className="kpi"><small>예상 섭생 점수</small><strong>{scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : '-'}<em>점</em></strong></article><article className="kpi"><small>{mode === 'day' ? '당일 예상 열량' : '일평균 예상 열량'}</small><strong>{displayedKcal}<em>kcal</em></strong>{mode !== 'day' && <span>기록 {recordedDays}일 기준</span>}{missing > 0 && <span>{missing}개 열량 누락</span>}</article></div><div className="analysis-grid"><article className="card"><h3>등급별 섭취 그래프</h3><div className="grade-chart">{distribution.map(({ grade, count }) => <div className="chart-row" key={grade}><GradeBadge grade={grade} /><div className="chart-track" aria-hidden="true"><i className={`bar-${grade === '△' ? 'triangle' : grade.toLowerCase()}`} style={{ width: `${count ? Math.max(8, count / maxCount * 100) : 0}%` }} /></div><b>{count}회 · {grades.length ? Math.round(count / grades.length * 100) : 0}%</b></div>)}</div>{!grades.length && <p className="microcopy">계산할 수 있는 적합도 기록이 없습니다.</p>}</article><article className="card"><h3>X·XX 음식</h3>{warnings.length ? <ul className="warning-list">{warnings.map((item, index) => <li key={`${item.name}-${index}`}><span>{item.name}</span><GradeBadge grade={item.grade} /></li>)}</ul> : <div className="empty"><p>이 기간에는 X·XX 음식이 없습니다.</p></div>}</article></div></section>
}

export default function App({ authUser, onSignOut, onRequestLogin }: { authUser?: User | null; onSignOut?: () => Promise<void>; onRequestLogin?: () => void }) {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState('')
  const [meals, setMeals] = useState<MealEntry[]>([])
  const [tab, setTab] = useState<Tab>('record')
  const [loading, setLoading] = useState(true)
  const [addingProfile, setAddingProfile] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)

  useEffect(() => { Promise.all([getAllProfiles(), getSettings(), getAllMeals()]).then(([storedProfiles, settings, storedMeals]) => { setProfiles(storedProfiles); setMeals(storedMeals); setActiveProfileId(settings?.activeProfileId ?? storedProfiles[0]?.id ?? '') }).finally(() => setLoading(false)) }, [])

  async function addProfile(name: string, constitution: ProfileConstitution) {
    const profile = createProfile(name, constitution)
    await saveProfile(profile)
    const nextSettings = { activeProfileId: profile.id, onboardingCompleted: true, updatedAt: new Date().toISOString() }
    await saveSettings(nextSettings)
    setProfiles((current) => [...current, profile]); setActiveProfileId(profile.id); setAddingProfile(false)
  }

  async function switchProfile(id: string) {
    setActiveProfileId(id)
    await saveSettings({ activeProfileId: id, onboardingCompleted: true, updatedAt: new Date().toISOString() })
  }

  async function updateActiveProfile(name: string, constitution: ProfileConstitution) {
    const current = profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0]
    const updated = { ...current, name: name.trim(), constitution, updatedAt: new Date().toISOString() }
    await saveProfile(updated)
    setProfiles((items) => items.map((item) => item.id === updated.id ? updated : item))
    setEditingProfile(false)
  }

  async function removeActiveProfile() {
    if (profiles.length <= 1 || !confirm('이 사용자와 연결된 모든 식사·사진을 삭제할까요? 복구할 수 없습니다.')) return
    const next = profiles.find((profile) => profile.id !== activeProfileId)!
    await deleteProfile(activeProfileId)
    await saveSettings({ activeProfileId: next.id, onboardingCompleted: true, updatedAt: new Date().toISOString() })
    setProfiles((items) => items.filter((item) => item.id !== activeProfileId))
    setMeals((items) => items.filter((item) => item.profileId !== activeProfileId))
    setActiveProfileId(next.id)
  }

  async function removeMeal(meal: MealEntry) {
    await deleteMeal(meal)
    setMeals((items) => items.filter((item) => item.id !== meal.id))
  }

  if (loading) return <main className="splash">기록을 불러오는 중…</main>
  if (!profiles.length) return <main className="onboarding"><div className="brand-mark">온결</div><div className="onboarding-card"><span className="eyebrow">8체질 식단 일기</span><h1>매일의 식사를<br />차분히 이어 보세요</h1><p>이 앱은 식사 기록용이며 의료 진단·치료·섭취 지침을 제공하지 않습니다. 섭생표는 출처 기반 참고 정보입니다.</p><ProfileForm title="첫 사용자 만들기" onSubmit={addProfile} /></div></main>
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0]
  const nav: Array<{ id: Tab; label: string; icon: string }> = [{ id: 'record', label: '기록', icon: '◷' }, { id: 'guide', label: '섭생표', icon: '☷' }, { id: 'together', label: '함께 먹기', icon: '♧' }, { id: 'analysis', label: '분석', icon: '⌁' }]

  return <div className="app-shell"><header><a className="brand" href="#">온결 <small>8체질 식단 일기</small></a><div className="profile-actions">{authUser && <span className="auth-user" title={authUser.email ?? ''}>{authUser.email}</span>}{onSignOut && <button className="auth-signout" type="button" onClick={() => void onSignOut()}>로그아웃</button>}{!authUser && onRequestLogin && <button className="auth-signout" type="button" onClick={onRequestLogin}>로그인</button>}<select aria-label="활성 사용자" value={activeProfile.id} onChange={(event) => switchProfile(event.target.value)}>{profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name} · {profile.constitution}</option>)}</select><button className="round-button" onClick={() => setEditingProfile(true)} aria-label="사용자 수정">✎</button><button className="round-button" disabled={profiles.length <= 1} onClick={() => void removeActiveProfile()} aria-label="사용자 삭제">−</button><button className="round-button" onClick={() => setAddingProfile(true)} aria-label="사용자 추가">＋</button></div></header><main>{tab === 'record' && <RecordTab profile={activeProfile} meals={meals} onSaved={(meal) => setMeals((current) => [...current, meal])} onDeleted={removeMeal} />}{tab === 'guide' && <GuideTab profile={activeProfile} />}{tab === 'together' && <TogetherTab profiles={profiles} />}{tab === 'analysis' && <AnalysisTab profile={activeProfile} meals={meals} />}</main><nav className="bottom-nav" aria-label="주요 메뉴">{nav.map((item) => <button className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)} key={item.id}><span>{item.icon}</span>{item.label}</button>)}</nav>{addingProfile && <div className="modal-backdrop" role="presentation" onMouseDown={() => setAddingProfile(false)}><div className="modal card" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setAddingProfile(false)} aria-label="닫기">×</button><ProfileForm title="사용자 추가" onSubmit={addProfile} /></div></div>}{editingProfile && <div className="modal-backdrop" role="presentation" onMouseDown={() => setEditingProfile(false)}><div className="modal card" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setEditingProfile(false)} aria-label="닫기">×</button><ProfileForm title="사용자 수정" submitLabel="변경 내용 저장" initialName={activeProfile.name} initialConstitution={activeProfile.constitution} onSubmit={updateActiveProfile} /></div></div>}</div>
}
