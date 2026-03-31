export interface OllamaCapabilities {
  reasoning: boolean;
  attachment: boolean;
  toolcall: boolean;
  input: {
    text: boolean;
    audio: boolean;
    image: boolean;
    video: boolean;
    pdf: boolean;
  };
  output: {
    text: boolean;
    audio: boolean;
    image: boolean;
    video: boolean;
    pdf: boolean;
  };
  interleaved: boolean | { field: string };
}

export interface OllamaModel {
  id: string;
  name: string;
  family: string;
  api: {
    id: string;
    url: string;
    npm: string;
  };
  status: 'active' | 'deprecated' | 'inactive';
  cost: {
    input: number;
    output: number;
    cache: { read: number; write: number };
  };
  limit: { context: number; output: number };
  capabilities: OllamaCapabilities;
  releaseDate: string;
  variants: Record<string, Record<string, unknown>>;
}

export const ollamaModels: OllamaModel[] = [
  {
    id: 'minimax-m2.7',
    name: 'MiniMax M2.7',
    family: 'minimax',
    api: { id: 'minimax-m2.7', url: 'https://ollama.com/v1', npm: '@ai-sdk/openai-compatible' },
    status: 'active',
    cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
    limit: { context: 204800, output: 131072 },
    capabilities: {
      reasoning: true,
      attachment: false,
      toolcall: true,
      input: { text: true, audio: false, image: false, video: false, pdf: false },
      output: { text: true, audio: false, image: false, video: false, pdf: false },
      interleaved: false,
    },
    releaseDate: '2026-03-18',
    variants: {},
  },
  {
    id: 'minimax-m2.5',
    name: 'MiniMax M2.5',
    family: 'minimax',
    api: { id: 'minimax-m2.5', url: 'https://ollama.com/v1', npm: '@ai-sdk/openai-compatible' },
    status: 'active',
    cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
    limit: { context: 204800, output: 131072 },
    capabilities: {
      reasoning: true,
      attachment: false,
      toolcall: true,
      input: { text: true, audio: false, image: false, video: false, pdf: false },
      output: { text: true, audio: false, image: false, video: false, pdf: false },
      interleaved: false,
    },
    releaseDate: '2026-02-12',
    variants: {},
  },
  {
    id: 'qwen3-coder:480b',
    name: 'Qwen3 Coder 480B',
    family: 'qwen',
    api: { id: 'qwen3-coder:480b', url: 'https://ollama.com/v1', npm: '@ai-sdk/openai-compatible' },
    status: 'active',
    cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
    limit: { context: 262144, output: 65536 },
    capabilities: {
      reasoning: false,
      attachment: false,
      toolcall: true,
      input: { text: true, audio: false, image: false, video: false, pdf: false },
      output: { text: true, audio: false, image: false, video: false, pdf: false },
      interleaved: false,
    },
    releaseDate: '2025-07-22',
    variants: {},
  },
  {
    id: 'qwen3.5:397b',
    name: 'Qwen3.5 397B',
    family: 'qwen',
    api: { id: 'qwen3.5:397b', url: 'https://ollama.com/v1', npm: '@ai-sdk/openai-compatible' },
    status: 'active',
    cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
    limit: { context: 262144, output: 81920 },
    capabilities: {
      reasoning: true,
      attachment: true,
      toolcall: true,
      input: { text: true, audio: false, image: true, video: false, pdf: false },
      output: { text: true, audio: false, image: false, video: false, pdf: false },
      interleaved: { field: 'reasoning_details' },
    },
    releaseDate: '2026-02-15',
    variants: { low: { reasoningEffort: 'low' }, medium: { reasoningEffort: 'medium' }, high: { reasoningEffort: 'high' } },
  },
  {
    id: 'deepseek-v3.1:671b',
    name: 'DeepSeek V3.1 671B',
    family: 'deepseek',
    api: { id: 'deepseek-v3.1:671b', url: 'https://ollama.com/v1', npm: '@ai-sdk/openai-compatible' },
    status: 'active',
    cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
    limit: { context: 163840, output: 163840 },
    capabilities: {
      reasoning: true,
      attachment: false,
      toolcall: true,
      input: { text: true, audio: false, image: false, video: false, pdf: false },
      output: { text: true, audio: false, image: false, video: false, pdf: false },
      interleaved: false,
    },
    releaseDate: '2025-08-21',
    variants: {},
  },
  {
    id: 'gemma3:27b',
    name: 'Gemma 3 27B',
    family: 'gemma',
    api: { id: 'gemma3:27b', url: 'https://ollama.com/v1', npm: '@ai-sdk/openai-compatible' },
    status: 'active',
    cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
    limit: { context: 131072, output: 131072 },
    capabilities: {
      reasoning: false,
      attachment: true,
      toolcall: false,
      input: { text: true, audio: false, image: true, video: false, pdf: false },
      output: { text: true, audio: false, image: false, video: false, pdf: false },
      interleaved: false,
    },
    releaseDate: '2025-07-27',
    variants: {},
  },
  {
    id: 'mistral-large-3:675b',
    name: 'Mistral Large 3 675B',
    family: 'mistral-large',
    api: { id: 'mistral-large-3:675b', url: 'https://ollama.com/v1', npm: '@ai-sdk/openai-compatible' },
    status: 'active',
    cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
    limit: { context: 262144, output: 262144 },
    capabilities: {
      reasoning: false,
      attachment: true,
      toolcall: true,
      input: { text: true, audio: false, image: true, video: false, pdf: false },
      output: { text: true, audio: false, image: false, video: false, pdf: false },
      interleaved: false,
    },
    releaseDate: '2025-12-02',
    variants: {},
  },
];

export const DEFAULT_OLLAMA_MODEL = 'minimax-m2.7';

export function getOllamaModel(modelId: string): OllamaModel | undefined {
  return ollamaModels.find((model) => model.id === modelId);
}

export function getLatestModel(): OllamaModel {
  return ollamaModels.reduce((latest, model) => {
    const latestDate = new Date(latest.releaseDate);
    const modelDate = new Date(model.releaseDate);
    return modelDate > latestDate ? model : latest;
  }, ollamaModels[0]);
}

export function getReasoningModels(): OllamaModel[] {
  return ollamaModels.filter((model) => model.capabilities.reasoning);
}

export function getToolcallModels(): OllamaModel[] {
  return ollamaModels.filter((model) => model.capabilities.toolcall);
}

export function getActiveModels(): OllamaModel[] {
  return ollamaModels.filter((model) => model.status === 'active');
}

export function getVisionModels(): OllamaModel[] {
  return ollamaModels.filter((model) => model.capabilities.attachment);
}