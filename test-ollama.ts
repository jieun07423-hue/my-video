import { OllamaClient } from './app/lib/ollama';

async function main() {
  const client = new OllamaClient({ model: 'gemma4:latest' });
  console.log('Ollama 테스트 시작...');
  
  try {
    const response = await client.chat([
      { role: 'user', content: '안녕하세요, 간단히 인사해줘' }
    ]);
    console.log('결과:', response.message.content);
  } catch (error) {
    console.error('오류:', error instanceof Error ? error.message : String(error));
  }
}

main();