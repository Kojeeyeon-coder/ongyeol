import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const [inputPath, requestedOutputPath] = process.argv.slice(2)
if (!inputPath) throw new Error('사용법: node scripts/extract-regimen-html.mjs <원문 HTML 경로> [출력 JSON 경로]')

const html = await readFile(path.resolve(inputPath), 'utf8')
const slug = html.match(/<link\s+rel=["']canonical["']\s+href=["']https:\/\/irehclinic\.com\/([^"'\/]+)\/?["']/i)?.[1]
const constitutionBySlug = { hepatotonia: '목양', cholecystotonia: '목음', pancreotonia: '토양', gastrotonia: '토음', pulmotonia: '금양', colonotonia: '금음', renotonia: '수양', vesicotonia: '수음' }
const constitution = constitutionBySlug[slug]
if (!constitution) throw new Error(`지원하지 않는 체질 페이지입니다: ${slug ?? 'canonical 없음'}`)
const outputPath = requestedOutputPath ?? `src/data/${slug}-guide.json`
const table = html.match(/<table\b[^>]*id=["']tablepress-ecm["'][^>]*>[\s\S]*?<\/table>/i)?.[0]
if (!table) throw new Error('tablepress-ecm 섭생표를 찾지 못했습니다.')

const decode = (value) => value
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;|&#160;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#039;|&apos;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ')
  .trim()

const scoreByGrade = { OO: 100, O: 75, '△': 50, X: 25, XX: 0 }
const mealSearchCategories = new Set([
  '동물성단백질', '식물성단백질', '탄수화물(곡류)', '오일', '근채류(뿌리채소)',
  '채소(잎/줄기채소)', '허브 및 양념류', '해조류', '과일', '음료', '기호식품', '주류',
])
const rows = []

for (const row of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
  const cells = [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => decode(cell[1]))
  if (cells.length < 3) continue
  const [category, name, rawGrade] = cells
  const grade = rawGrade.replaceAll('Δ', '△')
  if (!(grade in scoreByGrade) || !category || !name) continue
  rows.push({
    id: `${slug}-${createHash('sha1').update(`${category}|${name}`).digest('hex').slice(0, 12)}`,
    constitution,
    category,
    name,
    aliases: [],
    grade,
    score: scoreByGrade[grade],
    recordable: mealSearchCategories.has(category) && name !== '담배',
    sourceUrl: `https://irehclinic.com/${slug}`,
    sourceAccessedAt: '2026-10-20',
    dataVersion: `ireh-${slug}-html-2026-10-20`,
    reviewStatus: 'source-extracted-unverified',
  })
}

if (rows.length < 100) throw new Error(`추출 항목이 너무 적습니다: ${rows.length}개`)
await writeFile(path.resolve(outputPath), `${JSON.stringify(rows, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ output: path.resolve(outputPath), count: rows.length, recordable: rows.filter((row) => row.recordable).length }))
