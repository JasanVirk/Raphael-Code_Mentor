# CodeMentor --- Complete Implementation Plan

## Project

**CodeMentor** is an AI-powered Java coding tutor implemented as a VS
Code extension.

The purpose of CodeMentor is to **teach the student instead of simply
fixing their code**.

The intended interaction is:

``` text
Student writes Java code
        ↓
CodeMentor analyzes the code
        ↓
Compiler/runtime diagnostic is detected
        ↓
CodeMentor explains what happened
        ↓
Explains why it happened
        ↓
Gives a progressive hint
        ↓
Student fixes the code themselves
        ↓
CodeMentor analyzes it again
```

The extension should not behave primarily like an autocomplete or
automatic code-generation tool.

------------------------------------------------------------------------

# 1. Current Repository Structure

The current project has already been scaffolded as a VS Code extension.

``` text
CodeMentor/
│
├── .vscode/
│   ├── extensions.json
│   ├── launch.json
│   ├── settings.json
│   └── tasks.json
│
├── dist/
│
├── node_modules/
│
├── src/
│   ├── test/
│   └── extension.ts
│
├── .gitignore
├── .vscode-test.mjs
├── .vscodeignore
├── CHANGELOG.md
├── esbuild.js
├── eslint.config.mjs
├── package-lock.json
├── package.json
├── README.md
├── tsconfig.json
└── vsce-extension-quickstart.md
```

## Important consequences of the current structure

This is **already a TypeScript VS Code extension scaffold using
esbuild**.

Therefore:

-   Do not recreate the extension.
-   Do not replace the project with another framework.
-   Do not create a second build system.
-   Do not create a new React/Vite application unless a later
    requirement genuinely justifies it.
-   Keep `esbuild.js` as the build/bundling mechanism.
-   Keep `src/extension.ts` as the extension entry point, but gradually
    reduce it to activation/wiring logic.
-   Keep the existing `src/test/` infrastructure and extend it instead
    of replacing it.
-   `node_modules/` and `dist/` are generated directories and should not
    be manually implemented.
-   `.vscode/` contains development/debugging configuration and should
    only be modified when the new commands, tests, or launch
    configuration require it.

------------------------------------------------------------------------

# 2. Critical Rule Before Implementation

Do not assume that the scaffold files are empty or identical to a
default VS Code template.

Before modifying anything:

1.  Inspect `package.json`.
2.  Inspect `src/extension.ts`.
3.  Inspect `esbuild.js`.
4.  Inspect `tsconfig.json`.
5.  Inspect the existing files under `src/test/`.
6.  Inspect `.vscode/launch.json`.
7.  Inspect `.vscode/tasks.json`.
8.  Run the existing project.
9.  Confirm the existing command(s) work.
10. Confirm the existing test command works.

Create an audit before making architectural changes.

Suggested file:

``` text
docs/AUDIT.md
```

The audit should contain:

``` text
Already working
Needs modification
Needs to be added
Can be removed
```

Do not delete existing functionality until it is confirmed to be
unnecessary.

------------------------------------------------------------------------

# 3. Target Architecture

The current project is small, so the architecture should grow gradually.

Target structure:

``` text
CodeMentor/
│
├── .vscode/
│   ├── extensions.json
│   ├── launch.json
│   ├── settings.json
│   └── tasks.json
│
├── src/
│   ├── extension.ts
│   │
│   ├── commands/
│   │   ├── explainError.ts
│   │   ├── giveHint.ts
│   │   └── tryAgain.ts
│   │
│   ├── java/
│   │   ├── javaRunner.ts
│   │   ├── diagnosticParser.ts
│   │   └── types.ts
│   │
│   ├── context/
│   │   └── contextBuilder.ts
│   │
│   ├── ai/
│   │   ├── aiProvider.ts
│   │   ├── promptBuilder.ts
│   │   ├── responseParser.ts
│   │   └── schema.ts
│   │
│   ├── tutor/
│   │   └── tutorSession.ts
│   │
│   ├── ui/
│   │   └── tutorViewProvider.ts
│   │
│   └── test/
│       ├── fixtures/
│       └── ...
│
├── media/
│   ├── main.js
│   └── main.css
│
├── docs/
│   ├── AUDIT.md
│   └── ARCHITECTURE.md
│
├── esbuild.js
├── package.json
├── tsconfig.json
└── README.md
```

The exact names can be adjusted after inspecting the existing
repository.

------------------------------------------------------------------------

# 4. Architecture Principles

## Principle 1 --- Java tools detect; AI explains

Do not ask the LLM to determine whether the Java code has a compiler
error when `javac` can determine it reliably.

Use:

``` text
javac → compiler diagnostics
java  → runtime diagnostics
AI    → explanation + tutoring
```

The AI should primarily transform reliable diagnostics into an
educational explanation.

------------------------------------------------------------------------

## Principle 2 --- Do not automatically fix student code

CodeMentor should not silently modify the student's source code.

Preferred behavior:

``` text
Error
 ↓
Explanation
 ↓
Concept
 ↓
Hint
 ↓
Student attempts fix
 ↓
Try Again
```

If a solution is requested explicitly, CodeMentor may show a
solution/example, but the default experience should remain educational.

------------------------------------------------------------------------

## Principle 3 --- Keep the AI provider replaceable

Use an interface such as:

``` ts
interface AiProvider {
    explain(request: TutorRequest): Promise<TutorResponse>;
}
```

This allows the AI provider to be changed later without rewriting the
Java analysis or UI.

------------------------------------------------------------------------

## Principle 4 --- Keep the webview simple

The webview should primarily display state and send user actions back to
the extension.

Business logic should remain in the TypeScript extension code.

------------------------------------------------------------------------

# 5. Phase 0 --- Existing Project Audit

## Goal

Understand exactly what the existing scaffold already provides.

## Inspect

### `package.json`

Check:

-   VS Code engine version
-   extension entry point
-   scripts
-   dependencies
-   devDependencies
-   commands
-   activation events
-   contributed views
-   configuration
-   menus

### `src/extension.ts`

Determine:

-   Current activation function
-   Existing commands
-   Existing command implementation
-   Existing imports
-   Existing extension lifecycle

### `esbuild.js`

Determine:

-   entry point
-   output directory
-   production/development behavior
-   external dependencies
-   watch mode
-   source maps

### `src/test/`

Determine:

-   test framework
-   current test files
-   how tests are launched
-   whether VS Code integration testing already exists

### `.vscode/`

Verify:

-   F5/debugging
-   extension development host
-   test task
-   build task

## Audit deliverable

Create:

``` text
docs/AUDIT.md
```

with:

``` markdown
# CodeMentor Repository Audit

## Already Working

## Needs Modification

## Missing

## Safe to Remove

## Existing Dependencies

## Existing Commands

## Existing Tests
```

## Definition of Done

The extension must still:

-   compile
-   launch with F5
-   run its current tests
-   package successfully if packaging was already configured

------------------------------------------------------------------------

# 6. Phase 1 --- Architecture Skeleton

## Goal

Create the structure without implementing the AI yet.

Create only the modules required for the architecture.

Recommended folders:

``` text
src/commands/
src/java/
src/context/
src/ai/
src/tutor/
src/ui/
```

Create shared TypeScript types first.

For example:

``` ts
export type DiagnosticKind = 'compile' | 'runtime';

export interface Diagnostic {
    kind: DiagnosticKind;
    file: string;
    line: number;
    column?: number;
    message: string;
    exceptionType?: string;
    stackTrace?: string;
    severity: 'error' | 'warning';
}
```

Do not over-engineer the types at this stage.

## Definition of Done

-   Existing extension still launches.
-   New modules compile.
-   No AI API calls exist yet.
-   No unnecessary dependencies are installed.

------------------------------------------------------------------------

# 7. Phase 2 --- Java Analysis

## Goal

Make CodeMentor useful even without AI.

The first major milestone is:

``` text
Java file
   ↓
CodeMentor command
   ↓
javac
   ↓
Diagnostic
   ↓
VS Code Problems panel / red squiggle
```

This milestone should work before AI integration begins.

------------------------------------------------------------------------

## 7.1 Java Runner

Create:

``` text
src/java/javaRunner.ts
```

Responsibilities:

-   Check Java availability.
-   Run `javac`.
-   Compile to a temporary directory.
-   Avoid writing `.class` files into the user's project.
-   Return compiler output.
-   Later support runtime execution.

Use Node's `child_process` APIs.

Prefer asynchronous process handling.

------------------------------------------------------------------------

## 7.2 Java Environment Check

Check:

``` bash
java -version
javac -version
```

If Java is unavailable:

``` text
Java/JDK could not be found.

Install a JDK and make sure java/javac
are available in PATH.
```

Do not crash the extension.

Cache the environment check during the extension session.

------------------------------------------------------------------------

## 7.3 Compilation

Use:

``` bash
javac -Xlint:all -d <temporary-directory> <file>
```

Compile into a temporary directory.

Do not compile directly into the workspace.

Initially support:

-   single Java files
-   simple same-folder Java files

Do not implement Maven/Gradle initially.

------------------------------------------------------------------------

## 7.4 Diagnostic Parser

Create:

``` text
src/java/diagnosticParser.ts
```

Convert raw compiler output into:

``` ts
Diagnostic[]
```

Handle common errors such as:

``` text
';' expected
cannot find symbol
incompatible types
missing return statement
variable might not have been initialized
```

The parser must work with Windows paths.

Do not split diagnostic information naively using `:` because Windows
paths contain `:`.

------------------------------------------------------------------------

## 7.5 VS Code DiagnosticCollection

Create a diagnostic collection:

``` text
codementor
```

Use:

``` text
source = "CodeMentor"
```

Display:

-   red squiggles for errors
-   warnings where appropriate
-   correct line
-   correct column when available

------------------------------------------------------------------------

# 8. Phase 3 --- Runtime Analysis

Implement runtime analysis only after compilation analysis works.

## Flow

``` text
javac
 ↓
successful?
 ↓ yes
java
 ↓
runtime output/error
 ↓
Diagnostic
```

## Runtime errors to support initially

-   `ArithmeticException`
-   `NullPointerException`
-   `ArrayIndexOutOfBoundsException`
-   `ClassCastException`
-   `StackOverflowError`

------------------------------------------------------------------------

## Runtime Safety

Student code must not be allowed to hang the extension.

Use:

-   process timeout
-   output-size limit
-   process termination
-   cancellation support

Initial timeout:

``` text
10 seconds
```

If the program exceeds the limit:

``` text
Execution timed out.

The program may contain an infinite loop
or otherwise be taking too long to finish.
```

Do not automatically execute Java when the user opens a file.

Execution must happen through an explicit CodeMentor action.

------------------------------------------------------------------------

# 9. Phase 4 --- AI Tutor

Only start this phase after Java diagnostics work.

## Goal

Turn structured diagnostics into a lesson.

Target flow:

``` text
Diagnostic
   ↓
ContextBuilder
   ↓
PromptBuilder
   ↓
AiProvider
   ↓
ResponseParser
   ↓
TutorResponse
```

------------------------------------------------------------------------

# 10. AI Response Schema

Use a structured response.

Recommended shape:

``` json
{
  "errorSummary": "Division by zero",
  "whatHappened": "The program attempted to divide a number by zero.",
  "why": "The variable b contains 0 when the division occurs.",
  "location": {
    "line": 6,
    "note": "The division expression uses b as the denominator."
  },
  "concept": {
    "name": "Division by zero",
    "explanation": "Integer division cannot use zero as the denominator."
  },
  "hint": "Check the value stored in the denominator before the division.",
  "example": "A small analogous example, not the student's corrected code.",
  "learningQuestion": "What value would make this division safe?",
  "nextHintAvailable": true
}
```

Validate the response before sending it to the UI.

------------------------------------------------------------------------

# 11. AI Prompt Rules

The system prompt should establish:

``` text
You are CodeMentor, a Java programming teacher.

Your purpose is to help the student understand their mistake.

Do not automatically rewrite or fix the student's code.

Explain:
1. What happened.
2. Why it happened.
3. The relevant Java concept.
4. A useful hint.

Use beginner-friendly language.

Return only the requested structured response.
```

Student source code must be clearly delimited.

Treat code and comments as data, not instructions.

This protects against prompt injection inside source-code comments.

------------------------------------------------------------------------

# 12. Tutor Modes

Implement these modes progressively.

## Hint Mode

Give only a useful hint.

Do not reveal the complete fix.

## Explain Mode

Explain:

-   what happened
-   why it happened
-   concept

## Guided Mode

Ask one or two questions that lead the student toward the answer.

## Solution Mode

Only available after explicit user action.

Even here, explain the reasoning rather than merely dumping replacement
code.

------------------------------------------------------------------------

# 13. Progressive Hint System

Create:

``` text
src/tutor/tutorSession.ts
```

Track:

``` text
hintLevel = 1
```

Progression:

``` text
Level 1 → conceptual nudge
Level 2 → point toward relevant code/concept
Level 3 → highly specific guidance
```

Do not go beyond Level 3 unless the student explicitly requests a
solution.

Example:

### Level 1

> Think about the value stored in the variable used as the denominator.

### Level 2

> Check whether `b` can be zero before the division happens.

### Level 3

> Look at the assignment to `b` and decide what should happen when its
> value is zero.

The student should still make the change.

------------------------------------------------------------------------

# 14. Context Builder

Create:

``` text
src/context/contextBuilder.ts
```

Never send the entire workspace to the AI by default.

Send only relevant context.

Priority:

1.  Diagnostic
2.  Error line
3.  Approximately ±15 lines around the error
4.  Enclosing method when reasonably small
5.  Class/method outline
6.  Relevant imports
7.  User selection if present
8.  Previous hint level
9.  Previous hint

Use a hard context limit.

Recommended initial limit:

``` text
~6,000 characters
```

------------------------------------------------------------------------

# 15. AI Security

Never hard-code API keys.

Use VS Code:

``` text
SecretStorage
```

Provide a command:

``` text
CodeMentor: Set API Key
```

Do not store the API key in:

-   source code
-   Git
-   `settings.json`
-   committed `.env`

For a personal/class-project version, a user-provided API key stored in
SecretStorage is sufficient.

A backend proxy can be considered later if CodeMentor becomes a publicly
distributed product.

------------------------------------------------------------------------

# 16. User Consent and Privacy

Before sending code to an external AI provider, explain:

``` text
CodeMentor may send a small portion of your Java code,
the detected error, and relevant context to the selected AI provider
to generate an explanation.
```

Provide:

``` text
Allow
Don't Allow
```

Remember the decision.

Send only the required context.

Never send the entire workspace by default.

------------------------------------------------------------------------

# 17. Phase 5 --- VS Code UI

Use:

``` text
WebviewView
```

inside a VS Code sidebar.

Do not introduce React unless the existing project or future complexity
genuinely requires it.

A simple HTML/CSS/JavaScript webview is sufficient for the MVP.

------------------------------------------------------------------------

# 18. UI Layout

Recommended:

``` text
┌──────────────────────────────┐
│ CodeMentor                   │
├──────────────────────────────┤
│ Problem                      │
│ ArithmeticException          │
│                              │
│ What happened?               │
│ ...                          │
│                              │
│ Why?                         │
│ ...                          │
│                              │
│ Concept                      │
│ Division by zero             │
│                              │
│ Hint                         │
│ ...                          │
│                              │
│ [Give Another Hint]          │
│ [Explain More]               │
│ [Try Again]                  │
│ [Show Solution]              │
└──────────────────────────────┘
```

------------------------------------------------------------------------

# 19. UI States

The sidebar should support:

## Empty

``` text
Open a Java file and run CodeMentor.
```

## Loading

``` text
Analyzing your code...
```

## Diagnostic

Show the detected problem.

## AI Explanation

Show the tutor response.

## Success

``` text
No errors found.

Your Java program compiled successfully.
```

## Error

Show a friendly message and:

``` text
Retry
```

------------------------------------------------------------------------

# 20. UI Commands

## MVP

Implement:

``` text
CodeMentor: Explain Error
CodeMentor: Give Me a Hint
CodeMentor: Try Again
```

The exact command names should match `package.json`.

## Later

``` text
CodeMentor: Explain Selected Code
CodeMentor: Explain This Concept
CodeMentor: Start Learning Session
```

Do not implement all future commands during the first milestone.

------------------------------------------------------------------------

# 21. Editor Integration

The MVP should support:

-   active Java file detection
-   compiler diagnostics
-   Problems panel integration
-   sidebar tutor
-   clicking an error location
-   highlighting the relevant line

Later:

-   right-click menu
-   Code Action / lightbulb
-   hover explanation

------------------------------------------------------------------------

# 22. Webview Security

The webview must use:

-   strict Content Security Policy
-   nonce for scripts
-   `localResourceRoots`
-   escaped AI text
-   `<pre><code>` for code examples

Never inject AI-generated content directly with unsafe `innerHTML`.

The webview should not contain business logic.

------------------------------------------------------------------------

# 23. Phase 6 --- Full Integration

Create an orchestration flow.

Suggested command:

``` text
src/commands/explainError.ts
```

Flow:

``` text
1. Get active editor
        ↓
2. Verify it is a Java file
        ↓
3. Compile Java
        ↓
4. Parse diagnostics
        ↓
5. Update DiagnosticCollection
        ↓
6. If no errors → success message
        ↓
7. Select primary diagnostic
        ↓
8. Build context
        ↓
9. Call AI
        ↓
10. Validate AI response
        ↓
11. Store tutor state
        ↓
12. Render sidebar
```

------------------------------------------------------------------------

# 24. Re-analysis Loop

The MVP should NOT continuously call the AI while the student types.

Preferred:

``` text
Student edits code
        ↓
Student clicks Try Again
        ↓
Compile again
        ↓
Update diagnostics
        ↓
AI explanation only if needed
```

Later:

-   compile on save
-   do not automatically call AI on every save

This controls API usage and keeps the extension responsive.

------------------------------------------------------------------------

# 25. Cancellation

Support cancellation for:

-   Java processes
-   AI requests

Use:

``` text
CancellationToken
```

and where applicable:

``` text
AbortController
```

If the student starts another analysis while one is running, cancel or
ignore the previous request.

------------------------------------------------------------------------

# 26. Error Handling

The extension must handle:

  -----------------------------------------------------------------------
  Situation                           Expected behavior
  ----------------------------------- -----------------------------------
  Java not installed                  Clear installation message

  `javac` unavailable                 Explain that a JDK is required

  No Java file open                   Friendly message

  Wrong file type                     Friendly message

  Compilation error                   Show diagnostic

  Runtime error                       Show diagnostic

  No `main` method                    Compile-only mode

  Infinite loop                       Timeout and explanation

  AI API unavailable                  Retry + fallback

  Invalid API key                     Ask user to re-enter key

  Rate limit                          Friendly wait/retry message

  Invalid AI JSON                     Retry once, then fallback

  Large source file                   Truncate context

  Empty file                          Friendly message

  User edits during request           Prevent stale response from
                                      overwriting new state
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 27. Offline/Fallback Explanation Layer

A lightweight pattern layer should eventually provide explanations for
common errors without requiring AI.

Examples:

``` text
cannot find symbol
missing return statement
incompatible types
';' expected
NullPointerException
ArithmeticException
ArrayIndexOutOfBoundsException
ClassCastException
StackOverflowError
```

For example:

``` text
ArithmeticException

This usually occurs when integer division uses zero
as the denominator.

Check the values involved in the division.
```

This should be a fallback, not a replacement for the AI tutor.

------------------------------------------------------------------------

# 28. Phase 7 --- Testing

The current repository already contains:

``` text
src/test/
```

Therefore, inspect and reuse the existing testing setup instead of
automatically replacing it.

Test:

## Unit Tests

### Diagnostic parser

Test compiler output such as:

``` text
';' expected
cannot find symbol
incompatible types
missing return statement
```

### Runtime parser

Test:

``` text
ArithmeticException
NullPointerException
ArrayIndexOutOfBoundsException
StackOverflowError
```

### Context builder

Verify:

-   correct lines included
-   size limit
-   selected code included
-   diagnostic included

### Prompt builder

Verify:

-   Java teacher instructions
-   no automatic fixing
-   mode-specific instructions
-   hint level

### Response parser

Test:

-   valid JSON
-   fenced JSON
-   missing fields
-   malformed JSON
-   extra fields
-   unsafe/overly large response

### Tutor session

Verify:

``` text
1 → 2 → 3
```

and that the level does not exceed 3.

------------------------------------------------------------------------

# 29. Java Test Fixtures

Create:

``` text
src/test/fixtures/
```

Suggested fixtures:

``` text
divisionByZero.java
missingSemicolon.java
undefinedVariable.java
incompatibleTypes.java
nullPointer.java
arrayIndexError.java
missingReturn.java
infiniteRecursion.java
infiniteLoop.java
cleanProgram.java
```

Expected behavior:

  Fixture             Expected result
  ------------------- ------------------------------------------
  divisionByZero      Runtime `ArithmeticException`
  missingSemicolon    Compile error
  undefinedVariable   Compile error
  incompatibleTypes   Compile error
  nullPointer         Runtime `NullPointerException`
  arrayIndexError     Runtime `ArrayIndexOutOfBoundsException`
  missingReturn       Compile error
  infiniteRecursion   `StackOverflowError`
  infiniteLoop        Timeout
  cleanProgram        No diagnostic

------------------------------------------------------------------------

# 30. AI Testing

Use a mocked AI provider for normal automated tests.

Do not require a live API call for every CI/test run.

Test:

``` text
Diagnostic
 ↓
PromptBuilder
 ↓
Mock AI
 ↓
ResponseParser
 ↓
TutorResponse
```

Also maintain an optional manual/live evaluation script.

Check:

-   valid schema
-   beginner-friendly explanation
-   useful hint
-   no automatic correction in Hint/Explain/Guided modes
-   no excessive context
-   no repeated hints

------------------------------------------------------------------------

# 31. Integration Testing

Test:

-   extension activates
-   commands are registered
-   Java file is detected
-   diagnostics are populated
-   tutor session is updated
-   sidebar receives state
-   Try Again re-runs analysis

The AI provider should be mocked during automated integration tests.

------------------------------------------------------------------------

# 32. UI Testing

Test:

-   empty state
-   loading state
-   error state
-   successful explanation
-   hint button
-   explain more
-   try again
-   solution confirmation

Also manually test:

-   VS Code dark theme
-   VS Code light theme
-   small editor window
-   sidebar hidden/reopened

------------------------------------------------------------------------

# 33. Phase 8 --- Packaging

Once the MVP works:

``` text
npm run compile
```

Then package using the existing VS Code packaging setup.

Verify:

-   extension activates
-   commands appear
-   Java analysis works
-   AI integration works
-   API key is not bundled
-   no unnecessary files are packaged

Inspect the generated VSIX before distributing it.

------------------------------------------------------------------------

# 34. Recommended Build Order

Follow this exact order.

## Milestone 0 --- Understand Existing Project

1.  Inspect `package.json`.
2.  Inspect `src/extension.ts`.
3.  Inspect `esbuild.js`.
4.  Inspect `src/test/`.
5.  Run existing tests.
6.  Run the extension with F5.
7.  Create `docs/AUDIT.md`.

------------------------------------------------------------------------

## Milestone 1 --- Java Compiler Diagnostics

1.  Create `src/java/`.
2.  Create `types.ts`.
3.  Implement Java environment detection.
4.  Implement `JavaRunner`.
5.  Implement `diagnosticParser`.
6.  Connect to `DiagnosticCollection`.
7.  Add compiler fixtures.
8.  Test on Windows.
9.  Confirm red squiggles work.

### Milestone 1 Definition of Done

This must work:

``` text
Java file with compile error
        ↓
CodeMentor
        ↓
Compiler detects error
        ↓
VS Code shows correct diagnostic
```

No AI required.

------------------------------------------------------------------------

## Milestone 2 --- Runtime Diagnostics

1.  Implement runtime execution.
2.  Add timeout.
3.  Add output cap.
4.  Parse runtime stack traces.
5.  Add runtime fixtures.
6.  Test clean program.
7.  Test runtime errors.
8.  Test infinite loop.

### Milestone 2 Definition of Done

``` text
Compile
 ↓
Run
 ↓
Detect runtime error
 ↓
Show correct diagnostic
```

------------------------------------------------------------------------

## Milestone 3 --- Tutor UI Skeleton

Before connecting AI, create a sidebar that displays fake/sample data.

Example:

``` text
Problem:
ArithmeticException

Why:
You attempted to divide by zero.

Hint:
Check the denominator.

[Give Another Hint]
[Try Again]
```

This proves the UI works independently of AI.

------------------------------------------------------------------------

## Milestone 4 --- Context and Prompt System

Implement:

``` text
ContextBuilder
PromptBuilder
TutorResponse
```

Test them using fixed sample diagnostics.

------------------------------------------------------------------------

## Milestone 5 --- AI Integration

1.  Implement `AiProvider`.
2.  Implement provider-specific class.
3.  Add SecretStorage.
4.  Add Set API Key command.
5.  Add consent.
6.  Add response validation.
7.  Add retry.
8.  Add fallback.

Start with a mock provider.

Then connect the real provider.

------------------------------------------------------------------------

## Milestone 6 --- End-to-End MVP

The complete flow:

``` text
Open Java file
      ↓
CodeMentor: Explain Error
      ↓
Compile
      ↓
Detect diagnostic
      ↓
Build relevant context
      ↓
AI explanation
      ↓
Display in sidebar
      ↓
Give Another Hint
      ↓
Student edits code
      ↓
Try Again
      ↓
No errors
```

This is the primary MVP.

------------------------------------------------------------------------

# 35. MVP Feature Classification

## MUST HAVE

-   Java file detection
-   Java compiler detection
-   `javac` compilation
-   Compiler diagnostic parser
-   VS Code diagnostic collection
-   Basic runtime analysis
-   Runtime timeout
-   AI provider abstraction
-   AI explanation
-   Structured AI response
-   Context builder
-   Hint system
-   Sidebar WebviewView
-   Explain Error command
-   Give Hint command
-   Try Again
-   API key security
-   Basic consent
-   Basic error handling
-   Unit tests for diagnostics
-   End-to-end MVP flow

------------------------------------------------------------------------

## SHOULD HAVE

Implement after the core MVP works:

-   Explain Selected Code
-   Explain This Concept
-   Quick-fix "Explain with CodeMentor"
-   Compile on save
-   Offline pattern explanations
-   What Will Be Sent preview
-   Guided multi-turn tutoring
-   Hover summaries
-   Better concept tagging
-   Better multi-file Java support

------------------------------------------------------------------------

## FUTURE

Do not implement during the initial MVP:

-   Student profiles
-   Learning progress dashboard
-   Difficulty levels
-   AI-generated exercises
-   Quizzes
-   LeetCode integration
-   Gamification
-   Streaks
-   Voice tutoring
-   Other programming languages
-   Local/offline LLM
-   Maven/Gradle support
-   Advanced logical-bug detection
-   Advanced code-smell detection

------------------------------------------------------------------------

# 36. Things We Should NOT Overbuild

Avoid these mistakes:

## Do not create a full backend immediately

For the initial version, SecretStorage + direct provider integration is
enough.

## Do not use AI for compiler detection

Use `javac`.

## Do not send the whole project to the AI

Send only relevant context.

## Do not automatically rewrite the student's code

The educational value is in making the student solve it.

## Do not build all future features before the MVP

The core product must work first.

## Do not replace the current scaffold

Extend the existing TypeScript + esbuild VS Code extension.

## Do not manually modify `dist/`

`dist/` is generated.

## Do not commit `node_modules/`

Use the existing `.gitignore`.

------------------------------------------------------------------------

# 37. Final Target Architecture

When the MVP is complete:

``` text
                         VS Code
                            │
                            ▼
                  ┌──────────────────┐
                  │ CodeMentor        │
                  │ Extension         │
                  └────────┬─────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       Java Analyzer              Tutor UI
              │                         │
       ┌──────┴──────┐                  │
       │             │                  │
     javac          java                │
       │             │                  │
       └──────┬──────┘                  │
              ▼                         │
        Diagnostic[]                    │
              │                         │
              ▼                         │
       Context Builder                  │
              │                         │
              ▼                         │
       Prompt Builder                   │
              │                         │
              ▼                         │
          AI Provider                   │
              │                         │
              ▼                         │
       Response Parser                  │
              │                         │
              ▼                         │
        Tutor Session ──────────────────┘
              │
              ▼
        Student learns
```

------------------------------------------------------------------------

# 38. Final Definition of Done

CodeMentor MVP is complete when a student can:

1.  Open a Java file in VS Code.
2.  Introduce a Java error.
3.  Run `CodeMentor: Explain Error`.
4.  CodeMentor compiles the program.
5.  CodeMentor detects the actual Java diagnostic.
6.  The relevant line is highlighted.
7.  The diagnostic appears in VS Code.
8.  Relevant code context is collected.
9.  The AI explains:
    -   what happened
    -   why it happened
    -   the Java concept
    -   a hint
10. The student can request another hint.
11. The student edits the code themselves.
12. The student presses `Try Again`.
13. CodeMentor analyzes the new version.
14. A correct program produces a success state.
15. API keys remain secure.
16. AI failures do not crash the extension.
17. Automated tests cover the critical Java analysis and tutor pipeline.

The most important product test is:

> **Can a beginner understand their Java mistake and fix it themselves
> after using CodeMentor?**

If yes, the MVP is doing what it is supposed to do.
