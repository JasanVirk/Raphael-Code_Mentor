import * as assert from 'assert';
import { diagnosticParser } from '../java/diagnosticParser';

suite('DiagnosticParser Test Suite', () => {
    test('Parses missing semicolon error with caret column and Windows path', () => {
        const rawOutput = [
            'C:\\Users\\loq\\Project\\MissingSemicolon.java:3: error: \';\' expected',
            '        int x = 42',
            '                  ^',
            '1 error',
        ].join('\n');

        const diagnostics = diagnosticParser.parseCompilerOutput(rawOutput);
        assert.strictEqual(diagnostics.length, 1);
        assert.strictEqual(diagnostics[0].kind, 'compile');
        assert.strictEqual(diagnostics[0].file, 'C:\\Users\\loq\\Project\\MissingSemicolon.java');
        assert.strictEqual(diagnostics[0].line, 3);
        assert.strictEqual(diagnostics[0].column, 19);
        assert.strictEqual(diagnostics[0].severity, 'error');
        assert.strictEqual(diagnostics[0].message, "';' expected");
    });

    test('Parses undefined variable (cannot find symbol) with symbol and location details', () => {
        const rawOutput = [
            'C:\\Project\\UndefinedVariable.java:3: error: cannot find symbol',
            '        System.out.println(unknownVariable);',
            '                           ^',
            '  symbol:   variable unknownVariable',
            '  location: class UndefinedVariable',
            '1 error',
        ].join('\n');

        const diagnostics = diagnosticParser.parseCompilerOutput(rawOutput);
        assert.strictEqual(diagnostics.length, 1);
        assert.strictEqual(diagnostics[0].line, 3);
        assert.strictEqual(diagnostics[0].column, 28);
        assert.ok(diagnostics[0].message.includes('cannot find symbol'));
        assert.ok(diagnostics[0].message.includes('variable unknownVariable'));
        assert.ok(diagnostics[0].message.includes('class UndefinedVariable'));
    });

    test('Parses incompatible types error', () => {
        const rawOutput = [
            'C:\\Project\\IncompatibleTypes.java:3: error: incompatible types: String cannot be converted to int',
            '        int number = "Hello World";',
            '                     ^',
            '1 error',
        ].join('\n');

        const diagnostics = diagnosticParser.parseCompilerOutput(rawOutput);
        assert.strictEqual(diagnostics.length, 1);
        assert.strictEqual(diagnostics[0].line, 3);
        assert.strictEqual(diagnostics[0].column, 22);
        assert.strictEqual(diagnostics[0].message, 'incompatible types: String cannot be converted to int');
    });

    test('Parses missing return statement error', () => {
        const rawOutput = [
            'C:\\Project\\MissingReturn.java:5: error: missing return statement',
            '    }',
            '    ^',
            '1 error',
        ].join('\n');

        const diagnostics = diagnosticParser.parseCompilerOutput(rawOutput);
        assert.strictEqual(diagnostics.length, 1);
        assert.strictEqual(diagnostics[0].line, 5);
        assert.strictEqual(diagnostics[0].column, 5);
        assert.strictEqual(diagnostics[0].message, 'missing return statement');
    });

    test('Parses compiler warnings correctly', () => {
        const rawOutput = [
            'C:\\Project\\WarningTest.java:10: warning: [deprecation] show() in Dialog has been deprecated',
            '        dialog.show();',
            '              ^',
            '1 warning',
        ].join('\n');

        const diagnostics = diagnosticParser.parseCompilerOutput(rawOutput);
        assert.strictEqual(diagnostics.length, 1);
        assert.strictEqual(diagnostics[0].severity, 'warning');
        assert.strictEqual(diagnostics[0].line, 10);
        assert.ok(diagnostics[0].message.includes('has been deprecated'));
    });

    test('Parses runtime ArithmeticException stack trace', () => {
        const stderr = [
            'Exception in thread "main" java.lang.ArithmeticException: / by zero',
            '\tat DivisionByZero.main(DivisionByZero.java:5)',
        ].join('\n');

        const diagnostics = diagnosticParser.parseRuntimeOutput(stderr, 'C:\\Project\\DivisionByZero.java');
        assert.strictEqual(diagnostics.length, 1);
        assert.strictEqual(diagnostics[0].kind, 'runtime');
        assert.strictEqual(diagnostics[0].line, 5);
        assert.strictEqual(diagnostics[0].exceptionType, 'java.lang.ArithmeticException');
        assert.ok(diagnostics[0].message.includes('/ by zero'));
    });

    test('Parses runtime NullPointerException stack trace', () => {
        const stderr = [
            'Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.length()" because "str" is null',
            '\tat NullPointer.main(NullPointer.java:4)',
        ].join('\n');

        const diagnostics = diagnosticParser.parseRuntimeOutput(stderr, 'C:\\Project\\NullPointer.java');
        assert.strictEqual(diagnostics.length, 1);
        assert.strictEqual(diagnostics[0].line, 4);
        assert.strictEqual(diagnostics[0].exceptionType, 'java.lang.NullPointerException');
    });

    test('Parses runtime ArrayIndexOutOfBoundsException stack trace', () => {
        const stderr = [
            'Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 10 out of bounds for length 3',
            '\tat ArrayIndexError.main(ArrayIndexError.java:4)',
        ].join('\n');

        const diagnostics = diagnosticParser.parseRuntimeOutput(stderr);
        assert.strictEqual(diagnostics.length, 1);
        assert.strictEqual(diagnostics[0].line, 4);
        assert.strictEqual(diagnostics[0].exceptionType, 'java.lang.ArrayIndexOutOfBoundsException');
    });

    test('Handles clean output without diagnostics', () => {
        const diagnostics = diagnosticParser.parseCompilerOutput('');
        assert.strictEqual(diagnostics.length, 0);
    });
});
