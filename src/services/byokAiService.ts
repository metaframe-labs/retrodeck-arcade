import AsyncStorage from '@react-native-async-storage/async-storage';

const BYOK_STORAGE_KEY = '@retrodeck8_byok_config_v1';

export type BYOKProviderId =
  | 'gemini'
  | 'claude'
  | 'openai'
  | 'xai'
  | 'groq'
  | 'deepseek'
  | 'openrouter'
  | 'ollama'
  | 'lmstudio';

export interface BYOKProviderMeta {
  id: BYOKProviderId;
  name: string;
  shortName: string;
  defaultModel: string;
  requiresKey: boolean;
  keyPlaceholder?: string;
  defaultEndpoint?: string;
}

export const BYOK_PROVIDERS: BYOKProviderMeta[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    shortName: 'GEMINI',
    defaultModel: 'gemini-2.5-flash',
    requiresKey: true,
    keyPlaceholder: 'AIzaSy...',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    shortName: 'OPENAI',
    defaultModel: 'gpt-4o-mini',
    requiresKey: true,
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    shortName: 'CLAUDE',
    defaultModel: 'claude-sonnet-4-5',
    requiresKey: true,
    keyPlaceholder: 'sk-ant-...',
  },
  {
    id: 'groq',
    name: 'Groq LPU',
    shortName: 'GROQ',
    defaultModel: 'llama-3.3-70b-versatile',
    requiresKey: true,
    keyPlaceholder: 'gsk_...',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    shortName: 'DEEPSEEK',
    defaultModel: 'deepseek-chat',
    requiresKey: true,
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'xai',
    name: 'xAI Grok',
    shortName: 'GROK',
    defaultModel: 'grok-3-mini',
    requiresKey: true,
    keyPlaceholder: 'xai-...',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    shortName: 'OPENRTR',
    defaultModel: 'openai/gpt-4o-mini',
    requiresKey: true,
    keyPlaceholder: 'sk-or-...',
  },
  {
    id: 'ollama',
    name: 'Ollama Local',
    shortName: 'OLLAMA',
    defaultModel: 'llama3.2',
    requiresKey: false,
    defaultEndpoint: 'http://localhost:11434',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    shortName: 'LMSTUDIO',
    defaultModel: 'local-model',
    requiresKey: false,
    defaultEndpoint: 'http://localhost:1234',
  },
];

export interface BYOKConfig {
  activeProvider: BYOKProviderId;
  keys: Partial<Record<BYOKProviderId, string>>;
  models: Partial<Record<BYOKProviderId, string>>;
  endpoints: Partial<Record<BYOKProviderId, string>>;
}

export const DEFAULT_BYOK_CONFIG: BYOKConfig = {
  activeProvider: 'gemini',
  keys: {},
  models: {},
  endpoints: {
    ollama: 'http://localhost:11434',
    lmstudio: 'http://localhost:1234',
  },
};

export async function loadBYOKConfig(): Promise<BYOKConfig> {
  try {
    const raw = await AsyncStorage.getItem(BYOK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_BYOK_CONFIG,
        ...parsed,
        keys: { ...DEFAULT_BYOK_CONFIG.keys, ...(parsed.keys || {}) },
        models: { ...DEFAULT_BYOK_CONFIG.models, ...(parsed.models || {}) },
        endpoints: { ...DEFAULT_BYOK_CONFIG.endpoints, ...(parsed.endpoints || {}) },
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_BYOK_CONFIG;
}

export async function saveBYOKConfig(config: BYOKConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(BYOK_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

export function getProviderMeta(id: BYOKProviderId): BYOKProviderMeta {
  return BYOK_PROVIDERS.find((p) => p.id === id) || BYOK_PROVIDERS[0];
}

export function getProviderModel(id: BYOKProviderId, config: BYOKConfig): string {
  const meta = getProviderMeta(id);
  return config.models?.[id]?.trim() || meta.defaultModel;
}

export function getProviderEndpoint(id: BYOKProviderId, config: BYOKConfig): string {
  const meta = getProviderMeta(id);
  return (config.endpoints?.[id]?.trim() || meta.defaultEndpoint || '').replace(/\/+$/, '');
}

export interface BYOKChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callOpenAICompatibleChat(
  url: string,
  apiKey: string | undefined,
  model: string,
  chatMessages: BYOKChatMessage[],
  systemPrompt?: string,
  extraHeaders?: Record<string, string>,
  maxTokens: number = 350
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const messages: { role: string; content: string }[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  for (const m of chatMessages) {
    messages.push({ role: m.role, content: m.content });
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `HTTP ${res.status}`);
  }
  return data.choices?.[0]?.message?.content || '';
}

export async function callBYOKAIChat(
  chatMessages: BYOKChatMessage[],
  config: BYOKConfig,
  systemPrompt: string = 'You are RetroDeck OS AI running on a Nokia 3310 monochrome LCD (320x240). Keep answers concise, punchy, and helpful.'
): Promise<string> {
  const provider = config.activeProvider || 'gemini';
  const apiKey = config.keys?.[provider]?.trim() || '';
  const model = getProviderModel(provider, config);
  const meta = getProviderMeta(provider);

  if (meta.requiresKey && !apiKey) {
    throw new Error(`NO ${meta.shortName} KEY! ADD IN BYOK TAB.`);
  }

  const sanitized = chatMessages.filter(
    (m) => m && typeof m.content === 'string' && m.content.trim().length > 0
  );

  switch (provider) {
    case 'gemini': {
      const payload: Record<string, any> = {
        contents: sanitized.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        systemInstruction: { parts: [{ text: systemPrompt }] },
      };
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || `HTTP ${res.status}`);
      }
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    case 'claude': {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 350,
          system: systemPrompt,
          messages: sanitized.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || `HTTP ${res.status}`);
      }
      return data.content?.[0]?.text || '';
    }

    case 'openai':
      return callOpenAICompatibleChat(
        'https://api.openai.com/v1/chat/completions',
        apiKey,
        model,
        sanitized,
        systemPrompt
      );

    case 'xai':
      return callOpenAICompatibleChat(
        'https://api.x.ai/v1/chat/completions',
        apiKey,
        model,
        sanitized,
        systemPrompt
      );

    case 'groq':
      return callOpenAICompatibleChat(
        'https://api.groq.com/openai/v1/chat/completions',
        apiKey,
        model,
        sanitized,
        systemPrompt
      );

    case 'deepseek':
      return callOpenAICompatibleChat(
        'https://api.deepseek.com/chat/completions',
        apiKey,
        model,
        sanitized,
        systemPrompt
      );

    case 'openrouter':
      return callOpenAICompatibleChat(
        'https://openrouter.ai/api/v1/chat/completions',
        apiKey,
        model,
        sanitized,
        systemPrompt,
        { 'X-Title': 'RetroDeck OS' }
      );

    case 'ollama': {
      const base = getProviderEndpoint('ollama', config);
      const res = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          messages: [
            { role: 'system', content: systemPrompt },
            ...sanitized.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return data.message?.content || '';
    }

    case 'lmstudio': {
      const base = getProviderEndpoint('lmstudio', config);
      return callOpenAICompatibleChat(
        `${base}/v1/chat/completions`,
        undefined,
        model,
        sanitized,
        systemPrompt
      );
    }
  }
}
