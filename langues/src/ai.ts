// Couche commune aux fournisseurs d'IA. Les requêtes partent du téléphone vers le fournisseur
// choisi, avec la clé de l'utilisateur ; rien ne transite par un serveur intermédiaire.
// On appelle les API en HTTP direct plutôt qu'avec les SDK officiels : un seul code pour tous,
// et une application nettement plus légère.

export interface Provider {
  id: string;
  name: string;
  /** Modèles proposés : [identifiant, libellé]. Le premier est le choix par défaut. */
  models: [string, string][];
  keyUrl: string;
  keyHint: string;
}

export const PROVIDERS: Provider[] = [
  {
    id: 'anthropic', name: 'Claude (Anthropic)',
    models: [
      ['claude-opus-5-5', 'Claude Opus 5.5'],
      ['claude-sonnet-5-5', 'Claude Sonnet 5.5'],
      ['claude-haiku-5-5', 'Claude Haiku 5.5'],
    ],
    keyUrl: 'https://console.anthropic.com/settings/keys', keyHint: 'sk-ant-…',
  },
  {
    id: 'gemini', name: 'Gemini (Google)',
    models: [
      ['gemini-2.5-pro', 'Gemini 2.5 Pro'],
      ['gemini-2.5-flash', 'Gemini 2.5 Flash'],
      ['gemini-2.0-flash', 'Gemini 2.0 Flash'],
    ],
    keyUrl: 'https://aistudio.google.com/app/apikey', keyHint: 'AIza…',
  },
  {
    id: 'openai', name: 'ChatGPT (OpenAI)',
    models: [['gpt-5', 'GPT-5'], ['gpt-5-mini', 'GPT-5 mini'], ['gpt-4.1', 'GPT-4.1']],
    keyUrl: 'https://platform.openai.com/api-keys', keyHint: 'sk-…',
  },
  {
    id: 'mistral', name: 'Mistral',
    models: [['mistral-large-latest', 'Mistral Large'], ['mistral-small-latest', 'Mistral Small']],
    keyUrl: 'https://console.mistral.ai/api-keys', keyHint: '…',
  },
  {
    id: 'deepseek', name: 'DeepSeek',
    models: [['deepseek-chat', 'DeepSeek Chat'], ['deepseek-reasoner', 'DeepSeek Reasoner']],
    keyUrl: 'https://platform.deepseek.com/api_keys', keyHint: 'sk-…',
  },
  {
    id: 'groq', name: 'Groq',
    models: [['llama-3.3-70b-versatile', 'Llama 3.3 70B'], ['llama-3.1-8b-instant', 'Llama 3.1 8B']],
    keyUrl: 'https://console.groq.com/keys', keyHint: 'gsk_…',
  },
  {
    id: 'openrouter', name: 'OpenRouter',
    models: [
      ['anthropic/claude-sonnet-4.5', 'Claude Sonnet 4.5'],
      ['google/gemini-2.5-flash', 'Gemini 2.5 Flash'],
      ['meta-llama/llama-3.3-70b-instruct', 'Llama 3.3 70B'],
    ],
    keyUrl: 'https://openrouter.ai/keys', keyHint: 'sk-or-…',
  },
];

export const getProvider = (id: string): Provider => PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
export const defaultModel = (id: string): string => getProvider(id).models[0][0];

export interface Msg { role: 'user' | 'assistant'; content: string }
export interface Ask {
  provider: string;
  apiKey: string;
  model: string;
  system: string;
  messages: Msg[];
  /** Demande une réponse strictement en JSON (génération de contenu). */
  json?: boolean;
  maxTokens?: number;
  signal?: AbortSignal;
  /** Appelé au fil de l'eau avec le texte accumulé, quand le fournisseur diffuse la réponse. */
  onText?: (soFar: string) => void;
}

export class AiError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message);
  }
}

/** Message d'erreur en français, à partir du code HTTP et de ce que renvoie le fournisseur. */
export function explainError(e: unknown): string {
  if (e instanceof AiError) {
    if (e.status === 401 || e.status === 403) return 'Clé d’API refusée. Vérifiez-la dans les réglages.';
    if (e.status === 404) return 'Modèle introuvable. Choisissez-en un autre dans les réglages.';
    if (e.status === 429) return 'Trop de requêtes, ou crédit épuisé. Réessayez dans un instant.';
    if (e.status >= 500) return 'Le fournisseur rencontre un problème. Réessayez plus tard.';
    if (e.status === 0) return 'Pas de connexion. Cette fonction a besoin du réseau ; le reste de l’appli marche hors ligne.';
    return e.message;
  }
  if (e instanceof DOMException && e.name === 'AbortError') return 'Génération interrompue.';
  return e instanceof Error ? e.message : 'Erreur inconnue.';
}

async function http(url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new AiError('Pas de connexion.', 0);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let msg = `Erreur ${res.status}`;
    try {
      const j = JSON.parse(body);
      msg = j?.error?.message ?? j?.message ?? j?.error?.[0]?.message ?? msg;
    } catch { /* corps non JSON : on garde le message générique */ }
    throw new AiError(msg, res.status);
  }
  return res;
}

/** Lit un flux SSE et appelle `onChunk` pour chaque fragment de texte. */
async function readSse(res: Response, pick: (data: unknown) => string | undefined, onChunk: (s: string) => void) {
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const payload = t.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const piece = pick(JSON.parse(payload));
        if (piece) onChunk(piece);
      } catch { /* fragment incomplet ou non JSON : on l'ignore */ }
    }
  }
}

// ───────────────────────── appels par fournisseur ─────────────────────────

async function askAnthropic(o: Ask): Promise<string> {
  const stream = !!o.onText;
  const res = await http('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: o.signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': o.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: o.model,
      max_tokens: o.maxTokens ?? 8000,
      system: o.system,
      stream,
      messages: o.messages,
    }),
  });
  if (!stream) {
    const j = await res.json();
    return (j.content ?? []).filter((c: { type: string }) => c.type === 'text').map((c: { text: string }) => c.text).join('');
  }
  let out = '';
  await readSse(res, (d) => (d as { delta?: { text?: string } }).delta?.text, (s) => { out += s; o.onText!(out); });
  return out;
}

async function askGemini(o: Ask): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(o.model)}:${o.onText ? 'streamGenerateContent?alt=sse&' : 'generateContent?'}key=${encodeURIComponent(o.apiKey)}`;
  const res = await http(url, {
    method: 'POST',
    signal: o.signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: o.system }] },
      contents: o.messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: {
        maxOutputTokens: o.maxTokens ?? 8000,
        ...(o.json ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });
  const text = (d: unknown) =>
    (d as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
  if (!o.onText) return text(await res.json()) ?? '';
  let out = '';
  await readSse(res, text, (s) => { out += s; o.onText!(out); });
  return out;
}

/** OpenAI et tous les fournisseurs qui reprennent son format. */
const OPENAI_LIKE: Record<string, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};

async function askOpenAiLike(o: Ask): Promise<string> {
  const stream = !!o.onText;
  const res = await http(OPENAI_LIKE[o.provider], {
    method: 'POST',
    signal: o.signal,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${o.apiKey}` },
    body: JSON.stringify({
      model: o.model,
      max_completion_tokens: o.maxTokens ?? 8000,
      stream,
      ...(o.json ? { response_format: { type: 'json_object' } } : {}),
      messages: [{ role: 'system', content: o.system }, ...o.messages],
    }),
  });
  if (!stream) {
    const j = await res.json();
    return j.choices?.[0]?.message?.content ?? '';
  }
  let out = '';
  await readSse(res, (d) => (d as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content,
    (s) => { out += s; o.onText!(out); });
  return out;
}

export async function ask(o: Ask): Promise<string> {
  if (!o.apiKey) throw new AiError('Aucune clé d’API enregistrée.', 401);
  if (o.provider === 'anthropic') return askAnthropic(o);
  if (o.provider === 'gemini') return askGemini(o);
  if (o.provider in OPENAI_LIKE) return askOpenAiLike(o);
  throw new AiError('Fournisseur inconnu.');
}

/** Extrait le premier objet JSON d'une réponse, même entourée de texte ou de balises Markdown. */
export function parseJson<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : raw;
  const start = body.search(/[[{]/);
  if (start < 0) throw new AiError('Réponse illisible : aucun contenu JSON.');
  const open = body[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < body.length; i++) {
    const c = body[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) {
      return JSON.parse(body.slice(start, i + 1)) as T;
    }
  }
  throw new AiError('Réponse incomplète : le JSON est tronqué.');
}
