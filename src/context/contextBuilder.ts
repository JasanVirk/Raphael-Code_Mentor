import { JavaDiagnostic } from '../java/types';

export interface CodeContext {
    diagnostic: JavaDiagnostic;
    sourceCodeSnippet: string;
    line: number;
    surroundingLinesCount: number;
    totalChars: number;
    userSelection?: string;
}

export class ContextBuilder {
    private readonly defaultWindowRadius: number = 15;
    private readonly maxContextChars: number = 6000;

    /**
     * Builds structured context around the specified diagnostic.
     */
    public buildContext(
        fileContent: string,
        diagnostic: JavaDiagnostic,
        userSelection?: string
    ): CodeContext {
        const lines = fileContent.split(/\r?\n/);
        const targetLineIndex = Math.max(0, diagnostic.line - 1);
        const startLineIndex = Math.max(0, targetLineIndex - this.defaultWindowRadius);
        const endLineIndex = Math.min(lines.length - 1, targetLineIndex + this.defaultWindowRadius);

        const snippetLines = lines.slice(startLineIndex, endLineIndex + 1);
        let snippet = snippetLines.join('\n');

        if (snippet.length > this.maxContextChars) {
            snippet = snippet.substring(0, this.maxContextChars) + '\n... [Context truncated]';
        }

        return {
            diagnostic,
            sourceCodeSnippet: snippet,
            line: diagnostic.line,
            surroundingLinesCount: snippetLines.length,
            totalChars: snippet.length,
            userSelection,
        };
    }
}

export const contextBuilder = new ContextBuilder();
