export type DiagnosticKind = 'compile' | 'runtime';

export interface JavaDiagnostic {
    kind: DiagnosticKind;
    file: string;
    line: number;
    column?: number;
    message: string;
    exceptionType?: string;
    stackTrace?: string;
    severity: 'error' | 'warning';
}

export interface JavaEnvironment {
    isJavaAvailable: boolean;
    isJavacAvailable: boolean;
    javaVersion?: string;
    javacVersion?: string;
    error?: string;
}

export interface CompilationResult {
    success: boolean;
    output: string;
    tempDir?: string;
    diagnostics: JavaDiagnostic[];
}

export interface ExecutionResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timedOut: boolean;
    diagnostics: JavaDiagnostic[];
}
