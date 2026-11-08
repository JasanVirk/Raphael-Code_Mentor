import { TutorRequest, TutorResponse } from './schema';

export interface AiProvider {
    readonly providerName: string;
    explain(request: TutorRequest): Promise<TutorResponse>;
}

export class MockAiProvider implements AiProvider {
    public readonly providerName = 'MockAiProvider';

    public async explain(request: TutorRequest): Promise<TutorResponse> {
        return {
            errorSummary: request.diagnostic.message || 'Syntax or runtime issue detected',
            whatHappened: `The Java compiler or runtime reported: ${request.diagnostic.message}`,
            why: 'The program encountered an unexpected token or unsatisfied condition at runtime.',
            location: {
                line: request.diagnostic.line,
                note: `Look at line ${request.diagnostic.line}.`,
            },
            concept: {
                name: request.diagnostic.exceptionType || 'Java Syntax Rule',
                explanation: 'Java requires code to adhere strictly to type rules and grammar syntax.',
            },
            hint: `Check line ${request.diagnostic.line} for missing punctuation or variable definitions.`,
            example: 'int value = 42;',
            learningQuestion: 'What does the compiler expect at this position?',
            nextHintAvailable: request.hintLevel < 3,
        };
    }
}
