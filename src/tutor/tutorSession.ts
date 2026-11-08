import { TutorResponse } from '../ai/schema';
import { JavaDiagnostic } from '../java/types';

export class TutorSession {
    private currentFile: string | null = null;
    private currentDiagnostic: JavaDiagnostic | null = null;
    private currentResponse: TutorResponse | null = null;
    private hintLevel: number = 1;
    private readonly maxHintLevel: number = 3;

    private currentContextSnippet: string = '';

    public startSession(
        file: string,
        diagnostic: JavaDiagnostic,
        initialResponse: TutorResponse,
        contextSnippet?: string
    ): void {
        this.currentFile = file;
        this.currentDiagnostic = diagnostic;
        this.currentResponse = initialResponse;
        this.currentContextSnippet = contextSnippet || '';
        this.hintLevel = 1;
    }

    public getHintLevel(): number {
        return this.hintLevel;
    }

    public canRequestNextHint(): boolean {
        return this.hintLevel < this.maxHintLevel;
    }

    public incrementHintLevel(): number {
        if (this.canRequestNextHint()) {
            this.hintLevel += 1;
        }
        return this.hintLevel;
    }

    public updateResponse(response: TutorResponse): void {
        this.currentResponse = response;
    }

    public getCurrentDiagnostic(): JavaDiagnostic | null {
        return this.currentDiagnostic;
    }

    public getCurrentResponse(): TutorResponse | null {
        return this.currentResponse;
    }

    public getCurrentFile(): string | null {
        return this.currentFile;
    }

    public getCurrentContextSnippet(): string {
        return this.currentContextSnippet;
    }

    public reset(): void {
        this.currentFile = null;
        this.currentDiagnostic = null;
        this.currentResponse = null;
        this.currentContextSnippet = '';
        this.hintLevel = 1;
    }
}

export const tutorSession = new TutorSession();
