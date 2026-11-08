# CodeMentor Architecture Documentation

## 1. System Mission & Core Pedagogy

CodeMentor is an AI-powered Java coding tutor implemented as a Visual Studio Code extension.

Unlike conventional code generation tools or autocompletion engines, CodeMentor is designed around **pedagogical guidance**:
- **Diagnosis Before Explanation**: Deterministic local tools (`javac`, `java`) analyze and verify syntax and runtime conditions; AI explains concepts and guides the student.
- **Never Auto-Fix**: CodeMentor never silently rewrites or auto-fixes the student's code.
- **Progressive Hinting**: Nudges move through three distinct tiers:
  1. *Level 1*: Conceptual nudge
  2. *Level 2*: Point towards relevant code / condition
  3. *Level 3*: Concrete targeted guidance
  Solutions are shown only upon explicit student request.

---

## 2. Directory Structure & Modular Boundaries

```text
CodeMentor/
├── src/
│   ├── extension.ts              # Extension entry point, lifecycle & wiring
│   ├── commands/                 # Command registrations & execution handlers
│   │   ├── explainError.ts       # Trigger Java compilation/analysis & AI explanation
│   │   ├── giveHint.ts           # Advance progressive hint level
│   │   ├── tryAgain.ts           # Reset session and re-analyze after student edits
│   │   └── index.ts              # Command registration helper
│   ├── java/                     # Java environment, runner & diagnostic parsing
│   │   ├── types.ts              # Core diagnostic & runner TypeScript interfaces
│   │   ├── javaRunner.ts         # javac/java process executor using child_process
│   │   └── diagnosticParser.ts   # Robust parser for javac output & runtime traces
│   ├── context/                  # Context extraction & window limiting
│   │   └── contextBuilder.ts     # Extracts ±15 lines around error with char cap
│   ├── ai/                       # AI abstraction layer & prompt/response handling
│   │   ├── schema.ts             # Structured JSON response & request schema
│   │   ├── aiProvider.ts         # Replaceable AiProvider interface & MockAiProvider
│   │   ├── promptBuilder.ts      # Enforces pedagogical rules & delimiters
│   │   └── responseParser.ts     # Robust JSON extraction & validation
│   ├── tutor/                    # Educational state machine
│   │   └── tutorSession.ts       # Session state, hint level tracking (1->2->3)
│   ├── ui/                       # Webview & sidebar views
│   │   └── tutorViewProvider.ts  # VS Code WebviewViewProvider for sidebar tutor
│   └── test/                     # Unit and integration test suites
│       └── extension.test.ts
├── media/
│   ├── main.css                  # Modern VS Code themed styling & UI cards
│   └── main.js                   # Webview client controller, state restoration & CSP
├── docs/
│   ├── AUDIT.md                  # Baseline repository audit
│   └── ARCHITECTURE.md           # System architecture & component documentation
├── esbuild.js                    # Production & development bundling
└── package.json                  # Manifest, contributions, and scripts
```

---

## 3. Data Flow & Orchestration (Phase 6)

```text
1. Student writes Java code
        ↓
2. User invokes 'CodeMentor: Explain Error' (editor title, context menu, or sidebar)
        ↓
3. Cancellation check & active sequence locking (aborts any in-flight analysis)
        ↓
4. JavaRunner runs javac -Xlint:all -d <tmp> <file> with timeout & AbortSignal
        ↓
5. DiagnosticParser extracts JavaDiagnostic[]
        ↓
6. If compile error:
   - VS Code DiagnosticCollection populates editor squiggles
   - Editor reveals target line
   - ContextBuilder extracts window around error line (capped at ~6,000 chars)
   - SecretManager requests privacy consent & checks SecretStorage for API key
   - AiProvider (Gemini / Offline Fallback) returns structured TutorResponse
   - ResponseParser validates JSON against schema
   - TutorSession stores session state, diagnostic, and context snippet
   - TutorViewProvider renders cards in sidebar Webview
        ↓
7. If compilation succeeds:
   - JavaRunner checks for main() and executes program with safety timeout
   - If runtime exception detected: parses stack trace & triggers tutoring pipeline
   - If clean execution: displays celebratory success card
        ↓
8. Interactive Tutoring:
   - Student can click 'Give Another Hint' (progresses Level 1 → Level 2 → Level 3)
   - Student clicks line chip to jump to error in editor
   - Student edits code and clicks 'Try Again' (clean re-analysis loop)
```

---

## 4. Key Architectural Guarantees

1. **Separation of Concerns**: UI, AI providers, Java process management, and session state are isolated into discrete modules with zero circular dependencies.
2. **Provider Agnostic**: The `AiProvider` interface allows swapping underlying models (Gemini, Claude, OpenAI, Local LLM) without altering the editor or tutor logic.
3. **Safety & Sandboxing**: Java compilation outputs to isolated temporary folders, leaving the student's project files untainted.
4. **Resilience & Graceful Degradation**: Failure of the AI API falls back seamlessly to the offline pattern-based explanation provider without crashing the extension.
5. **Race Condition Prevention & Cancellation**: Every analysis lifecycle is guarded by an `activeSequence` counter and linked to `vscode.CancellationTokenSource` and `AbortController`. Rapid editor typing or re-runs cancel stale runs immediately.
6. **Strict Webview Security**: Webview uses dynamic cryptographic nonces, strict Content Security Policy, and text sanitization against XSS.

