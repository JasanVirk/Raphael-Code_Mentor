import * as path from 'path';
import { JavaDiagnostic } from './types';

export class DiagnosticParser {
    // Regex matching:
    // Group 1: File path (supports Windows drive letters e.g. C:\... or POSIX /...)
    // Group 2: Line number
    // Group 3: Optional column number
    // Group 4: Severity ('error' or 'warning')
    // Group 5: Primary message
    private readonly diagnosticHeaderRegex = /^(?:([a-zA-Z]:[\\/][^:]+|[^:\r\n]+)):(\d+)(?::(\d+))?:\s*(error|warning):\s*(.*)$/;

    /**
     * Parses javac compiler output lines into structured JavaDiagnostics.
     * Works with Windows drive letters, carets indicating columns, and multi-line symbol details.
     */
    public parseCompilerOutput(output: string, fallbackFile?: string): JavaDiagnostic[] {
        const diagnostics: JavaDiagnostic[] = [];
        if (!output || output.trim().length === 0) {
            return diagnostics;
        }

        const lines = output.split(/\r?\n/);
        let currentDiagnostic: JavaDiagnostic | null = null;
        let expectingCaret = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Check if this line is the summary line (e.g. "1 error", "2 warnings")
            if (/^\d+\s+(?:error|warning)s?$/i.test(line.trim())) {
                if (currentDiagnostic) {
                    diagnostics.push(currentDiagnostic);
                    currentDiagnostic = null;
                }
                continue;
            }

            const headerMatch = line.match(this.diagnosticHeaderRegex);
            if (headerMatch) {
                if (currentDiagnostic) {
                    diagnostics.push(currentDiagnostic);
                }

                let filePath = headerMatch[1].trim();
                if (fallbackFile && !path.isAbsolute(filePath)) {
                    filePath = path.resolve(path.dirname(fallbackFile), filePath);
                }

                const lineNumber = parseInt(headerMatch[2], 10);
                const columnNumber = headerMatch[3] ? parseInt(headerMatch[3], 10) : undefined;
                const severity = headerMatch[4].toLowerCase() === 'warning' ? 'warning' : 'error';
                const message = headerMatch[5].trim();

                currentDiagnostic = {
                    kind: 'compile',
                    file: filePath,
                    line: lineNumber,
                    column: columnNumber,
                    message,
                    severity,
                };
                expectingCaret = true;
                continue;
            }

            if (currentDiagnostic) {
                // If expecting caret, check if line contains caret (^)
                if (expectingCaret && line.includes('^')) {
                    if (currentDiagnostic.column === undefined) {
                        currentDiagnostic.column = line.indexOf('^') + 1;
                    }
                    expectingCaret = false;
                    continue;
                }

                // Check for javac secondary detail lines (e.g., "  symbol:   variable x", "  location: class Foo")
                const trimmed = line.trim();
                if (
                    trimmed.startsWith('symbol:') ||
                    trimmed.startsWith('location:') ||
                    trimmed.startsWith('required:') ||
                    trimmed.startsWith('found:') ||
                    trimmed.startsWith('reason:')
                ) {
                    currentDiagnostic.message += ` (${trimmed})`;
                }
            }
        }

        if (currentDiagnostic) {
            diagnostics.push(currentDiagnostic);
        }

        return diagnostics;
    }

    /**
     * Parses runtime output / stack traces (e.g., ArithmeticException, NullPointerException).
     */
    public parseRuntimeOutput(stderr: string, fallbackFile?: string): JavaDiagnostic[] {
        const diagnostics: JavaDiagnostic[] = [];
        if (!stderr || stderr.trim().length === 0) {
            return diagnostics;
        }

        // Exception header regex e.g. "Exception in thread "main" java.lang.ArithmeticException: / by zero"
        const exceptionRegex = /(?:Exception in thread "[^"]*"\s+)?([\w.$]+Exception|[\w.$]+Error)(?::\s*(.*))?/;
        // Stack trace frame regex e.g. "    at MyClass.main(MyClass.java:6)"
        const stackFrameRegex = /^\s*at\s+([\w.$]+)\.([\w$<>]+)\(([^:]+):(\d+)\)/;

        const lines = stderr.split(/\r?\n/);
        let exceptionType = '';
        let exceptionMessage = '';

        for (const line of lines) {
            if (!exceptionType) {
                const exMatch = line.match(exceptionRegex);
                if (exMatch) {
                    exceptionType = exMatch[1];
                    exceptionMessage = exMatch[2] ? exMatch[2].trim() : exceptionType;
                    continue;
                }
            }

            if (exceptionType) {
                const frameMatch = line.match(stackFrameRegex);
                if (frameMatch) {
                    const sourceFileName = frameMatch[3];
                    const lineNumber = parseInt(frameMatch[4], 10);
                    let targetFile = fallbackFile || sourceFileName;

                    if (fallbackFile && fallbackFile.endsWith(sourceFileName)) {
                        targetFile = fallbackFile;
                    }

                    diagnostics.push({
                        kind: 'runtime',
                        file: targetFile,
                        line: lineNumber,
                        column: 1,
                        message: exceptionMessage ? `${exceptionType}: ${exceptionMessage}` : exceptionType,
                        exceptionType,
                        stackTrace: stderr.trim(),
                        severity: 'error',
                    });
                    break; // Primary stack frame identified
                }
            }
        }

        return diagnostics;
    }
}

export const diagnosticParser = new DiagnosticParser();
