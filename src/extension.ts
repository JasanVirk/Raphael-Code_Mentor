import * as vscode from 'vscode';
import { SecretManager } from './ai';
import { registerCommands } from './commands';
import { DiagnosticService } from './java/diagnosticService';
import { tutorSession, TutorSession } from './tutor/tutorSession';
import { TutorViewProvider } from './ui/tutorViewProvider';

export interface CodeMentorApi {
    tutorSession: TutorSession;
    diagnosticService: DiagnosticService;
    tutorProvider: TutorViewProvider;
}

export function activate(context: vscode.ExtensionContext): CodeMentorApi {
    console.log('CodeMentor extension is now active!');

    // Initialize CodeMentor diagnostic service
    const diagnosticService = new DiagnosticService();
    context.subscriptions.push(diagnosticService);

    // Register Webview View Provider for sidebar tutor
    const tutorProvider = new TutorViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(TutorViewProvider.viewType, tutorProvider)
    );

    // Initialize SecretManager for secure API key and privacy preferences
    const secretManager = new SecretManager(context.secrets, context.globalState);

    // Register CodeMentor commands
    registerCommands(context, tutorProvider, diagnosticService, secretManager);

    // Preserve scaffold helloWorld command for compatibility during transition
    const helloWorldDisposable = vscode.commands.registerCommand('codementor.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from CodeMentor!');
    });
    context.subscriptions.push(helloWorldDisposable);

    return {
        tutorSession,
        diagnosticService,
        tutorProvider,
    };
}

export function deactivate() {}
