import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import type { CodeMentorApi } from '../extension';
import { TutorViewProvider } from '../ui/tutorViewProvider';

suite('CodeMentor Integration & UI Test Suite', () => {
    vscode.window.showInformationMessage('Starting CodeMentor integration tests...');

    let api: CodeMentorApi;

    suiteSetup(async function (this: Mocha.Context) {
        this.timeout(10000);
        process.env.VSCODE_TEST = '1';
        const ext = vscode.extensions.all.find((e) => e.id.toLowerCase().includes('codementor'));
        if (ext) {
            api = await ext.activate();
        }
    });

    test('All CodeMentor commands are registered in VS Code', async () => {
        const commands = await vscode.commands.getCommands(true);

        const expectedCommands = [
            'codementor.explainError',
            'codementor.giveHint',
            'codementor.tryAgain',
            'codementor.setApiKey',
            'codementor.jumpToLine',
        ];

        for (const cmd of expectedCommands) {
            assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`);
        }
    });

    test('codementor.explainError on missingSemicolon.java populates diagnostics and starts tutor session', async function (this: Mocha.Context) {
        this.timeout(15000);

        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/missingSemicolon.java');
        const document = await vscode.workspace.openTextDocument(fixturePath);
        const editor = await vscode.window.showTextDocument(document);

        await vscode.commands.executeCommand('codementor.explainError', editor);

        const diagnostic = api.tutorSession.getCurrentDiagnostic();
        assert.ok(diagnostic, 'Diagnostic should be recorded in tutorSession');
        assert.strictEqual(diagnostic?.line, 3);
        assert.ok(diagnostic?.message.includes("';' expected"));

        const response = api.tutorSession.getCurrentResponse();
        assert.ok(response, 'TutorResponse should be generated');
        assert.ok(response?.whatHappened.length > 0);
        assert.ok(response?.hint.length > 0);
        assert.strictEqual(api.tutorSession.getHintLevel(), 1);

        const vscodeDiags = vscode.languages.getDiagnostics(document.uri);
        assert.ok(vscodeDiags.length > 0, 'VS Code DiagnosticCollection should contain compiler diagnostics');
        assert.strictEqual(vscodeDiags[0].range.start.line, 2); // 0-indexed line 3
    });

    test('codementor.giveHint advances progressive hint level', async function (this: Mocha.Context) {
        this.timeout(10000);

        assert.ok(api.tutorSession.getCurrentDiagnostic(), 'Should have active session from previous test');
        const initialLevel = api.tutorSession.getHintLevel();

        await vscode.commands.executeCommand('codementor.giveHint');
        assert.strictEqual(api.tutorSession.getHintLevel(), initialLevel + 1);
    });

    test('codementor.jumpToLine reveals target line in active editor', async () => {
        await vscode.commands.executeCommand('codementor.jumpToLine', 3);

        const editor = vscode.window.activeTextEditor;
        assert.ok(editor, 'Active text editor should be present');
        assert.strictEqual(editor?.selection.active.line, 2); // line 3 is index 2
    });

    test('codementor.tryAgain re-runs analysis successfully', async function (this: Mocha.Context) {
        this.timeout(15000);

        const editor = vscode.window.activeTextEditor;
        await vscode.commands.executeCommand('codementor.tryAgain', editor);
        const diag = api.tutorSession.getCurrentDiagnostic();
        assert.ok(diag, 'Diagnostic should still be detected after Try Again');
        assert.strictEqual(api.tutorSession.getHintLevel(), 1, 'Hint level should reset to 1 on re-analysis');
    });

    test('TutorViewProvider API methods execute safely', () => {
        const dummyUri = vscode.Uri.file(__dirname);
        const provider = new TutorViewProvider(dummyUri);

        // Verify methods do not throw even when webview is not yet attached
        assert.doesNotThrow(() => provider.setLoading('Loading test...'));
        assert.doesNotThrow(() => provider.showSuccess('Success test'));
        assert.doesNotThrow(() => provider.showError('Error test'));
        assert.doesNotThrow(() => provider.reset());
        assert.doesNotThrow(() =>
            provider.updateTutorResponse({
                errorSummary: 'Test',
                whatHappened: 'Test',
                why: 'Test',
                concept: { name: 'Test', explanation: 'Test' },
                hint: 'Test',
            })
        );
    });
});
