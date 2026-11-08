import * as vscode from 'vscode';

export class SecretManager {
    private static readonly API_KEY_SECRET = 'codementor.apiKey';
    private static readonly CONSENT_KEY = 'codementor.aiConsent';

    constructor(
        private readonly secretStorage: vscode.SecretStorage,
        private readonly globalState: vscode.Memento
    ) {}

    /**
     * Retrieves the stored API key from VS Code SecretStorage.
     */
    public async getApiKey(): Promise<string | undefined> {
        return await this.secretStorage.get(SecretManager.API_KEY_SECRET);
    }

    /**
     * Securely stores the API key in VS Code SecretStorage.
     */
    public async storeApiKey(apiKey: string): Promise<void> {
        await this.secretStorage.store(SecretManager.API_KEY_SECRET, apiKey.trim());
    }

    /**
     * Deletes the stored API key from VS Code SecretStorage.
     */
    public async deleteApiKey(): Promise<void> {
        await this.secretStorage.delete(SecretManager.API_KEY_SECRET);
    }

    /**
     * Checks whether the user has previously granted consent to send code snippets to AI.
     */
    public getConsentStatus(): 'granted' | 'denied' | 'prompt' {
        const stored = this.globalState.get<string>(SecretManager.CONSENT_KEY);
        if (stored === 'granted') {
            return 'granted';
        }
        if (stored === 'denied') {
            return 'denied';
        }
        return 'prompt';
    }

    /**
     * Prompts the user for consent if not already decided.
     * Returns true if user allows, false otherwise.
     */
    public async requestConsentIfNeeded(): Promise<boolean> {
        const current = this.getConsentStatus();
        if (current === 'granted') {
            return true;
        }
        if (current === 'denied') {
            return false;
        }

        // In automated test environments, avoid hanging on interactive notifications
        if (process.env.VSCODE_TEST === '1' || process.env.NODE_ENV === 'test') {
            return false;
        }

        const choice = await vscode.window.showInformationMessage(
            'CodeMentor: May CodeMentor send a small excerpt of your Java code and error diagnostics to the AI provider to generate tutoring explanations?',
            'Allow',
            "Don't Allow"
        );

        if (choice === 'Allow') {
            await this.globalState.update(SecretManager.CONSENT_KEY, 'granted');
            return true;
        } else if (choice === "Don't Allow") {
            await this.globalState.update(SecretManager.CONSENT_KEY, 'denied');
            return false;
        }
        return false;
    }

    /**
     * Programmatically sets the consent preference.
     */
    public async setConsent(status: 'granted' | 'denied'): Promise<void> {
        await this.globalState.update(SecretManager.CONSENT_KEY, status);
    }

    /**
     * Resets the user consent preference.
     */
    public async resetConsent(): Promise<void> {
        await this.globalState.update(SecretManager.CONSENT_KEY, undefined);
    }
}
