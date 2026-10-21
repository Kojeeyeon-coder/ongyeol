import { readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const ENDPOINTS = [
  'https://api.data.go.kr/openapi/tn_pubr_public_nutri_info_api',
  'https://api.data.go.kr/openapi/tn_pubr_public_nutri_material_info_api',
  'https://apis.data.go.kr/openapi/tn_pubr_public_nutri_material_info_api',
]
const SEARCH_ALIASES = {
  쌀밥: ['쌀밥', '밥'],
  달걀: ['달걀', '계란'],
  쇠고기: ['쇠고기', '소고기'],
}
const outputPath = resolve('src/data/nutrition-cache.json')
const tempPath = resolve('src/data/nutrition-cache.tmp.json')

async function loadLocalEnv() {
  try {
    const source = await readFile(resolve('.env.local'), 'utf8')
    for (const line of source.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const separator = trimmed.indexOf('=')
      if (separator < 1) continue
      const key = trimmed.slice(0, separator).trim()
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
}

async function getFoodNames() {
  const argument = process.argv.find((value) => value.startsWith('--food='))
  if (argument) return [...new Set(argument.slice('--food='.length).split(',').map((name) => name.trim()).filter(Boolean))]
  if (process.argv.includes('--sample')) return ['사과', '쌀밥', '달걀', '쇠고기', '돼지고기', '닭고기', '우유', '보리', '현미']
  const files = (await readdir(resolve('src/data'))).filter((name) => name.endsWith('-guide.json'))
  const names = []
  for (const file of files) {
    const items = JSON.parse(await readFile(resolve('src/data', file), 'utf8'))
    names.push(...items.filter((item) => item.recordable).map((item) => item.name.split(/[\/(]/)[0].trim()))
  }
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'ko'))
}

function asArray(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') return [value]
  return []
}

function extractItems(payload) {
  return asArray(
    payload?.response?.body?.items?.item ??
      payload?.response?.body?.items ??
      payload?.body?.items?.item ??
      payload?.items?.item ??
      payload?.items,
  )
}

function extractTotalCount(payload) {
  return numberOrNull(payload?.response?.body?.totalCount ?? payload?.body?.totalCount ?? payload?.totalCount)
}

function numberOrNull(value) {
  const parsed = Number.parseFloat(String(value ?? '').replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function normalise(item) {
  const basis = String(item.nutConSrtrQua ?? '')
  const kcal = numberOrNull(item.enerc)
  const basisGrams = numberOrNull(basis.match(/[\d.]+/)?.[0])
  return {
    id: String(item.foodCd ?? ''),
    name: String(item.foodNm ?? ''),
    kcal,
    basis,
    basisGrams,
    kcalPer100g: kcal !== null && basisGrams ? Math.round((kcal * 100 / basisGrams) * 100) / 100 : null,
    foodSize: String(item.foodSize ?? ''),
    dataType: String(item.typeNm ?? item.dataTypeNm ?? ''),
    sourceName: String(item.srcNm ?? item.instt_nm ?? ''),
    sourceDate: String(item.crtrYmd ?? item.crtYmd ?? ''),
  }
}

async function fetchPage(endpoint, serviceKey, pageNo, numOfRows) {
  const url = new URL(endpoint)
  url.searchParams.set('serviceKey', serviceKey)
  url.searchParams.set('pageNo', String(pageNo))
  url.searchParams.set('numOfRows', String(numOfRows))
  url.searchParams.set('type', 'json')
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`영양 API HTTP ${response.status}`)
  const body = await response.text()
  let payload
  try { payload = JSON.parse(body) }
  catch { throw new Error(`영양 API가 JSON이 아닌 응답을 반환했습니다: ${body.slice(0, 120)}`) }
  return { items: extractItems(payload).map(normalise).filter((item) => item.id && item.name), totalCount: extractTotalCount(payload) }
}

async function fetchCatalog(serviceKey) {
  let lastError
  for (const endpoint of ENDPOINTS) {
    try {
      const numOfRows = 1000
      const collected = []
      for (let pageNo = 1; pageNo <= 500; pageNo += 1) {
        const page = await fetchPage(endpoint, serviceKey, pageNo, numOfRows)
        collected.push(...page.items)
        process.stdout.write(`영양 DB ${pageNo}페이지 · 누적 ${collected.length}${page.totalCount ? `/${page.totalCount}` : ''}건\n`)
        if (!page.items.length || (page.totalCount !== null ? collected.length >= page.totalCount : page.items.length < numOfRows)) break
      }
      if (collected.length) return { endpoint, items: collected }
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

function normalizedName(value) {
  return String(value ?? '').normalize('NFKC').replace(/[\s·,()\-_/]/g, '').toLocaleLowerCase('ko-KR')
}

function matchesForName(catalog, foodName) {
  const queries = (SEARCH_ALIASES[foodName] ?? [foodName]).map(normalizedName)
  return catalog
    .filter((item) => queries.some((query) => normalizedName(item.name).includes(query)))
    .sort((first, second) => {
      const rank = (item) => {
        const name = normalizedName(item.name)
        const exact = queries.includes(name) ? 0 : queries.some((query) => name.startsWith(query)) ? 1 : 2
        const type = item.dataType === '원재료성 식품' ? 0 : item.dataType === '음식' ? 1 : 2
        return exact * 10000 + type * 1000 + name.length
      }
      return rank(first) - rank(second)
    })
}

async function main() {
  await loadLocalEnv()
  const serviceKey = process.env.NUTRI_API_KEY
  if (!serviceKey) throw new Error('NUTRI_API_KEY 환경변수 또는 .env.local 설정이 필요합니다.')
  const names = await getFoodNames()
  const catalog = await fetchCatalog(serviceKey)
  const allItems = []
  const matchedNames = []
  const unmatchedNames = []
  for (const name of names) {
    const matches = matchesForName(catalog.items, name)
    allItems.push(...matches.slice(0, 20))
    if (matches.length) matchedNames.push(name)
    else unmatchedNames.push(name)
    process.stdout.write(`${name}: ${matches.length}건 검색 · 상위 ${Math.min(20, matches.length)}건 저장\n`)
  }
  const unique = [...new Map(allItems.map((item) => [item.id, item])).values()]
  const cache = {
    source: '공공데이터포털 전국통합식품영양성분정보(원재료성식품)표준데이터',
    endpoint: catalog.endpoint,
    syncedAt: new Date().toISOString(),
    queryNames: names,
    matchedNames,
    unmatchedNames,
    items: unique,
  }
  await writeFile(tempPath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8')
  await rename(tempPath, outputPath)
  await import('./build-preview-regimen.mjs')
  process.stdout.write(`캐시 갱신 완료: 영양 항목 ${unique.length}건 · 음식명 매칭 ${matchedNames.length}/${names.length}개 · 미매칭 ${unmatchedNames.length}개\n`)
}

main().catch((error) => {
  process.stderr.write(`영양 데이터 동기화 실패: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
