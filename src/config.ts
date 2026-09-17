export type ModelConfig = {
  apiKey: string;
  httpReferer: string;
  xTitle: string;

  provider: {
    sort: {
      by: string;
      partition: string;
    };
  };

  models: string[];
  temperature: number;
  maxTokens: number;
};

console.assert(process.env.OPENROUTER_API_KEY, 'OPENROUTER_API_KEY is not set in environment variables');

export const config: ModelConfig = {
  apiKey: process.env.OPENROUTER_API_KEY!,
  httpReferer: '',
  xTitle: 'IA Devs - Transforming Services into Tools',
  // OpenRouter usa este array como cadeia de fallback: se o primeiro modelo
  // estiver sobrecarregado (503) ou fora do ar (404), cai para o proximo.
  // Todos suportam tools + structured_outputs, exigidos por generateStructured.
  models: [
    'dots-studio/dots-3-note-preview:free',
    'nex-agi/nex-n2.5-pro:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
  ],
  provider: {
    sort: {
      by: 'throughput', // Route to model with highest throughput (fastest response)
      partition: 'none',
    },
  },
  temperature: 0.7,
  maxTokens: 2048,
};
