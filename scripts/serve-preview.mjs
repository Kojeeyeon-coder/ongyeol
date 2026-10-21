import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'

const root = process.cwd()
const port = Number(process.env.PREVIEW_PORT ?? 4173)
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' }

createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', `http://${request.headers.host}`).pathname
  const target = pathname === '/' ? '/preview/index.html' : pathname.endsWith('/') ? `${pathname}index.html` : pathname
  const filePath = normalize(join(root, target))
  if (!filePath.startsWith(root)) { response.writeHead(403).end('Forbidden'); return }
  try {
    if (!statSync(filePath).isFile()) throw new Error('Not a file')
    response.writeHead(200, { 'Content-Type': mime[extname(filePath)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
    createReadStream(filePath).pipe(response)
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found')
  }
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`온결 미리보기: http://127.0.0.1:${port}/\n`)
})
