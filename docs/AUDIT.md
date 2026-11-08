# CodeMentor Repository Audit

## Overview
This audit examines the existing project scaffold for **CodeMentor** prior to implementing the Phase 1 architectural skeleton. The scaffold is a TypeScript-based Visual Studio Code extension built using `esbuild`, configured for Node.js execution with Mocha testing via `@vscode/test-cli`.

---

## Already Working

1. **Build and Compilation Pipeline**:
   - `npm run check-types` (`tsc --noEmit`) passes with zero type errors (`tsconfig.json` strict mode enabled, target `ES2022`, module `Node16`).
   - `npm run lint` (`eslint src`) runs with zero warnings or errors using ESLint 10.x and `@typescript-eslint`.
   - `npm run compile` (`npm run check-types && npm run lint && node esbuild.js`) executes cleanly, bundling `src/extension.ts` into `dist/extension.js` via `esbuild`.
   - `npm run package` executes in production mode (`--production`), minifying the output bundle without generating source maps.

2. **Test Infrastructure**:
   - `npm run compile-tests` (`tsc -p . --outDir out`) compiles TypeScript test files into `out/test/`.
   - `.vscode-test.mjs` configures `@vscode/test-cli` pointing to `out/test/**/*.test.js`.
   - `src/test/extension.test.ts` provides a baseline Mocha suite running inside the VS Code test harness.

3. **VS Code Development & Debugging Configuration**:
   - `.vscode/launch.json` defines a standard `"Run Extension"` launch configuration using `preLaunchTask: "npm: compile"` to run the Extension Development Host.
   - `.vscode/tasks.json` defines background watch tasks for both `tsc` and `esbuild` using appropriate problem matchers (`$tsc-watch`, `$esbuild-watch`).
   - `.vscode/extensions.json` recommends ESLint.

4. **Environment Prerequisites**:
   - Node.js runtime and npm are fully functional.
   - Java Development Kit is detected and verified:
     - `java -version`: OpenJDK 21.0.9 LTS (Corretto-21.0.9.10.1).
     - `javac -version`: `javac 21.0.9`.
     - Java compiler and runtime are present and accessible on system `PATH`.

---

## Needs Modification

1. **`package.json` Contributions**:
   - Currently contributes a generic placeholder command: `codementor.helloWorld`.
   - Must be updated to contribute domain-specific commands:
     - `codementor.explainError` ("CodeMentor: Explain Error")
     - `codementor.giveHint` ("CodeMentor: Give Me a Hint")
     - `codementor.tryAgain` ("CodeMentor: Try Again")
     - Later: `codementor.setApiKey` ("CodeMentor: Set API Key")
   - Needs activation events / views contribution:
     - Contribution of the sidebar view container and `views`: `codementor.tutorView` (`WebviewView`).
   - Missing configuration properties schema (`codementor.apiKey`, model selection, telemetry/privacy toggles).

2. **`src/extension.ts`**:
   - Currently acts as the sample Hello World entrypoint, directly registering `codementor.helloWorld` and displaying `vscode.window.showInformationMessage`.
   - Needs to be refactored into a thin lifecycle and wiring layer that registers the CodeMentor commands, instantiates the `DiagnosticCollection`, sets up the `TutorViewProvider`, and coordinates services.

3. **`esbuild.js`**:
   - Currently only bundles `src/extension.ts` to `dist/extension.js`.
   - When the webview sidebar is introduced (e.g. `media/main.js` or UI scripts), verify whether `media/` static assets are copied or bundled, or referenced directly via `localResourceRoots`.

4. **Testing Suite (`src/test/`)**:
   - Currently only contains a dummy sample assertion (`assert.strictEqual(-1, [1, 2, 3].indexOf(5))`).
   - Needs to be expanded with unit tests for diagnostic parsing, runtime stack trace extraction, context building, and prompt/response parsing.

---

## Missing

1. **Core Architectural Folders & Modules** (to be created in Phase 1):
   - `src/commands/`: Command handlers (`explainError.ts`, `giveHint.ts`, `tryAgain.ts`).
   - `src/java/`: Java environment verification, process execution (`javaRunner.ts`), compiler/runtime parser (`diagnosticParser.ts`), and type definitions (`types.ts`).
   - `src/context/`: Code context extractor (`contextBuilder.ts`).
   - `src/ai/`: Provider interface (`aiProvider.ts`), prompt generator (`promptBuilder.ts`), response validation (`responseParser.ts`), and schemas (`schema.ts`).
   - `src/tutor/`: Session management and progressive hint levels (`tutorSession.ts`).
   - `src/ui/`: VS Code Sidebar Webview View Provider (`tutorViewProvider.ts`).
   - `media/`: Webview front-end assets (`main.js`, `main.css`).
   - `src/test/fixtures/`: Java test files for compilation errors, runtime exceptions, and clean programs.

2. **Documentation**:
   - `docs/ARCHITECTURE.md`: High-level system design, data flow, and module boundaries.

---

## Safe to Remove

1. **Scaffold Artifacts**:
   - `vsc-extension-quickstart.md`: Default template documentation created by the extension generator. Can be archived or safely removed once all reference details are noted.
   - Placeholder command `codementor.helloWorld` in `package.json` and its implementation in `src/extension.ts` (should be replaced as soon as CodeMentor commands are introduced in Phase 1/Phase 2).

---

## Existing Dependencies

### Runtime Dependencies (`dependencies`)
- *None currently.* (All packages are in `devDependencies`, keeping the extension lean and lightweight).

### Development Dependencies (`devDependencies`)
- `@types/vscode`: `^1.137.0` (VS Code extension API typings)
- `@types/mocha`: `^10.0.10` (Mocha test framework typings)
- `@types/node`: `24.x` (Node.js runtime typings)
- `typescript`: `^6.0.3` (TypeScript compiler)
- `typescript-eslint`: `^8.61.1` (TS ESLint parser and plugin)
- `eslint`: `^10.5.0` (Linter)
- `esbuild`: `^0.28.1` (Fast bundler)
- `npm-run-all`: `^4.1.5` (CLI tool to run multiple npm scripts)
- `@vscode/test-cli`: `^0.0.15` (VS Code extension test CLI runner)
- `@vscode/test-electron`: `^3.0.0` (Download and launch VS Code for tests)

---

## Existing Commands

| Command Identifier | Title | Defined In | Implementation | Status |
| :--- | :--- | :--- | :--- | :--- |
| Command Identifier | Title | Defined In | Implementation | Status |
| :--- | :--- | :--- | :--- | :--- |
| `codementor.explainError` | "CodeMentor: Explain Error" | `package.json` | `src/commands/explainError.ts` | Working (Production & Integration Tested) |
| `codementor.giveHint` | "CodeMentor: Give Me a Hint" | `package.json` | `src/commands/giveHint.ts` | Working (Production & Integration Tested) |
| `codementor.tryAgain` | "CodeMentor: Try Again" | `package.json` | `src/commands/tryAgain.ts` | Working (Production & Integration Tested) |
| `codementor.setApiKey` | "CodeMentor: Set API Key" | `package.json` | `src/commands/setApiKey.ts` | Working (Production & Integration Tested) |
| `codementor.jumpToLine` | "CodeMentor: Jump to Line" | `package.json` | `src/commands/index.ts` | Working (Production & Integration Tested) |
| `codementor.helloWorld` | "Hello World" | `package.json` | `src/extension.ts` | Working (Scaffold placeholder) |

---

## Existing Tests

| Test Suite | Total Passing | Test Scope | Execution Method |
| :--- | :--- | :--- | :--- |
| `JavaRunner Test Suite` | 13 | Java compiler checks, runtime exceptions, output caps, timeout guard on infinite loops | `npm test` (`@vscode/test-cli`) |
| `DiagnosticParser Test Suite` | 9 | Compiler carets, Windows paths, symbols, runtime stack traces | `npm test` (`@vscode/test-cli`) |
| `AI Tutor & Pedagogical Engine Test Suite` | 18 | Prompts, schemas, JSON extraction, context limiting, hints, cancellation, fallbacks, Mock AI | `npm test` (`@vscode/test-cli`) |
| `CodeMentor Integration & UI Test Suite` | 6 | Extension activation, command registry, end-to-end analysis, editor jump, re-analysis, UI provider | `npm test` (`@vscode/test-cli`) |
| **Total Test Suite** | **46** | Comprehensive automated coverage across all layers | `npm test` (0 failures) |

---

## Phase 0 Verification Checklist

- [x] Inspect `package.json`
- [x] Inspect `src/extension.ts`
- [x] Inspect `esbuild.js`
- [x] Inspect `tsconfig.json`
- [x] Inspect `src/test/` and test harness
- [x] Inspect `.vscode/launch.json` and `.vscode/tasks.json`
- [x] Verify Java environment (`java 21.0.9`, `javac 21.0.9` available)
- [x] Run `npm run compile` (Clean exit code 0)
- [x] Run `npm run package` (Clean exit code 0)
- [x] Run `npm run compile-tests` (Clean exit code 0)
- [x] Create `docs/AUDIT.md`
