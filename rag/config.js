// Shared RAG configuration. Everything tunable comes from environment variables
// (see backend/.env.example) so no secrets or magic numbers live in code.

export const FALLBACK_REPLY =
  "I don't have that information about Fawwad. You can ask about his projects, skills, " +
  'education or 3D models, or reach him through the Contact section.'

// Which portfolio section each top-level (##) heading of the data files maps to.
// Used to turn a retrieved chunk into a clickable citation on the website.
export const SECTION_ANCHORS = {
  'basic info': '#top',
  'short introduction': '#top',
  'about me': '#about',
  skills: '#about',
  projects: '#games',
  '3d models (blender)': '#models',
  education: '#experience',
  experience: '#experience',
  achievements: '#experience',
  'achievements and certifications': '#experience',
  'interests and extras (optional)': '#about',
  certifications: '#experience',
}

// Sections that are instructions *about* the bot, not facts about Fawwad: never indexed.
export const EXCLUDED_SECTIONS = ['chatbot notes']

export function getConfig(env = process.env) {
  const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d)
  return {
    apiKey: env.GEMINI_API_KEY || '',
    baseUrl: env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com',
    chatModel: env.GEMINI_CHAT_MODEL || 'gemini-3.8-flash',
    // Used once if the main chat model is overloaded (429/5xx). Set empty to disable.
    fallbackModel: env.GEMINI_FALLBACK_MODEL ?? 'gemini-3.1-flash-lite',
    embedModel: env.GEMINI_EMBED_MODEL || 'gemini-embedding-001',
    embedDims: num(env.GEMINI_EMBED_DIMS, 768),
    topK: num(env.RAG_TOP_K, 4),
    minScore: num(env.RAG_MIN_SCORE, 0.5),
    maxChunkChars: num(env.RAG_CHUNK_CHARS, 900),
    chunkOverlapChars: num(env.RAG_CHUNK_OVERLAP, 150),
    maxOutputTokens: num(env.RAG_MAX_OUTPUT_TOKENS, 600),
  }
}
