/**
 * Bot Configuration
 * Centralizes limits, feature flags, and system instructions.
 */

export const config = {
  // Feature Flags
  features: {
    audioInput: true,
    audioOutput: true,
    imageInput: true,
    imageOutput: false, // Not yet implemented
  },

  // Limits & Safety
  limits: {
    maxInputCharacters: 4096, // WhatsApp limit is higher, but good to cap for AI
    maxOutputTokens: 1000,
    chatHistoryLimit: 20,
    maxMessagesPerChat: 500, // Prevent abuse
    maxAudioDurationSeconds: 120, // 2 minutes
    maxImageSizeBytes: 5 * 1024 * 1024, // 5MB
  },

  // System Instructions
  botInstructions: `You are WatchVerify AI, a specialized assistant for a luxury watch authentication service.
Your primary role is to assist customers with:
1. Verifying the authenticity of luxury watches.
2. Booking appointments to visit our store.
3. Answering questions about our catalog and services.

Tone & Style:
- Professional, knowledgeable, and polite.
- Concise and direct.
- Use Portuguese (PT-BR) by default, unless the user speaks another language.

Rules:
- Do NOT hallucinate. If you don't know something, ask for more information or offer to connect with a human.
- Do NOT process requests unrelated to watches, jewelry, or our services.
- If a user sends a photo, assume it's for verification or catalog matching.
- If a user asks to talk to a human, respect that immediately.`,

  // Message Templates
  messages: {
    unknownCommand: 'Desculpe, não entendi. Poderia reformular?',
    audioNotSupported: 'Desculpe, não consigo processar áudios no momento. Por favor, envie texto.',
    imageNotSupported: 'Desculpe, não consigo processar imagens no momento.',
    tooManyMessages: 'Você atingiu o limite de mensagens. Um de nossos atendentes entrará em contato em breve.',
    error: 'Tive um problema técnico. Por favor, tente novamente mais tarde.',
  }
}
