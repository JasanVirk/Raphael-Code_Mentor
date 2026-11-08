import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { diagnosticParser } from './diagnosticParser';
import { CompilationResult, ExecutionResult, JavaEnvironment } from './types';

const execFileAsync = promisify(execFile);

export class JavaRunner {
    private cachedEnvironment: JavaEnvironment | null = null;
    public readonly defaultRuntimeTimeoutMs = 10000; // 10 seconds per plan

    /**
     * Verifies that java and javac are available in PATH and caches the result.
     */
    public async checkEnvironment(forceRefresh = false): Promise<JavaEnvironment> {
        if (this.cachedEnvironment && !forceRefresh) {
            return this.cachedEnvironment;
        }

        let isJavaAvailable = false;
        let isJavacAvailable = false;
        let javaVersion: string | undefined;
        let javacVersion: string | undefined;
        let error: string | undefined;

        try {
            const { stdout, stderr } = await execFileAsync('java', ['-version'], { timeout: 5000 });
            isJavaAvailable = true;
            const output = stdout || stderr;
            const versionMatch = output.match(/version\s+"([^"]+)"/i);
            javaVersion = versionMatch ? versionMatch[1] : output.split('\n')[0].trim();
        } catch (e: unknown) {
            isJavaAvailable = false;
            error = e instanceof Error ? e.message : String(e);
        }

        try {
            const { stdout, stderr } = await execFileAsync('javac', ['-version'], { timeout: 5000 });
            isJavacAvailable = true;
            const output = stdout || stderr;
            javacVersion = output.trim();
        } catch (e: unknown) {
            isJavacAvailable = false;
            if (!error) {
                error = e instanceof Error ? e.message : String(e);
            }
        }

        if (!isJavaAvailable || !isJavacAvailable) {
            error = 'Java/JDK could not be found. Install a JDK and make sure java and javac are available in PATH.';
        }

        this.cachedEnvironment = {
            isJavaAvailable,
            isJavacAvailable,
            javaVersion,
            javacVersion,
            error,
        };

        return this.cachedEnvironment;
    }

    /**
     * Finds the primary class containing the `main` method in the specified source file.
     */
    public async findMainClassName(sourceFile: string, tempDir: string): Promise<string | null> {
        try {
            const content = await fs.promises.readFile(sourceFile, 'utf-8');

            // Find class names with main method
            const classRegex = /(?:public\s+)?class\s+([A-Za-z0-9_$]+)[^{]*\{([\s\S]*?)(?=\n(?:public\s+)?class|\s*$)/g;
            let match: RegExpExecArray | null;

            while ((match = classRegex.exec(content)) !== null) {
                const className = match[1];
                const classBody = match[2];
                if (/static\s+void\s+main\s*\(/.test(classBody) || /void\s+main\s*\(/.test(classBody)) {
                    const classFile = path.join(tempDir, `${className}.class`);
                    if (fs.existsSync(classFile)) {
                        return className;
                    }
                }
            }

            // Fallback: Check if file basename matching class exists in tempDir
            const baseName = path.basename(sourceFile, '.java');
            const defaultClassFile = path.join(tempDir, `${baseName}.class`);
            if (fs.existsSync(defaultClassFile) && /main\s*\(/.test(content)) {
                return baseName;
            }

            // Fallback: Check all generated non-inner .class files
            const files = await fs.promises.readdir(tempDir);
            const topLevelClasses = files
                .filter((f) => f.endsWith('.class') && !f.includes('$'))
                .map((f) => path.basename(f, '.class'));

            for (const cls of topLevelClasses) {
                if (content.includes(`class ${cls}`) && /main\s*\(/.test(content)) {
                    return cls;
                }
            }
        } catch {
            // Ignore inspection errors and return null
        }

        return null;
    }

    /**
     * Compiles a Java file to a sandboxed temporary directory to prevent polluting user project with .class files.
     * Uses cwd set to file directory to avoid Windows encoding issues with non-ASCII path characters.
     */
    public async compile(filePath: string, signal?: AbortSignal): Promise<CompilationResult> {
        const env = await this.checkEnvironment();
        if (!env.isJavacAvailable) {
            return {
                success: false,
                output: env.error || 'JDK compiler (javac) is not available.',
                diagnostics: [
                    {
                        kind: 'compile',
                        file: filePath,
                        line: 1,
                        message: env.error || 'JDK compiler (javac) is not available.',
                        severity: 'error',
                    },
                ],
            };
        }

        // Create temporary compilation directory
        const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'codementor-compile-'));
        const fileDir = path.dirname(filePath);
        const fileName = path.basename(filePath);

        try {
            const args = ['-Xlint:all', '-d', tempDir, fileName];
            await execFileAsync('javac', args, {
                cwd: fileDir,
                timeout: 15000,
                signal,
            });

            return {
                success: true,
                output: '',
                tempDir,
                diagnostics: [],
            };
        } catch (err: unknown) {
            // javac returns non-zero exit code when compilation fails with errors
            const execError = err as { stdout?: string; stderr?: string; message?: string };
            const combinedOutput = `${execError.stdout || ''}\n${execError.stderr || ''}`.trim();
            const diagnostics = diagnosticParser.parseCompilerOutput(combinedOutput, filePath);

            return {
                success: false,
                output: combinedOutput || execError.message || 'Compilation failed.',
                tempDir,
                diagnostics,
            };
        }
    }

    /**
     * Cleans up a temporary compilation directory.
     */
    public async cleanupTempDir(tempDir?: string): Promise<void> {
        if (tempDir && fs.existsSync(tempDir)) {
            try {
                await fs.promises.rm(tempDir, { recursive: true, force: true });
            } catch {
                // Ignore cleanup errors
            }
        }
    }

    /**
     * Executes a compiled Java class with safety timeout, cancellation support, and output limit.
     */
    public async execute(
        className: string,
        classDir: string,
        timeoutMs: number = this.defaultRuntimeTimeoutMs,
        fallbackFile?: string,
        signal?: AbortSignal
    ): Promise<ExecutionResult> {
        const env = await this.checkEnvironment();
        if (!env.isJavaAvailable) {
            return {
                success: false,
                stdout: '',
                stderr: env.error || 'Java runtime is not available.',
                exitCode: 1,
                timedOut: false,
                diagnostics: [],
            };
        }

        try {
            const { stdout, stderr } = await execFileAsync('java', ['-cp', '.', className], {
                cwd: classDir,
                timeout: timeoutMs,
                maxBuffer: 1024 * 1024, // 1MB output limit
                signal,
            });

            return {
                success: true,
                stdout,
                stderr,
                exitCode: 0,
                timedOut: false,
                diagnostics: [],
            };
        } catch (err: unknown) {
            const execError = err as {
                killed?: boolean;
                code?: number;
                stdout?: string;
                stderr?: string;
                message?: string;
                name?: string;
            };

            const timedOut = Boolean(execError.killed || (execError.message && execError.message.includes('timed out')));
            const stderr = execError.stderr || '';
            const stdout = execError.stdout || '';

            let diagnostics = diagnosticParser.parseRuntimeOutput(stderr, fallbackFile);

            if (timedOut) {
                diagnostics = [
                    {
                        kind: 'runtime',
                        file: fallbackFile || className,
                        line: 1,
                        message: 'Execution timed out. The program may contain an infinite loop or took too long to complete.',
                        exceptionType: 'TimeoutException',
                        severity: 'error',
                    },
                ];
            }

            return {
                success: false,
                stdout,
                stderr: stderr || execError.message || '',
                exitCode: typeof execError.code === 'number' ? execError.code : 1,
                timedOut,
                diagnostics,
            };
        }
    }
}

export const javaRunner = new JavaRunner();
