import { mkdir, readFile, writeFile } from 'node:fs/promises'

const pulmotonia = JSON.parse(await readFile(new URL('../src/data/pulmotonia-guide.json', import.meta.url), 'utf8'))
const hepatotonia = JSON.parse(await readFile(new URL('../src/data/hepatotonia-guide.json', import.meta.url), 'utf8'))
const cholecystotonia = JSON.parse(await readFile(new URL('../src/data/cholecystotonia-guide.json', import.meta.url), 'utf8'))
const pancreotonia = JSON.parse(await readFile(new URL('../src/data/pancreotonia-guide.json', import.meta.url), 'utf8'))
const gastrotonia = JSON.parse(await readFile(new URL('../src/data/gastrotonia-guide.json', import.meta.url), 'utf8'))
const colonotonia = JSON.parse(await readFile(new URL('../src/data/colonotonia-guide.json', import.meta.url), 'utf8'))
const renotonia = JSON.parse(await readFile(new URL('../src/data/renotonia-guide.json', import.meta.url), 'utf8'))
const vesicotonia = JSON.parse(await readFile(new URL('../src/data/vesicotonia-guide.json', import.meta.url), 'utf8'))
const nutrition = JSON.parse(await readFile(new URL('../src/data/nutrition-cache.json', import.meta.url), 'utf8'))
const banner = '// Generated from constitution regimen JSON files. Do not edit by hand.\n'
const output = `${banner}globalThis.HEPATOTONIA_GUIDE=${JSON.stringify(hepatotonia)};\nglobalThis.CHOLECYSTOTONIA_GUIDE=${JSON.stringify(cholecystotonia)};\nglobalThis.PANCREOTONIA_GUIDE=${JSON.stringify(pancreotonia)};\nglobalThis.GASTROTONIA_GUIDE=${JSON.stringify(gastrotonia)};\nglobalThis.PULMOTONIA_GUIDE=${JSON.stringify(pulmotonia)};\nglobalThis.COLONOTONIA_GUIDE=${JSON.stringify(colonotonia)};\nglobalThis.RENOTONIA_GUIDE=${JSON.stringify(renotonia)};\nglobalThis.VESICOTONIA_GUIDE=${JSON.stringify(vesicotonia)};\nglobalThis.NUTRITION_CACHE=${JSON.stringify(nutrition)};\n`
await writeFile(new URL('../preview/pulmotonia-data.js', import.meta.url), output, 'utf8')
await mkdir(new URL('../dist/', import.meta.url), { recursive: true })
await writeFile(new URL('../dist/pulmotonia-data.js', import.meta.url), output, 'utf8')
console.log(JSON.stringify({ hepatotonia: hepatotonia.length, cholecystotonia: cholecystotonia.length, pancreotonia: pancreotonia.length, gastrotonia: gastrotonia.length, pulmotonia: pulmotonia.length, colonotonia: colonotonia.length, renotonia: renotonia.length, vesicotonia: vesicotonia.length, outputs: ['preview/pulmotonia-data.js', 'dist/pulmotonia-data.js'] }))
