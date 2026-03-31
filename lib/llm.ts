import OpenAI from 'openai'

// Custom fetch that disables HTTP keep-alive.
// LiteLLM drops keep-alive connections after a few requests, causing
// "SocketError: other side closed" errors in the Next.js dev server.
const noKeepAliveFetch: typeof globalThis.fetch = (url, init) => {
  const headers = new Headers(init?.headers)
  headers.set('Connection', 'close')
  return globalThis.fetch(url, { ...init, headers })
}

// Lazy-initialize the OpenAI client to avoid module-level throws
// that crash the Turbopack dev server and cause infinite page refreshes.
let _llm: OpenAI | null = null

export function getLlm(): OpenAI {
  if (!_llm) {
    if (!process.env.AZURE_OPENAI_API_KEY) throw new Error('AZURE_OPENAI_API_KEY is not set')
    if (!process.env.AZURE_OPENAI_ENDPOINT) throw new Error('AZURE_OPENAI_ENDPOINT is not set')
    _llm = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: process.env.AZURE_OPENAI_ENDPOINT,
      fetch: noKeepAliveFetch,
    })
  }
  return _llm
}

export const LLM_MODEL = process.env.AZURE_OPENAI_MODEL_NAME ?? 'azure/gpt-4.1-nano'
