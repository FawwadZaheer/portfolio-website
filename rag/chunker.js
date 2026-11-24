import { SECTION_ANCHORS, EXCLUDED_SECTIONS } from './config.js'

/**
 * CLEAN: normalise line endings, drop blockquote notes, and remove "[TO FILL ...]"
 * placeholders. A line that is left with no value after removing a placeholder
 * (e.g. "- Location: [TO FILL]") is dropped so the bot never sees empty facts.
 */
export function cleanMarkdown(raw) {
  const out = []
  for (const line of raw.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^>\s?/.test(line)) continue
    const stripped = line.replace(/\[TO FILL[^\]]*\]/gi, '').replace(/[ \t]+$/g, '')
    if (stripped !== line && /[:\-–]\s*$/.test(stripped)) continue
    out.push(stripped)
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** Split one section body into pieces <= max chars, carrying `overlap` chars between pieces. */
export function splitWithOverlap(body, max, overlap) {
  if (body.length <= max) return [body]
  const lines = body.split('\n')
  const pieces = []
  let current = []
  let size = 0
  for (const line of lines) {
    if (size + line.length + 1 > max && current.length) {
      pieces.push(current.join('\n'))
      // carry trailing lines (up to `overlap` chars) into the next piece
      const carry = []
      let carried = 0
      for (let i = current.length - 1; i >= 0 && carried + current[i].length <= overlap; i--) {
        carry.unshift(current[i])
        carried += current[i].length + 1
      }
      current = carry
      size = carried
    }
    current.push(line)
    size += line.length + 1
  }
  if (current.length) pieces.push(current.join('\n'))
  return pieces
}

const slug = (s) => s.toLowerCase().replace(/\.[a-z]+$/, '').replace(/[^a-z0-9]+/g, '-')

/**
 * LOAD -> CLEAN -> CHUNK one markdown document. Chunks follow the heading structure
 * (## section, ### subsection) so each project / model / skill group is its own
 * retrievable unit, and every chunk is prefixed with its heading path for context.
 */
export function chunkMarkdown(raw, { file, maxChars = 900, overlap = 150 }) {
  const text = cleanMarkdown(raw)
  const blocks = []
  let h2 = ''
  let h3 = ''
  let buf = []
  const flush = () => {
    const body = buf.join('\n').trim()
    if (body) blocks.push({ h2, h3, body })
    buf = []
  }
  for (const line of text.split('\n')) {
    if (/^#\s/.test(line)) continue // document title
    const m2 = line.match(/^##\s+(.*)/)
    const m3 = line.match(/^###\s+(.*)/)
    if (m2) { flush(); h2 = m2[1].trim(); h3 = '' } else if (m3) { flush(); h3 = m3[1].trim() } else buf.push(line)
  }
  flush()

  const chunks = []
  for (const b of blocks) {
    if (EXCLUDED_SECTIONS.includes(b.h2.toLowerCase())) continue
    const section = b.h3 ? `${b.h2} > ${b.h3}` : b.h2 || 'Overview'
    const anchor = SECTION_ANCHORS[b.h2.toLowerCase()] || '#top'
    for (const piece of splitWithOverlap(b.body, maxChars, overlap)) {
      chunks.push({
        id: `${slug(file)}-${chunks.length + 1}`,
        text: `[${section}]\n${piece}`,
        source: { file, section, anchor },
      })
    }
  }
  return chunks
}
