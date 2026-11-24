// Run: npm run ingest  (from backend/)  — builds rag/index.json from data/*.md
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { ROOT, loadEnv } from './env.js'
import { getConfig } from './config.js'
import { chunkMarkdown } from './chunker.js'
import { embedDocuments } from './gemini.js'

loadEnv()
const config = getConfig()

const dataDir = path.join(ROOT, 'data')
const files = (await readdir(dataDir)).filter((f) => f.endsWith('.md')).sort()
if (!files.length) throw new Error(`No .md files found in ${dataDir}`)

// 1) LOAD + CLEAN + CHUNK
const chunks = []
for (const file of files) {
  const raw = await readFile(path.join(dataDir, file), 'utf8')
  const parts = chunkMarkdown(raw, { file, maxChars: config.maxChunkChars, overlap: config.chunkOverlapChars })
  console.log(`${file}: ${parts.length} chunks`)
  chunks.push(...parts)
}

// 2) EMBED
console.log(`Embedding ${chunks.length} chunks with ${config.embedModel} (${config.embedDims} dims)...`)
const vectors = await embedDocuments(config, chunks.map((c) => c.text))

// 3) STORE (a JSON vector index; tiny data set, so in-memory cosine search is plenty)
const index = {
  createdAt: new Date().toISOString(),
  embedModel: config.embedModel,
  dims: config.embedDims,
  chunks: chunks.map((c, i) => ({ ...c, embedding: vectors[i].map((v) => Number(v.toFixed(6))) })),
}
const out = path.join(ROOT, 'rag', 'index.json')
await writeFile(out, JSON.stringify(index))
console.log(`Wrote ${out}`)
