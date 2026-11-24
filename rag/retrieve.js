export function normalize(vec) {
  let sum = 0
  for (const v of vec) sum += v * v
  const n = Math.sqrt(sum) || 1
  return vec.map((v) => v / n)
}

export function cosine(a, b) {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}

/** RETRIEVE: top-k chunks by cosine similarity, dropping anything below `minScore`. */
export function retrieve(index, queryVec, { topK = 4, minScore = 0.5 } = {}) {
  return index.chunks
    .map((c) => ({ chunk: c, score: cosine(queryVec, c.embedding) }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
