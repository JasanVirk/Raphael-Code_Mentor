# Change Log

All notable changes to the "codementor" extension will be documented in this file.

## [0.0.1] - 2026-11-11

### Initial Release of CodeMentor

An AI-powered Java coding tutor implemented as a VS Code extension that explains compilation and runtime errors progressively rather than giving away direct code fixes.

#### Features
- **Progressive Hinting System**: 3-tier hint levels (Conceptual Nudge → Directional Pointer → Concrete Socratic Guidance).
- **Compiler Diagnostic Engine**: Accurate `javac` diagnostic parsing with caret column positioning, Windows path support, and editor red squiggle integration via `DiagnosticCollection`.
- **Runtime Execution & Guardrails**: Safe sandbox execution of Java programs with a 10-second infinite loop timeout guard and 1MB stdout/stderr buffer cap.
- **AI Tutor Engine**:
  - Integration with Google Gemini (`gemini-2.5-flash`) via structured JSON schema enforcement.
  - Offline heuristic `FallbackProvider` for key compiler errors and standard runtime exceptions (`NullPointerException`, `ArithmeticException`, `ArrayIndexOutOfBoundsException`, `ClassCastException`, etc.).
  - Prompt injection protection with fenced delimiter isolation.
- **Interactive Sidebar Webview**:
  - Dedicated Activity Bar view with CSP nonces and strict XSS protection.
  - Clickable line chips that navigate directly to the error location in the active editor.
  - Collapsible runtime stack trace viewer.
  - "Get Another Hint" and "Try Again" re-analysis flow.
- **Secure Key Storage & Privacy**:
  - Encrypted Gemini API key storage using VS Code `SecretStorage`.
  - Non-modal privacy consent before external AI requests.
- **Automated Test Suite**: 46 unit, compiler, runtime, AI tutor, and end-to-end integration tests.
