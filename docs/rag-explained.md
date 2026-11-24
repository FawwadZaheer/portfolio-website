# RAG Chatbot: how it works

The chatbot answers questions about Fawwad using **only** the documents in `data/`. If the documents do not contain the answer it says so instead of guessing.

## Pipeline

```
                 (once, offline: npm run ingest)
data/*.md --> clean --> chunk --> embed --> rag/index.json
                                                 |
visitor question --> embed --> top-k cosine search --+--> relevant chunks?
                                                          |no -> fixed "I don't have that information" reply (LLM not called)
                                                          |yes
                                                          v
                         LLM answers from the chunks only --> streamed to the chat UI + source links
```

| Step | Where | What happens |
| --- | --- | --- |
| Load | `rag/ingest.js` | Reads every `data/*.md` file. Add `achievements.md`, a CV export, etc. and re-run ingest. |
| Clean | `rag/chunker.js` `cleanMarkdown` | Removes `[TO FILL]` placeholders, empty facts and notes. The "Chatbot notes" section is excluded because it is instructions, not facts. |
| Chunk | `rag/chunker.js` | Splits by heading (`##`/`###`) so each project, model and skill group is one chunk, prefixed with its heading path. Sections over 900 characters are split with 150 characters of overlap. |
| Embed | `rag/gemini.js` | Gemini embedding model, 768 dimensions, vectors normalised. Documents use task type `RETRIEVAL_DOCUMENT`, questions use `RETRIEVAL_QUERY`. |
| Store | `rag/index.json` | A JSON vector index. With a few dozen chunks, in-memory cosine search is instant, so no separate vector database is needed. |
| Retrieve | `rag/retrieve.js` | Top 4 chunks by cosine similarity. Chunks below `RAG_MIN_SCORE` are dropped. |
| Generate | `rag/chat.js` | The LLM gets a strict system prompt plus the retrieved chunks inside `<context>` and must answer only from them. |
| Cite | `rag/chat.js` `uniqueSources` | Each chunk remembers its heading and the portfolio section it belongs to, so answers show clickable source chips (for example *Projects > Ship Brawl* links to `#games`). |

## Anti-hallucination and safety

- **Retrieval gate:** if no chunk passes the similarity threshold the server replies with a fixed sentence and never calls the LLM.
- **Grounded prompt:** the model is told to use only the context and to answer with the same fixed sentence if the context lacks the answer. In that case no sources are shown.
- **No leaking:** the prompt forbids revealing instructions, keys or raw documents. The API key lives only in `backend/.env` and is sent in a header, never in a URL or log.
- **Injection handling:** retrieved text is labelled as data, and the visitor question is a separate field.
- **Abuse limits:** questions are capped at 500 characters, history at 6 turns, body size at 10 KB, and each IP is limited to 15 requests per minute. CORS only allows localhost and the origins in `CLIENT_ORIGINS`.

## Files

```
rag/config.js     settings, fallback sentence, section -> page anchor map
rag/chunker.js    clean + chunk
rag/gemini.js     embedding and streaming chat REST client
rag/retrieve.js   cosine similarity + top-k
rag/chat.js       prompt + the whole request as an event stream
rag/ingest.js     builds rag/index.json
rag/tests/        unit tests (npm test in backend/)
backend/src/      Express server, POST /api/chat (server-sent events)
src/components/Chatbot.jsx   chat UI
```

## Run it

```bash
cp backend/.env.example backend/.env      # add GEMINI_API_KEY
cd backend && npm install
npm run ingest                            # builds rag/index.json (re-run after editing data/)
npm run dev                               # API on http://localhost:3001
# in another terminal, from the project root:
npm install && npm run dev                # site on http://localhost:5173 (proxies /api)
```

For deployment set `VITE_API_URL` in the frontend build to the backend URL, and `CLIENT_ORIGINS` and `TRUST_PROXY=1` on the backend.

## Tuning

If the bot refuses things it should know, lower `RAG_MIN_SCORE`. If it answers off-topic questions, raise it. Check the real similarity scores for a few questions before the demo.
