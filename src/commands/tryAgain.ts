import * as vscode from 'vscode';
import { SecretManager } from '../ai/secretManager';
import { DiagnosticService } from '../java/diagnosticService';
import { tutorSession } from '../tutor/tutorSession';
import { TutorViewProvider } from '../ui/tutorViewProvider';
import { explainErrorCommand } from './explainError';

export async function tryAgainCommand(
    tutorProvider?: TutorViewProvider,
    diagnosticService?: DiagnosticService,
    secretManager?: SecretManager,
    targetEditor?: vscode.TextEditor
): Promise<void> {
    const editor = targetEditor || vscode.window.activeTextEditor;
    if (!editor || !editor.document.fileName.endsWith('.java')) {
        vscode.window.showInformationMessage('CodeMentor: Please open a Java file to re-analyze.');
        return;
    }

    tutorSession.reset();
    await explainErrorCommand(tutorProvider, diagnosticService, secretManager, editor);
}
