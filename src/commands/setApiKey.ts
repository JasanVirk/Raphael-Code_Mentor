import * as vscode from 'vscode';
import { SecretManager } from '../ai/secretManager';

export async function setApiKeyCommand(secretManager: SecretManager): Promise<void> {
    const existingKey = await secretManager.getApiKey();
    const hasExisting = Boolean(existingKey && existingKey.trim().length > 0);

    const input = await vscode.window.showInputBox({
        title: 'CodeMentor: Set API Key',
        prompt: hasExisting
            ? 'Enter your API Key (e.g. Google Gemini API Key), or leave blank to clear the existing key:'
            : 'Enter your API Key (e.g. Google Gemini API Key):',
        password: true,
        ignoreFocusOut: true,
        placeHolder: 'AIzaSy...',
    });

    if (input === undefined) {
        // User pressed Esc / cancelled
        return;
    }

    const trimmed = input.trim();
    if (trimmed.length === 0) {
        if (hasExisting) {
            await secretManager.deleteApiKey();
            vscode.window.showInformationMessage('CodeMentor: API key removed. Using offline fallback explanations.');
        } else {
            vscode.window.showInformationMessage('CodeMentor: No API key was entered.');
        }
        return;
    }

    await secretManager.storeApiKey(trimmed);
    vscode.window.showInformationMessage('CodeMentor: API key saved securely in SecretStorage.');
}
