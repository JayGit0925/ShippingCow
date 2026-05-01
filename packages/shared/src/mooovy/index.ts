export * from './system-prompts';
export * from './chat-prompts';

export const MOOOVY_MODELS = {
  chat:     'claude-sonnet-4-20250514',  // Mooovy chat, parsing, insights
  classify: 'claude-haiku-4-5-20251001', // schema detection, category tagging
} as const;
