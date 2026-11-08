import * as vscode from 'vscode';
import { AiProvider, createAiProvider, fallbackProvider } from '../ai';
import { SecretManager } from '../ai/secretManager';
import { contextBuilder } from '../context/contextBuilder';
import { DiagnosticService } from '../java/diagnosticService';
import { javaRunner } from '../java/javaRunner';
import { tutorSession } from '../tutor/tutorSession';
import { TutorViewProvider } from '../ui/tutorViewProvider';

let activeCts: vscode.CancellationTokenSource | null = null;
let activeSequence = 0;

export async function explainErrorCommand(
    tutorProvider?: TutorViewProvider,
    diagnosticService?: DiagnosticService,
    secretManager?: SecretManager,
    targetEditor?: vscode.TextEditor
): Promise<void> {
    const editor = targetEditor || vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('CodeMentor: Please open a Java file to analyze.');
        return;
    }

    if (!editor.document.fileName.endsWith('.java')) {
        vscode.window.showWarningMessage('CodeMentor: Currently only Java files (.java) are supported.');
        return;
    }

    // Edge case: empty Java file
    if (editor.document.getText().trim().length === 0) {
        const emptyMsg = 'This Java file is empty. Write a class or method to get started.';
        if (tutorProvider) {
            tutorProvider.showError(emptyMsg);
        }
        vscode.window.showInformationMessage(`CodeMentor: ${emptyMsg}`);
        return;
    }

    // Save document if dirty to ensure javac compiles the latest code
    if (editor.document.isDirty) {
        await editor.document.save();
    }

    const documentVersion = editor.document.version;
    const documentUri = editor.document.uri;

    // Cancellation: Abort previous running analysis if any
    if (activeCts) {
        activeCts.cancel();
        activeCts.dispose();
    }
    activeCts = new vscode.CancellationTokenSource();
    const currentCts = activeCts;
    const currentSeq = ++activeSequence;

    const abortController = new AbortController();
    currentCts.token.onCancellationRequested(() => {
        abortController.abort();
    });

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'CodeMentor: Analyzing Java file...',
            cancellable: true,
        },
        async (progress, token) => {
            token.onCancellationRequested(() => {
                currentCts.cancel();
                abortController.abort();
            });

            // Notify UI of loading state
            if (tutorProvider) {
                tutorProvider.setLoading('Analyzing your Java code with compiler and runtime checks...');
            }

            // Step 1: Check Java environment
            progress.report({ message: 'Verifying Java environment...' });
            const env = await javaRunner.checkEnvironment();

            if (currentCts.token.isCancellationRequested || currentSeq !== activeSequence) {
                return;
            }

            if (!env.isJavacAvailable || !env.isJavaAvailable) {
                const errorMsg = 'Java/JDK could not be found. Please ensure both java and javac are available in PATH.';
                if (tutorProvider) {
                    tutorProvider.showError(errorMsg);
                }
                vscode.window.showErrorMessage(`CodeMentor: ${errorMsg}`);
                return;
            }

            // Step 2: Compile Java file in sandboxed temporary directory
            progress.report({ message: 'Compiling with javac...' });
            const compileResult = await javaRunner.compile(editor.document.fileName, abortController.signal);

            if (currentCts.token.isCancellationRequested || currentSeq !== activeSequence) {
                if (compileResult.tempDir) {
                    await javaRunner.cleanupTempDir(compileResult.tempDir);
                }
                return;
            }

            // Check if document was modified while compilation was executing
            if (editor.document.version !== documentVersion) {
                if (compileResult.tempDir) {
                    await javaRunner.cleanupTempDir(compileResult.tempDir);
                }
                if (tutorProvider) {
                    tutorProvider.setLoading('Code modified. Click Try Again to re-analyze.');
                }
                return;
            }

            // If compilation fails, report compiler diagnostics and generate tutoring lesson
            if (!compileResult.success && compileResult.diagnostics.length > 0) {
                if (compileResult.tempDir) {
                    await javaRunner.cleanupTempDir(compileResult.tempDir);
                }

                if (diagnosticService) {
                    diagnosticService.setDiagnostics(editor.document, compileResult.diagnostics);
                }

                const primaryDiagnostic = compileResult.diagnostics[0];
                const targetLine = Math.max(0, primaryDiagnostic.line - 1);
                const range = new vscode.Range(targetLine, 0, targetLine, 0);
                editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

                // Build code context around diagnostic
                const fileContent = editor.document.getText();
                const selection = editor.selection.isEmpty ? undefined : editor.document.getText(editor.selection);
                const codeContext = contextBuilder.buildContext(fileContent, primaryDiagnostic, selection);

                progress.report({ message: 'Generating tutoring explanation...' });
                if (tutorProvider) {
                    tutorProvider.setLoading('Generating personalized tutoring explanation...');
                }

                // Determine AI Provider (Gemini if consented + key exists, otherwise fallback offline provider)
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

                try {
                    const tutorResponse = await ai.explain({
                        diagnostic: primaryDiagnostic,
                        context: codeContext.sourceCodeSnippet,
                        mode: 'explain',
                        hintLevel: 1,
                        userSelection: selection,
                        signal: abortController.signal,
                    });

                    if (currentCts.token.isCancellationRequested || currentSeq !== activeSequence) {
                        return;
                    }

                    tutorSession.startSession(
                        editor.document.fileName,
                        primaryDiagnostic,
                        tutorResponse,
                        codeContext.sourceCodeSnippet
                    );

                    if (tutorProvider) {
                        tutorProvider.updateTutorResponse(tutorResponse, primaryDiagnostic, 1);
                    }

                    vscode.window.showInformationMessage(
                        `CodeMentor: Detected compilation error on line ${primaryDiagnostic.line}: ${primaryDiagnostic.message}`
                    );
                } catch (err: unknown) {
                    if (currentCts.token.isCancellationRequested || currentSeq !== activeSequence) {
                        return;
                    }

                    console.error('CodeMentor explanation failed:', err);
                    const fallbackResponse = await fallbackProvider.explain({
                        diagnostic: primaryDiagnostic,
                        context: codeContext.sourceCodeSnippet,
                        mode: 'explain',
                        hintLevel: 1,
                    });

                    tutorSession.startSession(
                        editor.document.fileName,
                        primaryDiagnostic,
                        fallbackResponse,
                        codeContext.sourceCodeSnippet
                    );

                    if (tutorProvider) {
                        tutorProvider.updateTutorResponse(fallbackResponse, primaryDiagnostic, 1);
                    }
                }
                return;
            }

            // Step 3: Compilation succeeded; check if file contains a main method to execute
            if (compileResult.tempDir) {
                try {
                    progress.report({ message: 'Checking for main method...' });
                    const mainClassName = await javaRunner.findMainClassName(
                        editor.document.fileName,
                        compileResult.tempDir
                    );

                    if (mainClassName) {
                        progress.report({ message: `Executing ${mainClassName}...` });
                        if (tutorProvider) {
                            tutorProvider.setLoading('Executing Java program to check for runtime issues...');
                        }

                        // Execute compiled class with safety timeout and cancellation
                        const execResult = await javaRunner.execute(
                            mainClassName,
                            compileResult.tempDir,
                            javaRunner.defaultRuntimeTimeoutMs,
                            editor.document.fileName,
                            abortController.signal
                        );

                        if (currentCts.token.isCancellationRequested || currentSeq !== activeSequence) {
                            return;
                        }

                        if (!execResult.success && execResult.diagnostics.length > 0) {
                            if (diagnosticService) {
                                diagnosticService.setDiagnostics(editor.document, execResult.diagnostics);
                            }

                            const primaryRuntimeDiagnostic = execResult.diagnostics[0];
                            const targetLine = Math.max(0, primaryRuntimeDiagnostic.line - 1);
                            const range = new vscode.Range(targetLine, 0, targetLine, 0);
                            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

                            const fileContent = editor.document.getText();
                            const selection = editor.selection.isEmpty ? undefined : editor.document.getText(editor.selection);
                            const codeContext = contextBuilder.buildContext(fileContent, primaryRuntimeDiagnostic, selection);

                            progress.report({ message: 'Analyzing runtime exception...' });
                            if (tutorProvider) {
                                tutorProvider.setLoading('Analyzing runtime exception with CodeMentor...');
                            }

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

                            try {
                                const tutorResponse = await ai.explain({
                                    diagnostic: primaryRuntimeDiagnostic,
                                    context: codeContext.sourceCodeSnippet,
                                    mode: 'explain',
                                    hintLevel: 1,
                                    userSelection: selection,
                                    signal: abortController.signal,
                                });

                                if (currentCts.token.isCancellationRequested || currentSeq !== activeSequence) {
                                    return;
                                }

                                tutorSession.startSession(
                                    editor.document.fileName,
                                    primaryRuntimeDiagnostic,
                                    tutorResponse,
                                    codeContext.sourceCodeSnippet
                                );

                                if (tutorProvider) {
                                    tutorProvider.updateTutorResponse(tutorResponse, primaryRuntimeDiagnostic, 1);
                                }

                                vscode.window.showInformationMessage(
                                    `CodeMentor: Detected runtime error on line ${primaryRuntimeDiagnostic.line}: ${primaryRuntimeDiagnostic.message}`
                                );
                            } catch (err: unknown) {
                                if (currentCts.token.isCancellationRequested || currentSeq !== activeSequence) {
                                    return;
                                }

                                console.error('CodeMentor runtime explanation failed:', err);
                                const fallbackResponse = await fallbackProvider.explain({
                                    diagnostic: primaryRuntimeDiagnostic,
                                    context: codeContext.sourceCodeSnippet,
                                    mode: 'explain',
                                    hintLevel: 1,
                                });

                                tutorSession.startSession(
                                    editor.document.fileName,
                                    primaryRuntimeDiagnostic,
                                    fallbackResponse,
                                    codeContext.sourceCodeSnippet
                                );

                                if (tutorProvider) {
                                    tutorProvider.updateTutorResponse(fallbackResponse, primaryRuntimeDiagnostic, 1);
                                }
                            }
                            return;
                        }
                    } else {
                        // Compiled successfully but no main method found
                        if (diagnosticService) {
                            diagnosticService.clearDiagnostics(documentUri);
                        }
                        tutorSession.reset();

                        if (tutorProvider) {
                            tutorProvider.showSuccess('Compiled successfully! (Note: No main method found to execute as a program).');
                        }

                        vscode.window.showInformationMessage(
                            'CodeMentor: Program compiled successfully with no errors!'
                        );
                        return;
                    }
                } finally {
                    await javaRunner.cleanupTempDir(compileResult.tempDir);
                }
            }

            // Step 4: No compiler or runtime errors detected -> Success state
            if (diagnosticService) {
                diagnosticService.clearDiagnostics(documentUri);
            }
            tutorSession.reset();

            if (tutorProvider) {
                tutorProvider.showSuccess('No errors found! Your Java program compiled and executed cleanly.');
            }

            vscode.window.showInformationMessage(
                'CodeMentor: Program compiled and ran successfully with no errors!'
            );
        }
    );
}
