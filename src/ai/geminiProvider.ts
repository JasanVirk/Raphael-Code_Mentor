import { AiProvider } from './aiProvider';
import { fallbackProvider } from './fallbackProvider';
import { promptBuilder } from './promptBuilder';
import { responseParser } from './responseParser';
import { TutorRequest, TutorResponse } from './schema';

export class GeminiAiProvider implements AiProvider {
    public readonly providerName = 'GeminiAiProvider';
    private readonly defaultModel = 'gemini-1.5-flash';
    private readonly timeoutMs = 15000;

    constructor(
        private readonly apiKey: string,
        private readonly modelName: string = 'gemini-1.5-flash'
    ) {}

    public async explain(request: TutorRequest): Promise<TutorResponse> {
        if (!this.apiKey || this.apiKey.trim().length === 0) {
            return fallbackProvider.explain(request);
        }

        const systemPrompt = promptBuilder.buildSystemPrompt();
        const userPrompt = promptBuilder.buildUserPrompt(request);

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName || this.defaultModel}:generateContent?key=${encodeURIComponent(
            this.apiKey.trim()
        )}`;

        const requestBody = {
            systemInstruction: {
                parts: [{ text: systemPrompt }],
            },
            contents: [
                {
                    role: 'user',
                    parts: [{ text: userPrompt }],
                },
            ],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2,
            },
        };

        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
            if (request.signal?.aborted) {
                throw new Error('Request was cancelled.');
            }

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

                const abortListener = () => controller.abort();
                if (request.signal) {
                    request.signal.addEventListener('abort', abortListener);
                }

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);
                if (request.signal) {
                    request.signal.removeEventListener('abort', abortListener);
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
                }

                const data = (await response.json()) as {
                    candidates?: Array<{
                        content?: {
                            parts?: Array<{ text?: string }>;
                        };
                    }>;
                };

                const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!candidateText) {
                    throw new Error('Empty response from Gemini API.');
                }

                return responseParser.parse(candidateText);
            } catch (err: unknown) {
                lastError = err instanceof Error ? err : new Error(String(err));
                if (attempt < 2) {
                    await new Promise((r) => setTimeout(r, 1000));
                }
            }
        }

        console.warn('Gemini API call failed, falling back to offline provider:', lastError?.message);
        return fallbackProvider.explain(request);
    }
}
