# CodeMentor (Raphael-Code_Mentor)

> **CodeMentor** is an AI-powered Java coding tutor implemented as a VS Code extension that explains compilation and runtime errors progressively rather than giving away direct code fixes.

---

## 🌟 Key Features

- **Progressive Hinting System**: Never spoils the answer. Delivers explanations in layered, pedagogically structured hints:
  - **Hint 1: Conceptual** — Explains what the error means in plain English without referencing the specific line.
  - **Hint 2: Directional** — Pinpoints where and why the error happened in the student's code.
  - **Hint 3: Concrete Guidance** — Socratic question or guided pseudocode nudging the student toward the fix.
- **Deep Java Error Diagnosis**:
  - **Compiler Errors**: Direct `javac` invocation and diagnostic parsing for syntax errors, missing semicolons, type mismatches, and unresolved symbols.
  - **Runtime Exceptions**: Safe execution environment capturing `NullPointerException`, `ArrayIndexOutOfBoundsException`, `ArithmeticException`, `ClassCastException`, and more.
  - **Infinite Loop / Timeout Protection**: Automatic 10-second process termination and 1MB stdout/stderr buffer caps.
- **Rich Interactive Sidebar**:
  - Dedicated Webview view in the VS Code Activity Bar (`CodeMentor Tutor`).
  - Clickable line chips that immediately jump to the error location in the active editor.
  - Collapsible runtime stack trace viewer.
  - "Get Another Hint" and "Try Again" re-analysis flow.
- **Dual AI Provider Architecture**:
  - **Google Gemini 2.5 Flash** integration using `@google/genai` and structured JSON schema response validation.
  - **Offline Fallback Heuristic Provider** that guarantees guidance even without internet or an API key.
- **Secure Credential Storage**:
  - Uses VS Code's `SecretStorage` API to store API keys securely with explicit user opt-in consent.

---

## 📋 Requirements

- **Java Development Kit (JDK)**: `javac` and `java` must be installed and accessible in your system `PATH`.
- **VS Code**: Version `^1.90.0` or higher.
- *(Optional)* **Google Gemini API Key**: For intelligent AI explanations. If not provided, CodeMentor seamlessly falls back to rule-based pedagogical hints.

---

## 🚀 Getting Started

1. Open any Java file (`.java`) in VS Code.
2. Open the **CodeMentor** view in the sidebar.
3. Click the editor title button or right-click in the editor and select **"CodeMentor: Explain Error"** (or press `Ctrl+Shift+P` and run `CodeMentor: Explain Error`).
4. Review the initial conceptual explanation in the sidebar.
5. If you're stuck, click **"Get Another Hint"** to unlock the next hint.
6. Once you've modified your code, click **"Try Again"** to re-run the compiler and verify your fix.

---

## ⌨️ Extension Commands

| Command | Identifier | Description |
|---|---|---|
| **Explain Error** | `codementor.explainError` | Compiles/runs the current Java file and displays pedagogical guidance in the sidebar. |
| **Give Hint** | `codementor.giveHint` | Reveals the next progressive hint for the active error. |
| **Try Again** | `codementor.tryAgain` | Clears previous error states and re-runs analysis on the active file. |
| **Set API Key** | `codementor.setApiKey` | Prompts to securely store a Google Gemini API Key in VS Code SecretStorage. |

---

## 🛠️ Development & Testing

### Installation & Build
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run linter
npm run lint
```

### Running Tests
CodeMentor includes a comprehensive automated test suite covering compiler diagnostics, runtime execution, prompt construction, schema validation, and end-to-end extension integration:

```bash
# Run all mocha unit & integration tests
npm test
```

---

## 📄 License

MIT
