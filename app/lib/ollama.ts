/**
 * Ollama Client Library
 * Provides integration with local Ollama runtime for AI capabilities
 */

import { logger } from './logger';

/**
 * Ollama configuration
 */
export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeout: number;
}

/**
 * Ollama chat message
 */
export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Ollama chat request
 */
export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
}

/**
 * Ollama chat response
 */
export interface OllamaChatResponse {
  model: string;
  message: {
    role: 'assistant';
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

/**
 * Ollama model info
 */
export interface OllamaModelInfo {
  name: string;
  modified_at: string;
  size: number;
}

/**
 * Default Ollama config from environment
 */
function getOllamaConfig(): OllamaConfig {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2',
    timeout: parseInt(process.env.OLLAMA_TIMEOUT || '60000', 10),
  };
}

/**
 * Ollama Client class
 */
export class OllamaClient {
  private config: OllamaConfig;
  private baseUrl: string;

  constructor(config?: Partial<OllamaConfig>) {
    this.config = { ...getOllamaConfig(), ...config };
    this.baseUrl = this.config.baseUrl.replace(/\/$/, '');
  }

  /**
   * Send a chat request to Ollama
   */
  async chat(messages: OllamaMessage[]): Promise<OllamaChatResponse> {
    const startTime = Date.now();

    try {
      const request: OllamaChatRequest = {
        model: this.config.model,
        messages,
        stream: false,
      };

      logger.info({
        model: this.config.model,
        messageCount: messages.length,
        baseUrl: this.baseUrl,
      }, 'Sending chat request to Ollama');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({
          status: response.status,
          error: errorText,
        }, 'Ollama chat request failed');
        throw new Error(`Ollama error: ${response.status} ${errorText}`);
      }

      const result: OllamaChatResponse = await response.json();

      logger.info({
        responseTime: Date.now() - startTime,
        evalCount: result.eval_count,
        promptEvalCount: result.prompt_eval_count,
      }, 'Ollama chat response received');

      return result;
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        baseUrl: this.baseUrl,
        model: this.config.model,
      }, 'Ollama chat error');
      throw error;
    }
  }

  /**
   * Generate a completion (simpler chat alternative)
   */
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: OllamaMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await this.chat(messages);
    return response.message.content;
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);

      if (!response.ok) {
        logger.error({
          status: response.status,
        }, 'Failed to list Ollama models');
        throw new Error(`Failed to list models: ${response.status}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
      }, 'Ollama list models error');
      throw error;
    }
  }

  /**
   * Check if Ollama is running and available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get current model name
   */
  getModel(): string {
    return this.config.model;
  }

  /**
   * Set model
   */
  setModel(model: string): void {
    this.config.model = model;
  }
}

/**
 * Default Ollama client instance
 */
export const ollamaClient = new OllamaClient();