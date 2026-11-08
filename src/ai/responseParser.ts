import { TutorResponse } from './schema';

export class ResponseParser {
    /**
     * Extracts and validates the TutorResponse JSON object from raw LLM text.
     */
    public parse(rawText: string): TutorResponse {
        const cleaned = this.extractJsonString(rawText);
        const parsed = JSON.parse(cleaned) as Partial<TutorResponse>;

        if (!parsed.errorSummary || !parsed.whatHappened || !parsed.hint) {
            throw new Error('AI response is missing required TutorResponse fields.');
        }

        return {
            errorSummary: String(parsed.errorSummary),
            whatHappened: String(parsed.whatHappened),
            why: String(parsed.why || ''),
            location: parsed.location,
            concept: parsed.concept || { name: 'Java Concept', explanation: '' },
            hint: String(parsed.hint),
            example: parsed.example,
            learningQuestion: parsed.learningQuestion,
            nextHintAvailable: Boolean(parsed.nextHintAvailable),
        };
    }

    private extractJsonString(text: string): string {
        const trimmed = text.trim();
        const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonBlockMatch) {
            return jsonBlockMatch[1].trim();
        }
        return trimmed;
    }
}

export const responseParser = new ResponseParser();
