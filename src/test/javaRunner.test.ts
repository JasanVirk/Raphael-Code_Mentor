import * as assert from 'assert';
import * as path from 'path';
import { javaRunner } from '../java/javaRunner';

suite('JavaRunner Test Suite', () => {
    test('Environment check detects Java and Javac on system', async () => {
        const env = await javaRunner.checkEnvironment();
        assert.strictEqual(env.isJavaAvailable, true, 'Java runtime should be available');
        assert.strictEqual(env.isJavacAvailable, true, 'Javac compiler should be available');
    });

    test('Compiling missingSemicolon.java produces expected compilation error', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/missingSemicolon.java');
        const result = await javaRunner.compile(fixturePath);

        try {
            assert.strictEqual(result.success, false, 'Compilation should fail');
            assert.ok(result.diagnostics.length > 0, 'Should return at least 1 diagnostic');
            const primary = result.diagnostics[0];
            assert.strictEqual(primary.line, 3, 'Error should be detected at line 3');
            assert.ok(primary.message.includes("';' expected"), 'Diagnostic message should state expected semicolon');
        } finally {
            if (result.tempDir) {
                await javaRunner.cleanupTempDir(result.tempDir);
            }
        }
    });

    test('Compiling undefinedVariable.java produces cannot find symbol error', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/undefinedVariable.java');
        const result = await javaRunner.compile(fixturePath);

        try {
            assert.strictEqual(result.success, false);
            assert.ok(result.diagnostics.length > 0);
            const primary = result.diagnostics[0];
            assert.strictEqual(primary.line, 3);
            assert.ok(primary.message.includes('cannot find symbol'));
        } finally {
            if (result.tempDir) {
                await javaRunner.cleanupTempDir(result.tempDir);
            }
        }
    });

    test('Compiling incompatibleTypes.java produces incompatible types error', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/incompatibleTypes.java');
        const result = await javaRunner.compile(fixturePath);

        try {
            assert.strictEqual(result.success, false);
            assert.ok(result.diagnostics.length > 0);
            const primary = result.diagnostics[0];
            assert.strictEqual(primary.line, 3);
            assert.ok(primary.message.includes('incompatible types'));
        } finally {
            if (result.tempDir) {
                await javaRunner.cleanupTempDir(result.tempDir);
            }
        }
    });

    test('Compiling missingReturn.java produces missing return statement error', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/missingReturn.java');
        const result = await javaRunner.compile(fixturePath);

        try {
            assert.strictEqual(result.success, false);
            assert.ok(result.diagnostics.length > 0);
            const primary = result.diagnostics[0];
            assert.strictEqual(primary.line, 5);
            assert.ok(primary.message.includes('missing return statement'));
        } finally {
            if (result.tempDir) {
                await javaRunner.cleanupTempDir(result.tempDir);
            }
        }
    });

    test('Compiling cleanProgram.java succeeds with zero diagnostics', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/cleanProgram.java');
        const result = await javaRunner.compile(fixturePath);

        try {
            assert.strictEqual(result.success, true, 'Clean Java program should compile successfully');
            assert.strictEqual(result.diagnostics.length, 0, 'Should produce zero diagnostics');
        } finally {
            if (result.tempDir) {
                await javaRunner.cleanupTempDir(result.tempDir);
            }
        }
    });

    test('Executes cleanProgram.java and returns exit code 0', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/cleanProgram.java');
        const compileResult = await javaRunner.compile(fixturePath);
        assert.strictEqual(compileResult.success, true);
        assert.ok(compileResult.tempDir);

        try {
            const mainClass = await javaRunner.findMainClassName(fixturePath, compileResult.tempDir);
            assert.strictEqual(mainClass, 'CleanProgram');

            const execResult = await javaRunner.execute(mainClass, compileResult.tempDir, 5000, fixturePath);
            assert.strictEqual(execResult.success, true);
            assert.strictEqual(execResult.exitCode, 0);
            assert.ok(execResult.stdout.includes('Sum is: 30'));
            assert.strictEqual(execResult.diagnostics.length, 0);
        } finally {
            await javaRunner.cleanupTempDir(compileResult.tempDir);
        }
    });

    test('Detects ArithmeticException in divisionByZero.java', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/divisionByZero.java');
        const compileResult = await javaRunner.compile(fixturePath);
        assert.strictEqual(compileResult.success, true);
        assert.ok(compileResult.tempDir);

        try {
            const mainClass = await javaRunner.findMainClassName(fixturePath, compileResult.tempDir);
            assert.strictEqual(mainClass, 'DivisionByZero');

            const execResult = await javaRunner.execute(mainClass, compileResult.tempDir, 5000, fixturePath);
            assert.strictEqual(execResult.success, false);
            assert.ok(execResult.diagnostics.length > 0);
            const diag = execResult.diagnostics[0];
            assert.strictEqual(diag.kind, 'runtime');
            assert.strictEqual(diag.line, 5);
            assert.strictEqual(diag.exceptionType, 'java.lang.ArithmeticException');
        } finally {
            await javaRunner.cleanupTempDir(compileResult.tempDir);
        }
    });

    test('Detects NullPointerException in nullPointer.java', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/nullPointer.java');
        const compileResult = await javaRunner.compile(fixturePath);
        assert.strictEqual(compileResult.success, true);
        assert.ok(compileResult.tempDir);

        try {
            const mainClass = await javaRunner.findMainClassName(fixturePath, compileResult.tempDir);
            assert.strictEqual(mainClass, 'NullPointer');

            const execResult = await javaRunner.execute(mainClass, compileResult.tempDir, 5000, fixturePath);
            assert.strictEqual(execResult.success, false);
            assert.ok(execResult.diagnostics.length > 0);
            const diag = execResult.diagnostics[0];
            assert.strictEqual(diag.kind, 'runtime');
            assert.strictEqual(diag.line, 4);
            assert.strictEqual(diag.exceptionType, 'java.lang.NullPointerException');
        } finally {
            await javaRunner.cleanupTempDir(compileResult.tempDir);
        }
    });

    test('Detects ArrayIndexOutOfBoundsException in arrayIndexError.java', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/arrayIndexError.java');
        const compileResult = await javaRunner.compile(fixturePath);
        assert.strictEqual(compileResult.success, true);
        assert.ok(compileResult.tempDir);

        try {
            const mainClass = await javaRunner.findMainClassName(fixturePath, compileResult.tempDir);
            assert.strictEqual(mainClass, 'ArrayIndexError');

            const execResult = await javaRunner.execute(mainClass, compileResult.tempDir, 5000, fixturePath);
            assert.strictEqual(execResult.success, false);
            assert.ok(execResult.diagnostics.length > 0);
            const diag = execResult.diagnostics[0];
            assert.strictEqual(diag.kind, 'runtime');
            assert.strictEqual(diag.line, 4);
            assert.strictEqual(diag.exceptionType, 'java.lang.ArrayIndexOutOfBoundsException');
        } finally {
            await javaRunner.cleanupTempDir(compileResult.tempDir);
        }
    });

    test('Detects StackOverflowError in infiniteRecursion.java', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/infiniteRecursion.java');
        const compileResult = await javaRunner.compile(fixturePath);
        assert.strictEqual(compileResult.success, true);
        assert.ok(compileResult.tempDir);

        try {
            const mainClass = await javaRunner.findMainClassName(fixturePath, compileResult.tempDir);
            assert.strictEqual(mainClass, 'InfiniteRecursion');

            const execResult = await javaRunner.execute(mainClass, compileResult.tempDir, 5000, fixturePath);
            assert.strictEqual(execResult.success, false);
            assert.ok(execResult.diagnostics.length > 0);
            const diag = execResult.diagnostics[0];
            assert.strictEqual(diag.kind, 'runtime');
            assert.strictEqual(diag.exceptionType, 'java.lang.StackOverflowError');
        } finally {
            await javaRunner.cleanupTempDir(compileResult.tempDir);
        }
    });

    test('Detects ClassCastException in classCast.java', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/classCast.java');
        const compileResult = await javaRunner.compile(fixturePath);
        assert.strictEqual(compileResult.success, true);
        assert.ok(compileResult.tempDir);

        try {
            const mainClass = await javaRunner.findMainClassName(fixturePath, compileResult.tempDir);
            assert.strictEqual(mainClass, 'ClassCast');

            const execResult = await javaRunner.execute(mainClass, compileResult.tempDir, 5000, fixturePath);
            assert.strictEqual(execResult.success, false);
            assert.ok(execResult.diagnostics.length > 0);
            const diag = execResult.diagnostics[0];
            assert.strictEqual(diag.kind, 'runtime');
            assert.strictEqual(diag.line, 4);
            assert.strictEqual(diag.exceptionType, 'java.lang.ClassCastException');
        } finally {
            await javaRunner.cleanupTempDir(compileResult.tempDir);
        }
    });

    test('Handles timeout on infiniteLoop.java gracefully', async function (this: Mocha.Context) {
        this.timeout(10000);
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/infiniteLoop.java');
        const compileResult = await javaRunner.compile(fixturePath);
        assert.strictEqual(compileResult.success, true);
        assert.ok(compileResult.tempDir);

        try {
            const mainClass = await javaRunner.findMainClassName(fixturePath, compileResult.tempDir);
            assert.strictEqual(mainClass, 'InfiniteLoop');

            // 1200ms timeout for testing timeout termination
            const execResult = await javaRunner.execute(mainClass, compileResult.tempDir, 1200, fixturePath);
            assert.strictEqual(execResult.success, false);
            assert.strictEqual(execResult.timedOut, true);
            assert.ok(execResult.diagnostics.length > 0);
            assert.ok(execResult.diagnostics[0].message.includes('timed out'));
        } finally {
            await javaRunner.cleanupTempDir(compileResult.tempDir);
        }
    });
});
