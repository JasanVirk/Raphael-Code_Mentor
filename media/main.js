(function () {
    // Acquire the VS Code API
    const vscode = acquireVsCodeApi();

    const rootContainer = document.getElementById('app-root');

    // Helper: Escapes text to prevent HTML injection / XSS
    function escapeHtml(text) {
        if (!text) {
            return '';
        }
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Post action back to the extension
    window.postAction = function (type, payload) {
        vscode.postMessage({ type, ...payload });
    };

    window.jumpToLine = function (line) {
        vscode.postMessage({ type: 'jumpToLine', line: Number(line) });
    };

    // Renderers for UI states
    function renderEmpty() {
        rootContainer.innerHTML = `
            <div class="card state-center empty-state">
                <div class="state-icon">&#128218;</div>
                <div class="state-title">Ready to Learn</div>
                <div class="state-desc">Open a Java file and run <strong>CodeMentor: Explain Error</strong> to analyze compiler or runtime mistakes.</div>
            </div>
            <div class="button-group">
                <button class="cm-btn" onclick="postAction('explainError')">
                    &#9654; Explain Active Java File
                </button>
            </div>
        `;
    }

    function renderLoading(message) {
        const text = message || 'Analyzing your Java code...';
        rootContainer.innerHTML = `
            <div class="card spinner-container">
                <div class="spinner"></div>
                <div class="loading-text">${escapeHtml(text)}</div>
            </div>
        `;
    }

    function renderSuccess(message) {
        const text = message || 'No errors detected! Your Java program compiled and ran cleanly.';
        rootContainer.innerHTML = `
            <div class="card state-center success-state">
                <div class="state-icon">&#9989;</div>
                <div class="state-title">Clean Execution</div>
                <div class="state-desc">${escapeHtml(text)}</div>
            </div>
            <div class="button-group">
                <button class="cm-btn secondary" onclick="postAction('tryAgain')">
                    &#8635; Run Analysis Again
                </button>
            </div>
        `;
    }

    function renderError(message) {
        rootContainer.innerHTML = `
            <div class="card error-banner">
                <div class="section-title">&#9888; Notice</div>
                <p>${escapeHtml(message)}</p>
            </div>
            <div class="button-group">
                <button class="cm-btn" onclick="postAction('explainError')">
                    &#8635; Retry Analysis
                </button>
            </div>
        `;
    }

    function renderExplanation(payload) {
        const { response, diagnostic, hintLevel } = payload;
        const currentLevel = hintLevel || 1;
        const line = diagnostic ? diagnostic.line : (response.location ? response.location.line : 1);
        const canNextHint = currentLevel < 3 && response.nextHintAvailable !== false;

        // Hint bar pills
        const pill1Class = currentLevel >= 1 ? 'active' : '';
        const pill2Class = currentLevel >= 2 ? 'active' : (canNextHint && currentLevel === 1 ? 'available' : '');
        const pill3Class = currentLevel >= 3 ? 'active' : (canNextHint && currentLevel === 2 ? 'available' : '');

        let exampleHtml = '';
        if (response.example && response.example.trim().length > 0) {
            exampleHtml = `
                <div class="card">
                    <div class="section-title">&#128161; Analogous Example</div>
                    <pre class="code-example"><code>${escapeHtml(response.example)}</code></pre>
                </div>
            `;
        }

        let questionHtml = '';
        if (response.learningQuestion && response.learningQuestion.trim().length > 0) {
            questionHtml = `
                <div class="card question-card">
                    <div class="section-title">&#129300; Think About This</div>
                    <div class="question-text">${escapeHtml(response.learningQuestion)}</div>
                </div>
            `;
        }

        rootContainer.innerHTML = `
            <!-- Error Header Banner -->
            <div class="card error-banner">
                <div class="error-header">
                    <div class="error-title">${escapeHtml(response.errorSummary)}</div>
                    <span class="line-chip" title="Click to view line in editor" onclick="jumpToLine(${line})">Line ${line}</span>
                </div>
                <div class="section-title">What Happened</div>
                <p>${escapeHtml(response.whatHappened)}</p>
            </div>

            <!-- Why Card -->
            <div class="card">
                <div class="section-title">Why It Happened</div>
                <p>${escapeHtml(response.why || 'A syntax constraint or runtime invariant was not met.')}</p>
            </div>

            <!-- Concept Box -->
            <div class="card concept-box">
                <div class="section-title">Java Concept</div>
                <div class="concept-name">${escapeHtml(response.concept.name)}</div>
                <p>${escapeHtml(response.concept.explanation)}</p>
            </div>

            <!-- Progressive Hint Card -->
            <div class="card hint-card">
                <div class="hint-levels-bar">
                    <div class="hint-pill ${pill1Class}" title="Hint 1: Conceptual Nudge"></div>
                    <div class="hint-pill ${pill2Class}" title="Hint 2: Condition / Code Focus"></div>
                    <div class="hint-pill ${pill3Class}" title="Hint 3: Concrete Fix Guidance"></div>
                </div>
                <div class="hint-level-tag">Hint Level ${currentLevel} of 3</div>
                <p>${escapeHtml(response.hint)}</p>
            </div>

            ${exampleHtml}
            ${questionHtml}

            <!-- Action Buttons -->
            <div class="button-group">
                <button class="cm-btn" onclick="postAction('giveHint')" ${!canNextHint ? 'disabled' : ''}>
                    ${canNextHint ? `&#128161; Give Another Hint (${currentLevel + 1}/3)` : '&#10003; All Hints Unlocked'}
                </button>
                <button class="cm-btn secondary" onclick="postAction('tryAgain')">
                    &#8635; Try Again (Re-analyze)
                </button>
            </div>
        `;
    }

    // Handle messages sent from the extension
    window.addEventListener('message', (event) => {
        const message = event.data;
        if (!message || !message.type) {
            return;
        }

        switch (message.type) {
            case 'setLoading':
                vscode.setState({ type: 'loading', message: message.message });
                renderLoading(message.message);
                break;

            case 'showExplanation':
                vscode.setState({ type: 'explanation', payload: message.payload });
                renderExplanation(message.payload);
                break;

            case 'showSuccess':
                vscode.setState({ type: 'success', message: message.message });
                renderSuccess(message.message);
                break;

            case 'showError':
                vscode.setState({ type: 'error', message: message.message });
                renderError(message.message);
                break;

            case 'reset':
                vscode.setState(null);
                renderEmpty();
                break;
        }
    });

    // Restore previous state if returning to webview, otherwise show initial empty state
    const previousState = vscode.getState();
    if (previousState) {
        if (previousState.type === 'explanation') {
            renderExplanation(previousState.payload);
        } else if (previousState.type === 'loading') {
            renderLoading(previousState.message);
        } else if (previousState.type === 'success') {
            renderSuccess(previousState.message);
        } else if (previousState.type === 'error') {
            renderError(previousState.message);
        } else {
            renderEmpty();
        }
    } else {
        renderEmpty();
    }
})();
