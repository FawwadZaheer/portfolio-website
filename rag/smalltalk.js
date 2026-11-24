// Small talk: greetings, thanks, goodbyes and questions about the bot itself.
// These are answered instantly from fixed replies (no embedding, no LLM call), so
// "hi" gets a friendly reply instead of the "I don't have that information" fallback.
//
// Only a message that is *entirely* small talk is handled here. A message that also
// asks something ("hi, what games has he made?") goes through normal RAG, with the
// greeting stripped before retrieval (see stripSmallTalk).

const SUGGEST = 'Try asking about his games, his skills and tools, his 3D models or where he studies.'

/** lowercase, drop punctuation/emoji, collapse spaces, drop trailing filler words */
export function normalizeMessage(text) {
  return String(text)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(.)\1{2,}/gu, '$1$1') // "heyyyy" -> "heyy", "thanksss" -> "thankss"
}

const FILLER = /\s+(there|bot|fzr ?bot|buddy|friend|mate|bro|dude|man|again)$/u

// Each intent: patterns that must match the WHOLE normalised message, and reply variants.
// `lang: 'ur'` replies are used when the visitor greeted in Roman Urdu.
export const INTENTS = [
  {
    id: 'salam',
    patterns: [/^(as+alam+u?|as+alamo|salam+|salaam|aoa|asalam)( ?[ou])?( ?(alaikum|alaykum|alykum|alikum|aleikum))?$/],
    replies: [
      `Wa alaikum assalam! I'm FZR-BOT, Fawwad's portfolio assistant. ${SUGGEST}`,
    ],
  },
  {
    id: 'greeting',
    patterns: [
      /^(hi+|hey+|hello+|helo|hiya|heya|howdy|yo+|greetings|hai|hellow|good (morning|afternoon|evening|day)|morning|evening|whats? ?up|wass?up|sup)$/,
      /^(hi|hey|hello) (hi|hey|hello)$/,
    ],
    replies: [
      `Hi! I'm FZR-BOT, Fawwad's portfolio assistant. ${SUGGEST}`,
      `Hello! Ask me anything about Fawwad. ${SUGGEST}`,
      `Hey there! I can tell you about Fawwad's games, skills, 3D models and education. What would you like to know?`,
    ],
  },
  {
    id: 'how-are-you',
    patterns: [
      /^((hi|hey|hello) )?(how are (you|u)|how r u|how are you doing|how (are|r) things|hows it going|how is it going|how do you do|how have you been|you good|u good|are you (ok|okay|good|fine))( today)?$/,
      /^(kya ha+l hai|kya haal ha|kaise? ho|kese ho|kaisay ho|kya scene hai|sab theek)$/,
    ],
    replies: [
      `I'm doing great, thanks for asking! I'm here to tell you about Fawwad. ${SUGGEST}`,
      `All good here, ready to help! What would you like to know about Fawwad's work?`,
    ],
  },
  {
    id: 'thanks',
    patterns: [
      /^((ok|okay|great|cool|perfect|awesome|nice) )?(thanks+|thank (you|u)|thankyou|thx|ty|tysm|thanks a lot|thanks so much|thank you so much|many thanks|much appreciated|appreciate it|cheers|shukriya|shukria|jazakallah( khair)?)( (so much|a lot|very much))?$/,
    ],
    replies: [
      `You're welcome! Anything else you'd like to know about Fawwad?`,
      `Happy to help! Feel free to ask about his games, 3D models or skills.`,
    ],
  },
  {
    id: 'bye',
    patterns: [
      /^((ok|okay|thanks|thank you) )?(bye+|goodbye|good bye|bye bye|see (you|ya|u)( later| soon)?|later|cya|take care|good night|gn|have a (good|nice|great) (day|one|night)|allah hafiz|khuda hafiz|alvida)$/,
    ],
    replies: [
      `Goodbye, thanks for visiting! If you'd like to reach Fawwad, the Contact section has his email.`,
      `See you! Don't forget to check out the games in the arcade before you go.`,
    ],
  },
  {
    id: 'identity',
    patterns: [
      /^(who|what) (are|r) (you|u)$/,
      /^(whats|what is) your name$/,
      /^(are|r) (you|u) (a )?(bot|robot|ai|human|real|chatgpt|gpt|person)$/,
      /^(what is|whats) (this|fzr ?bot)$/,
    ],
    replies: [
      `I'm FZR-BOT, an AI assistant on Fawwad Zaheer Rizvi's portfolio. I answer questions about him using only what's written in his portfolio. ${SUGGEST}`,
    ],
  },
  {
    id: 'capabilities',
    patterns: [
      /^(help|help me|menu|options|commands|start)$/,
      /^what (can|do) (you|u) (do|know|answer)$/,
      /^what can i ask( (you|u|about))?$/,
      /^how (does this|do you|do i use this|does this work) ?(work)?$/,
      /^what should i ask( (you|u))?$/,
    ],
    replies: [
      `I can answer questions about Fawwad, for example:\n• What games has he built?\n• Which engines and tools does he use?\n• Where does he study?\n• Tell me about his Blender models\n• How can I contact him?`,
    ],
  },
  {
    id: 'creator',
    patterns: [/^who (made|built|created|programmed|coded|designed) (you|u|this( (bot|site|website|portfolio))?)$/],
    replies: [
      `Fawwad built me as part of this portfolio. I'm a retrieval-augmented (RAG) chatbot, so I answer from the facts in his portfolio. ${SUGGEST}`,
    ],
  },
  {
    id: 'compliment',
    patterns: [
      /^(you are|youre|ur|u r) (so |really |very )?(cool|great|awesome|amazing|smart|helpful|nice|the best)( bot)?$/,
      /^(good|nice|great|cool) (bot|job|work|one)$/,
      /^(i )?(love|like) (it|this|you|this site|the site|the website|your site)$/,
    ],
    replies: [
      `Thank you! Glad you're enjoying the portfolio. Want to know more about any of Fawwad's projects?`,
    ],
  },
  {
    id: 'ack',
    patterns: [
      /^(ok+|okay|k|kk|cool|nice|great|awesome|wow|alright|all right|got it|i see|sure|fine|interesting|lol|haha+|hehe+|hmm+|mm+|yes|yeah|yep|yup|no|nope|nah|ah|oh|oh ok|okay cool|ok cool|ok thanks|sounds good)$/,
    ],
    replies: [
      `Anything else you'd like to know about Fawwad? ${SUGGEST}`,
    ],
  },
]

const GREETING_PREFIX =
  /^(hi+|hey+|hello+|hiya|heya|yo|greetings|good (morning|afternoon|evening)|as+alam+u? ?[ou]? ?alaikum|salam+|aoa)( there| bot| fzr ?bot)?[\s,!.:;-]+/i

/** Pick a reply deterministically from the text, so the same message gets the same reply. */
function pick(list, seed) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return list[h % list.length]
}

/**
 * If the whole message is small talk, return { intent, reply }; otherwise null.
 */
export function smallTalk(message) {
  const norm = normalizeMessage(message)
  if (!norm || norm.split(' ').length > 9) return null
  // try the message as written, then without a trailing filler word ("hello bot" -> "hello")
  const variants = [norm, norm.replace(FILLER, '')]
  for (const intent of INTENTS) {
    if (intent.patterns.some((re) => variants.some((v) => re.test(v)))) {
      return { intent: intent.id, reply: pick(intent.replies, norm) }
    }
  }
  return null
}

/** "Hi! What games has he made?" -> "What games has he made?" (for retrieval only). */
export function stripSmallTalk(message) {
  const stripped = String(message).replace(GREETING_PREFIX, '').trim()
  return stripped || message
}
