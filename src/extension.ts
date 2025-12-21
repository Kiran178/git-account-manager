import * as vscode from 'vscode';
import { AccountManager } from './services/accountManager';
import { SecretStorageService } from './services/secretStorage';
import { GitService } from './services/gitService';
import { RepoMappingService } from './services/repoMappingService';
import { StatusBarManager } from './ui/statusBar';
import { registerCommands } from './ui/commands';

let statusBarManager: StatusBarManager | undefined;

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('Git Account Manager is now active!');

    // Initialize services
    const secretStorage = new SecretStorageService(context.secrets);
    const accountManager = new AccountManager(context, secretStorage);
    const gitService = new GitService();
    const repoMappingService = new RepoMappingService(
        context,
        accountManager,
        gitService
    );

    // Initialize all services
    await accountManager.initialize();
    await repoMappingService.initialize();

    // Initialize status bar
    statusBarManager = new StatusBarManager(accountManager, repoMappingService);
    await statusBarManager.initialize();
    context.subscriptions.push({ dispose: () => statusBarManager?.dispose() });

    // Register commands
    registerCommands(
        context,
        accountManager,
        secretStorage,
        gitService,
        repoMappingService,
        statusBarManager
    );

    // Refresh status bar when workspace changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(async () => {
            await statusBarManager?.refresh();
        })
    );

    // Refresh status bar when a file named .gitaccount changes
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(async (document) => {
            if (document.fileName.endsWith('.gitaccount')) {
                await statusBarManager?.refresh();
            }
        })
    );
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
    console.log('Git Account Manager deactivated');
}
