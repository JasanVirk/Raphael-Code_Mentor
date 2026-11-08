import * as vscode from 'vscode';
import { JavaDiagnostic } from './types';

export class DiagnosticService {
    private readonly collection: vscode.DiagnosticCollection;

    constructor(collection?: vscode.DiagnosticCollection) {
        this.collection = collection || vscode.languages.createDiagnosticCollection('codementor');
    }

    public getCollection(): vscode.DiagnosticCollection {
        return this.collection;
    }

    /**
     * Updates VS Code Problems panel and editor squiggles for a document.
     */
    public setDiagnostics(document: vscode.TextDocument, diagnostics: JavaDiagnostic[]): void {
        const vsDiagnostics: vscode.Diagnostic[] = diagnostics.map((d) => {
            const line = Math.max(0, d.line - 1);
            let startCol = 0;
            let endCol = Number.MAX_SAFE_INTEGER;

            try {
                const lineText = document.lineAt(line).text;
                if (d.column !== undefined && d.column > 0) {
                    startCol = Math.min(Math.max(0, d.column - 1), lineText.length);
                    // Highlight from column to end of current word or line
                    const remaining = lineText.substring(startCol);
                    const wordMatch = remaining.match(/^(\w+|[^\s\w]+)/);
                    endCol = wordMatch ? startCol + wordMatch[1].length : Math.max(startCol + 1, lineText.length);
                } else {
                    startCol = lineText.search(/\S/);
                    if (startCol === -1) {
                        startCol = 0;
                    }
                    endCol = lineText.length;
                }
            } catch {
                startCol = 0;
                endCol = 1;
            }

            const range = new vscode.Range(line, startCol, line, endCol);
            const severity = d.severity === 'warning'
                ? vscode.DiagnosticSeverity.Warning
                : vscode.DiagnosticSeverity.Error;

            const diagnostic = new vscode.Diagnostic(range, d.message, severity);
            diagnostic.source = 'CodeMentor';
            return diagnostic;
        });

        this.collection.set(document.uri, vsDiagnostics);
    }

    public clearDiagnostics(uri?: vscode.Uri): void {
        if (uri) {
            this.collection.delete(uri);
        } else {
            this.collection.clear();
        }
    }

    public dispose(): void {
        this.collection.dispose();
    }
}
