import * as assert from 'assert';
import { MockAiProvider } from '../ai/aiProvider';
import { FallbackProvider } from '../ai/fallbackProvider';
import { GeminiAiProvider } from '../ai/geminiProvider';
import { PromptBuilder } from '../ai/promptBuilder';
import { ResponseParser } from '../ai/responseParser';
import { TutorRequest } from '../ai/schema';
import { ContextBuilder } from '../context/contextBuilder';
import { JavaDiagnostic } from '../java/types';
import { TutorSession } from '../tutor/tutorSession';

suite('AI Tutor & Pedagogical Engine Test Suite', () => {
    const promptBuilder = new PromptBuilder();
    const responseParser = new ResponseParser();
    const contextBuilder = new ContextBuilder();
    const fallbackProvider = new FallbackProvider();

    const sampleDiagnostic: JavaDiagnostic = {
        kind: 'compile',
        file: 'C:\\Workspace\\Main.java',
        line: 5,
        column: 12,
        message: "';' expected",
        severity: 'error',
    };

    test('PromptBuilder generates pedagogical system prompt forbidding auto-fixes', () => {
        const sysPrompt = promptBuilder.buildSystemPrompt();
        assert.ok(sysPrompt.includes('CodeMentor'));
        assert.ok(sysPrompt.includes('Do NOT automatically fix'));
        assert.ok(sysPrompt.includes('pedagogical Java programming tutor'));
    });

    test('PromptBuilder builds user prompt with delimiter guards and diagnostic metadata', () => {
        const request: TutorRequest = {
            diagnostic: sampleDiagnostic,
            context: 'int x = 42\nSystem.out.println(x);',
            mode: 'hint',
            hintLevel: 2,
        };

        const userPrompt = promptBuilder.buildUserPrompt(request);
        assert.ok(userPrompt.includes('Mode: hint'));
        assert.ok(userPrompt.includes('Hint Level: 2 of 3'));
        assert.ok(userPrompt.includes("Line 5 [error]: ';' expected"));
        assert.ok(userPrompt.includes('--- BEGIN STUDENT CODE ---'));
        assert.ok(userPrompt.includes('int x = 42'));
        assert.ok(userPrompt.includes('--- END STUDENT CODE ---'));
    });

    test('ResponseParser correctly parses clean JSON string', () => {
        const json = JSON.stringify({
            errorSummary: 'Missing semicolon',
            whatHappened: 'A statement does not have a semicolon at the end.',
            why: 'Java syntax requires statements to end with ;',
            concept: { name: 'Semicolons', explanation: 'Statement separator' },
            hint: 'Look at line 5.',
            nextHintAvailable: true,
        });

        const parsed = responseParser.parse(json);
        assert.strictEqual(parsed.errorSummary, 'Missing semicolon');
        assert.strictEqual(parsed.whatHappened, 'A statement does not have a semicolon at the end.');
        assert.strictEqual(parsed.hint, 'Look at line 5.');
        assert.strictEqual(parsed.nextHintAvailable, true);
    });

    test('ResponseParser extracts JSON enclosed within markdown code blocks', () => {
        const markdown = [
            'Here is the requested analysis:',
            '```json',
            '{',
            '  "errorSummary": "Division by zero",',
            '  "whatHappened": "Cannot divide by 0",',
            '  "why": "Math rule",',
            '  "hint": "Check denominator"',
            '}',
            '```',
            'Hope this helps!',
        ].join('\n');

        const parsed = responseParser.parse(markdown);
        assert.strictEqual(parsed.errorSummary, 'Division by zero');
        assert.strictEqual(parsed.whatHappened, 'Cannot divide by 0');
        assert.strictEqual(parsed.hint, 'Check denominator');
    });

    test('ResponseParser throws when required fields are missing', () => {
        const invalidJson = JSON.stringify({
            why: 'Some explanation without whatHappened or hint',
        });

        assert.throws(() => {
            responseParser.parse(invalidJson);
        }, /missing required TutorResponse fields/);
    });

    test('ResponseParser throws when input is completely malformed JSON', () => {
        assert.throws(() => {
            responseParser.parse('This is not json { [ broken');
        }, SyntaxError);
    });

    test('ResponseParser tolerates extra unexpected fields and preserves valid schema', () => {
        const jsonWithExtra = JSON.stringify({
            errorSummary: 'Extra field test',
            whatHappened: 'Unexpected property present',
            why: 'Testing parser robustness',
            hint: 'Proceed normally',
            unexpectedField1: 'garbage',
            unexpectedField2: 999,
            internalMetadata: { debug: true },
        });

        const parsed = responseParser.parse(jsonWithExtra);
        assert.strictEqual(parsed.errorSummary, 'Extra field test');
        assert.strictEqual(parsed.whatHappened, 'Unexpected property present');
        assert.strictEqual(parsed.hint, 'Proceed normally');
    });

    test('PromptBuilder generates mode-specific instructions for guided and solution modes', () => {
        const guidedPrompt = promptBuilder.buildUserPrompt({
            diagnostic: sampleDiagnostic,
            context: 'int x = 42',
            mode: 'guided',
            hintLevel: 1,
        });
        assert.ok(guidedPrompt.includes('Mode: guided'));

        const solutionPrompt = promptBuilder.buildUserPrompt({
            diagnostic: sampleDiagnostic,
            context: 'int x = 42',
            mode: 'solution',
            hintLevel: 3,
        });
        assert.ok(solutionPrompt.includes('Mode: solution'));
    });

    test('ContextBuilder includes user selection when provided', () => {
        const fileContent = 'int a = 10;\nint b = 20;\nint c = a + b;';
        const selection = 'int b = 20;';

        const context = contextBuilder.buildContext(fileContent, sampleDiagnostic, selection);
        assert.strictEqual(context.userSelection, selection);
    });

    test('MockAiProvider end-to-end generates valid TutorResponse schema', async () => {
        const mockProvider = new MockAiProvider();

        const response = await mockProvider.explain({
            diagnostic: sampleDiagnostic,
            context: 'int x = 42',
            mode: 'explain',
            hintLevel: 1,
        });

        assert.ok(response.errorSummary.length > 0);
        assert.ok(response.whatHappened.length > 0);
        assert.ok(response.hint.length > 0);
        assert.ok(response.concept.name.length > 0);
        assert.strictEqual(response.nextHintAvailable, true);
    });

    test('ContextBuilder slices window around target line and enforces character limit', () => {
        // Create 50 lines of code
        const lines: string[] = [];
        for (let i = 1; i <= 50; i++) {
            lines.push(`int line_${i} = ${i};`);
        }
        const fileContent = lines.join('\n');

        const context = contextBuilder.buildContext(fileContent, sampleDiagnostic);
        assert.strictEqual(context.line, 5);
        // Window radius is 15 lines: 0 to (5 - 1 + 15) = 0 to 19 -> 20 lines
        assert.strictEqual(context.surroundingLinesCount, 20);
        assert.ok(context.sourceCodeSnippet.includes('int line_5 = 5;'));
    });

    test('ContextBuilder caps context exceeding 6,000 characters', () => {
        // Construct very long lines
        const lines: string[] = [];
        for (let i = 1; i <= 30; i++) {
            lines.push(`String long_str_${i} = "${'x'.repeat(300)}";`);
        }
        const fileContent = lines.join('\n');

        const context = contextBuilder.buildContext(fileContent, sampleDiagnostic);
        assert.ok(context.sourceCodeSnippet.length <= 6100);
        assert.ok(context.sourceCodeSnippet.includes('... [Context truncated]'));
    });

    test('TutorSession tracks progressive hints and caps at Level 3', () => {
        const session = new TutorSession();
        assert.strictEqual(session.getHintLevel(), 1);

        session.startSession('Test.java', sampleDiagnostic, {
            errorSummary: 'Test',
            whatHappened: 'Test occurred',
            why: 'Why',
            concept: { name: 'Test', explanation: '' },
            hint: 'Level 1 hint',
        });

        assert.strictEqual(session.getHintLevel(), 1);
        assert.strictEqual(session.canRequestNextHint(), true);

        // Advance to Level 2
        const level2 = session.incrementHintLevel();
        assert.strictEqual(level2, 2);
        assert.strictEqual(session.getHintLevel(), 2);
        assert.strictEqual(session.canRequestNextHint(), true);

        // Advance to Level 3
        const level3 = session.incrementHintLevel();
        assert.strictEqual(level3, 3);
        assert.strictEqual(session.getHintLevel(), 3);
        assert.strictEqual(session.canRequestNextHint(), false);

        // Cannot advance past Level 3
        const level4Attempt = session.incrementHintLevel();
        assert.strictEqual(level4Attempt, 3);
        assert.strictEqual(session.getHintLevel(), 3);

        // Reset
        session.reset();
        assert.strictEqual(session.getHintLevel(), 1);
        assert.strictEqual(session.getCurrentFile(), null);
        assert.strictEqual(session.getCurrentDiagnostic(), null);
    });

    test('FallbackProvider delivers progressive hints for ArithmeticException', async () => {
        const diag: JavaDiagnostic = {
            kind: 'runtime',
            file: 'Division.java',
            line: 7,
            message: '/ by zero',
            exceptionType: 'java.lang.ArithmeticException',
            severity: 'error',
        };

        // Level 1: Conceptual nudge
        const r1 = await fallbackProvider.explain({
            diagnostic: diag,
            context: 'int a = 10 / 0;',
            mode: 'hint',
            hintLevel: 1,
        });
        assert.strictEqual(r1.concept.name, 'ArithmeticException');
        assert.ok(r1.hint.includes('denominator'));
        assert.strictEqual(r1.nextHintAvailable, true);

        // Level 2: Point toward condition
        const r2 = await fallbackProvider.explain({
            diagnostic: diag,
            context: 'int a = 10 / 0;',
            mode: 'hint',
            hintLevel: 2,
        });
        assert.ok(r2.hint.includes('divisor variable') || r2.hint.includes('evaluate to zero'));
        assert.strictEqual(r2.nextHintAvailable, true);

        // Level 3: Concrete direction
        const r3 = await fallbackProvider.explain({
            diagnostic: diag,
            context: 'int a = 10 / 0;',
            mode: 'hint',
            hintLevel: 3,
        });
        assert.ok(r3.hint.includes('Add an if-check'));
        assert.strictEqual(r3.nextHintAvailable, false);
    });

    test('FallbackProvider delivers explanations for compiler missing semicolon', async () => {
        const resp = await fallbackProvider.explain({
            diagnostic: sampleDiagnostic,
            context: 'int x = 42',
            mode: 'explain',
            hintLevel: 1,
        });

        assert.strictEqual(resp.errorSummary, 'Missing semicolon');
        assert.ok(resp.whatHappened.includes('semicolon'));
        assert.ok(resp.concept.explanation.includes('semicolon'));
    });

    test('FallbackProvider delivers explanations for NullPointerException', async () => {
        const npeDiag: JavaDiagnostic = {
            kind: 'runtime',
            file: 'Test.java',
            line: 4,
            message: 'Cannot invoke method because str is null',
            exceptionType: 'java.lang.NullPointerException',
            severity: 'error',
        };

        const resp = await fallbackProvider.explain({
            diagnostic: npeDiag,
            context: 'String s = null; s.length();',
            mode: 'hint',
            hintLevel: 2,
        });

        assert.strictEqual(resp.concept.name, 'NullPointerException');
        assert.ok(resp.hint.includes('dot operator') || resp.hint.includes('null'));
    });

    test('GeminiAiProvider aborts immediately when signal is cancelled', async () => {
        const provider = new GeminiAiProvider('dummy-key');
        const controller = new AbortController();
        controller.abort();

        await assert.rejects(
            async () => {
                await provider.explain({
                    diagnostic: sampleDiagnostic,
                    context: 'int x = 42',
                    mode: 'explain',
                    hintLevel: 1,
                    signal: controller.signal,
                });
            },
            /Request was cancelled/
        );
    });

    test('TutorSession stores and retrieves context snippet across progressive hints', () => {
        const session = new TutorSession();
        const snippet = 'int a = 10;\nint b = 0;\nint c = a / b;';

        session.startSession('Division.java', sampleDiagnostic, {
            errorSummary: 'Div by zero',
            whatHappened: 'Cannot divide by 0',
            why: 'b is zero',
            concept: { name: 'ArithmeticException', explanation: '' },
            hint: 'Check denominator',
        }, snippet);

        assert.strictEqual(session.getCurrentContextSnippet(), snippet);
        assert.strictEqual(session.getCurrentFile(), 'Division.java');
    });
});

