import * as vscode from 'vscode';
import { AccountManager } from '../services/accountManager';
import { RepoMappingService } from '../services/repoMappingService';

/**
 * Status bar item showing current Git account
 */
export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;
    private currentAccountId: string | undefined;

    constructor(
        private readonly accountManager: AccountManager,
        private readonly repoMappingService: RepoMappingService
    ) {
        // Create status bar item on the left side
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );

        // Clicking opens the switch account command
        this.statusBarItem.command = 'gitManager.switchAccount';
        this.statusBarItem.tooltip = 'Click to switch Git account';
    }

    /**
     * Initialize and show the status bar
     */
    async initialize(): Promise<void> {
        await this.refresh();
        this.statusBarItem.show();
    }

    /**
     * Refresh the status bar item
     */
    async refresh(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

        if (!workspaceFolder) {
            this.statusBarItem.text = '$(github) No Workspace';
            this.statusBarItem.backgroundColor = undefined;
            this.currentAccountId = undefined;
            return;
        }

        // Try to detect account for current repo
        const detectedAccountId = await this.repoMappingService.detectAccountForRepo(
            workspaceFolder.uri.fsPath
        );

        if (detectedAccountId) {
            const account = this.accountManager.getAccountById(detectedAccountId);
            if (account) {
                this.currentAccountId = account.id;
                const icon = account.authType === 'ssh' ? '$(key)' : '$(github)';
                this.statusBarItem.text = `${icon} ${account.name}`;
                this.statusBarItem.backgroundColor = undefined;
                return;
            }
        }

        // No account configured
        this.currentAccountId = undefined;
        this.statusBarItem.text = '$(github) Select Account';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
            'statusBarItem.warningBackground'
        );
    }

    /**
     * Get the current account ID
     */
    getCurrentAccountId(): string | undefined {
        return this.currentAccountId;
    }

    /**
     * Update the status bar to show a specific account
     */
    setAccount(accountId: string): void {
        const account = this.accountManager.getAccountById(accountId);
        if (account) {
            this.currentAccountId = account.id;
            const icon = account.authType === 'ssh' ? '$(key)' : '$(github)';
            this.statusBarItem.text = `${icon} ${account.name}`;
            this.statusBarItem.backgroundColor = undefined;
        }
    }

    /**
     * Dispose the status bar item
     */
    dispose(): void {
        this.statusBarItem.dispose();
    }
}
