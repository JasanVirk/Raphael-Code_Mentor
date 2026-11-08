import { AiProvider, MockAiProvider } from './aiProvider';
import { fallbackProvider, FallbackProvider } from './fallbackProvider';
import { GeminiAiProvider } from './geminiProvider';
import { promptBuilder, PromptBuilder } from './promptBuilder';
import { responseParser, ResponseParser } from './responseParser';
import { TutorMode, TutorRequest, TutorResponse } from './schema';
import { SecretManager } from './secretManager';

export function createAiProvider(apiKey?: string, modelName?: string): AiProvider {
    if (apiKey && apiKey.trim().length > 0) {
        return new GeminiAiProvider(apiKey, modelName);
    }
    return fallbackProvider;
}

export {
    AiProvider,
    FallbackProvider,
    fallbackProvider,
    GeminiAiProvider,
    MockAiProvider,
    PromptBuilder,
    promptBuilder,
    ResponseParser,
    responseParser,
    SecretManager,
    TutorMode,
    TutorRequest,
    TutorResponse,
};
