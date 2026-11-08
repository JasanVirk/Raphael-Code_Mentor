import { JavaDiagnostic } from '../java/types';

export type TutorMode = 'hint' | 'explain' | 'guided' | 'solution';

export interface LocationDetail {
    line: number;
    note?: string;
}

export interface ConceptDetail {
    name: string;
    explanation: string;
}

export interface TutorResponse {
    errorSummary: string;
    whatHappened: string;
    why: string;
    location?: LocationDetail;
    concept: ConceptDetail;
    hint: string;
    example?: string;
    learningQuestion?: string;
    nextHintAvailable?: boolean;
}

export interface TutorRequest {
    diagnostic: JavaDiagnostic;
    context: string;
    mode: TutorMode;
    hintLevel: number;
    userSelection?: string;
    signal?: AbortSignal;
}
