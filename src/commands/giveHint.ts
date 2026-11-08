import * as vscode from 'vscode';
import { AiProvider, createAiProvider, fallbackProvider } from '../ai';
import { SecretManager } from '../ai/secretManager';
import { tutorSession } from '../tutor/tutorSession';
import { TutorViewProvider } from '../ui/tutorViewProvider';

export async function giveHintCommand(
    tutorProvider?: TutorViewProvider,
    secretManager?: SecretManager
): Promise<void> {
    const diagnostic = tutorSession.getCurrentDiagnostic();
    if (!diagnostic) {
        vscode.window.showInformationMessage('CodeMentor: No active diagnostic. Run "CodeMentor: Explain Error" first.');
        return;
    }

    if (!tutorSession.canRequestNextHint()) {
        vscode.window.showInformationMessage('CodeMentor: You have already reached the maximum hint level (Level 3 of 3).');
        return;
    }

    const nextLevel = tutorSession.incrementHintLevel();

    if (tutorProvider) {
        tutorProvider.setLoading(`Preparing Hint Level ${nextLevel} of 3...`);
    }

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `CodeMentor: Unlocking Hint Level ${nextLevel} of 3...`,
            cancellable: true,
        },
        async (_progress, token) => {
            const abortController = new AbortController();
            token.onCancellationRequested(() => abortController.abort());

            let ai: AiProvider = fallbackProvider;
            if (secretManager) {
                const hasConsent = await secretManager.requestConsentIfNeeded();
                if (hasConsent) {
                    const apiKey = await secretManager.getApiKey();
                    if (apiKey && apiKey.trim().length > 0) {
                        ai = createAiProvider(apiKey);
                    }
                }
            }

            const contextSnippet = tutorSession.getCurrentContextSnippet();

            try {
                const hintResponse = await ai.explain({
                    diagnostic,
                    context: contextSnippet,
                    mode: 'hint',
                    hintLevel: nextLevel,
                    signal: abortController.signal,
                });

                if (token.isCancellationRequested) {
                    return;
                }

                tutorSession.updateResponse(hintResponse);

                if (tutorProvider) {
                    tutorProvider.updateTutorResponse(hintResponse, diagnostic, nextLevel);
                }
            } catch (err: unknown) {
                if (token.isCancellationRequested) {
                    return;
                }

                console.error('CodeMentor giveHint error:', err);
                const fallbackResponse = await fallbackProvider.explain({
                    diagnostic,
                    context: contextSnippet,
                    mode: 'hint',
                    hintLevel: nextLevel,
                });

                tutorSession.updateResponse(fallbackResponse);

                if (tutorProvider) {
                    tutorProvider.updateTutorResponse(fallbackResponse, diagnostic, nextLevel);
                }
            }
        }
    );
}
