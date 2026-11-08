import * as crypto from 'crypto';
import * as vscode from 'vscode';
import { TutorResponse } from '../ai/schema';
import { JavaDiagnostic } from '../java/types';

export class TutorViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codementor.tutorView';

    private view?: vscode.WebviewView;

    constructor(private readonly extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri],
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage((message) => {
            switch (message.type) {
                case 'giveHint':
                    vscode.commands.executeCommand('codementor.giveHint');
                    break;
                case 'tryAgain':
                    vscode.commands.executeCommand('codementor.tryAgain');
                    break;
                case 'explainError':
                    vscode.commands.executeCommand('codementor.explainError');
                    break;
                case 'jumpToLine':
                    if (typeof message.line === 'number') {
                        vscode.commands.executeCommand('codementor.jumpToLine', message.line);
                    }
                    break;
            }
        });
    }

    public setLoading(message?: string): void {
        if (this.view) {
            this.view.webview.postMessage({
                type: 'setLoading',
                message: message || 'Analyzing your code...',
            });
        }
    }

    public updateTutorResponse(
        response: TutorResponse,
        diagnostic?: JavaDiagnostic,
        hintLevel: number = 1
    ): void {
        if (this.view) {
            this.view.webview.postMessage({
                type: 'showExplanation',
                payload: {
                    response,
                    diagnostic,
                    hintLevel,
                },
            });
        }
    }

    public showSuccess(message: string): void {
        if (this.view) {
            this.view.webview.postMessage({
                type: 'showSuccess',
                message,
            });
        }
    }

    public showError(message: string): void {
        if (this.view) {
            this.view.webview.postMessage({
                type: 'showError',
                message,
            });
        }
    }

    public reset(): void {
        if (this.view) {
            this.view.webview.postMessage({
                type: 'reset',
            });
        }
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'main.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'main.css')
        );

        const nonce = crypto.randomBytes(16).toString('base64');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https:;">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeMentor</title>
    <link rel="stylesheet" href="${styleUri}">
</head>
<body>
    <div class="tutor-header">
        <div class="tutor-title">
            <span>&#127891;</span>
            <span>CodeMentor</span>
        </div>
        <span class="brand-badge">Tutor</span>
    </div>
    <div id="app-root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}
