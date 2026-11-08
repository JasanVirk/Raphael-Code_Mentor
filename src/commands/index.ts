import * as vscode from 'vscode';
import { SecretManager } from '../ai/secretManager';
import { DiagnosticService } from '../java/diagnosticService';
import { TutorViewProvider } from '../ui/tutorViewProvider';
import { explainErrorCommand } from './explainError';
import { giveHintCommand } from './giveHint';
import { setApiKeyCommand } from './setApiKey';
import { tryAgainCommand } from './tryAgain';

export function registerCommands(
    context: vscode.ExtensionContext,
    tutorProvider: TutorViewProvider,
    diagnosticService: DiagnosticService,
    secretManager: SecretManager
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('codementor.explainError', (editor?: vscode.TextEditor) =>
            explainErrorCommand(tutorProvider, diagnosticService, secretManager, editor)
        ),
        vscode.commands.registerCommand('codementor.giveHint', () =>
            giveHintCommand(tutorProvider, secretManager)
        ),
        vscode.commands.registerCommand('codementor.tryAgain', (editor?: vscode.TextEditor) =>
            tryAgainCommand(tutorProvider, diagnosticService, secretManager, editor)
        ),
        vscode.commands.registerCommand('codementor.setApiKey', () =>
            setApiKeyCommand(secretManager)
        ),
        vscode.commands.registerCommand('codementor.jumpToLine', async (line: number) => {
            const editor = vscode.window.activeTextEditor;
            if (editor && typeof line === 'number') {
                const targetLine = Math.max(0, line - 1);
                const range = new vscode.Range(targetLine, 0, targetLine, 0);
                editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                editor.selection = new vscode.Selection(range.start, range.end);
            }
        })
    );
}

export { explainErrorCommand, giveHintCommand, setApiKeyCommand, tryAgainCommand };
