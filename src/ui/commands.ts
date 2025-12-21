import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { GitAccount } from '../types';
import { AccountManager } from '../services/accountManager';
import { SecretStorageService } from '../services/secretStorage';
import { GitService } from '../services/gitService';
import { RepoMappingService } from '../services/repoMappingService';
import { StatusBarManager } from './statusBar';

/**
 * Register all extension commands
 */
export function registerCommands(
    context: vscode.ExtensionContext,
    accountManager: AccountManager,
    secretStorage: SecretStorageService,
    gitService: GitService,
    repoMappingService: RepoMappingService,
    statusBarManager: StatusBarManager
): void {
    // Add Account Command
    context.subscriptions.push(
        vscode.commands.registerCommand('gitManager.addAccount', async () => {
            await addAccountCommand(accountManager, secretStorage, gitService);
            await statusBarManager.refresh();
        })
    );

    // Remove Account Command
    context.subscriptions.push(
        vscode.commands.registerCommand('gitManager.removeAccount', async () => {
            await removeAccountCommand(accountManager);
            await statusBarManager.refresh();
        })
    );

    // Switch Account Command
    context.subscriptions.push(
        vscode.commands.registerCommand('gitManager.switchAccount', async () => {
            await switchAccountCommand(
                accountManager,
                gitService,
                repoMappingService,
                statusBarManager
            );
        })
    );

    // Configure Repo Command
    context.subscriptions.push(
        vscode.commands.registerCommand('gitManager.configureRepo', async () => {
            await configureRepoCommand(accountManager, repoMappingService);
            await statusBarManager.refresh();
        })
    );

    // List Accounts Command
    context.subscriptions.push(
        vscode.commands.registerCommand('gitManager.listAccounts', async () => {
            await listAccountsCommand(accountManager, secretStorage);
        })
    );
}

/**
 * Command: Add a new Git account
 */
async function addAccountCommand(
    accountManager: AccountManager,
    secretStorage: SecretStorageService,
    gitService: GitService
): Promise<void> {
    // Step 1: Account name
    const name = await vscode.window.showInputBox({
        prompt: 'Enter a display name for this account',
        placeHolder: 'e.g., Work, Personal, Client-XYZ',
        validateInput: (value) => {
            if (!value?.trim()) {
                return 'Name is required';
            }
            if (accountManager.getAccountByName(value)) {
                return 'An account with this name already exists';
            }
            return undefined;
        },
    });

    if (!name) {
        return;
    }

    // Step 2: GitHub username
    const username = await vscode.window.showInputBox({
        prompt: 'Enter your GitHub username',
        placeHolder: 'e.g., johndoe',
        validateInput: (value) => {
            if (!value?.trim()) {
                return 'Username is required';
            }
            return undefined;
        },
    });

    if (!username) {
        return;
    }

    // Step 3: Git email
    const email = await vscode.window.showInputBox({
        prompt: 'Enter the email for Git commits',
        placeHolder: 'e.g., john@example.com',
        validateInput: (value) => {
            if (!value?.trim()) {
                return 'Email is required';
            }
            if (!value.includes('@')) {
                return 'Please enter a valid email';
            }
            return undefined;
        },
    });

    if (!email) {
        return;
    }

    // Step 4: Authentication type
    const authType = await vscode.window.showQuickPick(
        [
            { label: '$(key) SSH Key', value: 'ssh', description: 'Use SSH key for authentication' },
            { label: '$(lock) Personal Access Token', value: 'pat', description: 'Use PAT for HTTPS authentication' },
        ],
        { placeHolder: 'Select authentication method' }
    );

    if (!authType) {
        return;
    }

    let sshKeyPath: string | undefined;
    let sshHost: string | undefined;
    let pat: string | undefined;

    if (authType.value === 'ssh') {
        // SSH Key path
        const defaultSshPath = path.join(os.homedir(), '.ssh', 'id_rsa');
        sshKeyPath = await vscode.window.showInputBox({
            prompt: 'Enter the path to your SSH private key',
            value: defaultSshPath,
            validateInput: (value) => {
                if (!value?.trim()) {
                    return 'SSH key path is required';
                }
                return undefined;
            },
        });

        if (!sshKeyPath) {
            return;
        }

        // SSH Host alias
        const suggestedHost = `github.com-${name.toLowerCase().replace(/\s+/g, '-')}`;
        sshHost = await vscode.window.showInputBox({
            prompt: 'Enter SSH host alias (used in remote URLs)',
            value: suggestedHost,
            placeHolder: 'e.g., github.com-work',
        });

        if (!sshHost) {
            return;
        }
    } else {
        // Personal Access Token
        pat = await vscode.window.showInputBox({
            prompt: 'Enter your GitHub Personal Access Token',
            password: true,
            placeHolder: 'ghp_xxxxxxxxxxxx',
            validateInput: (value) => {
                if (!value?.trim()) {
                    return 'Token is required';
                }
                return undefined;
            },
        });

        if (!pat) {
            return;
        }
    }

    // Create the account
    try {
        const account = await accountManager.addAccount(
            {
                name,
                username,
                email,
                authType: authType.value as 'ssh' | 'pat',
                sshKeyPath,
                sshHost,
            },
            pat
        );

        // Add SSH config entry if needed
        if (authType.value === 'ssh' && sshHost) {
            await gitService.addSSHConfigEntry(account);
        }

        vscode.window.showInformationMessage(`Account "${name}" added successfully!`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to add account: ${error}`);
    }
}

/**
 * Command: Remove a Git account
 */
async function removeAccountCommand(accountManager: AccountManager): Promise<void> {
    const accounts = accountManager.getAccounts();

    if (accounts.length === 0) {
        vscode.window.showInformationMessage('No accounts configured yet.');
        return;
    }

    const selection = await vscode.window.showQuickPick(
        accounts.map((acc) => ({
            label: acc.name,
            description: `${acc.username} (${acc.authType.toUpperCase()})`,
            detail: acc.email,
            account: acc,
        })),
        { placeHolder: 'Select account to remove' }
    );

    if (!selection) {
        return;
    }

    const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to remove the account "${selection.account.name}"?`,
        { modal: true },
        'Remove'
    );

    if (confirm === 'Remove') {
        await accountManager.removeAccount(selection.account.id);
        vscode.window.showInformationMessage(`Account "${selection.account.name}" removed.`);
    }
}

/**
 * Command: Switch Git account for current repository
 */
async function switchAccountCommand(
    accountManager: AccountManager,
    gitService: GitService,
    repoMappingService: RepoMappingService,
    statusBarManager: StatusBarManager
): Promise<void> {
    const accounts = accountManager.getAccounts();

    if (accounts.length === 0) {
        const action = await vscode.window.showInformationMessage(
            'No accounts configured. Would you like to add one?',
            'Add Account'
        );
        if (action === 'Add Account') {
            await vscode.commands.executeCommand('gitManager.addAccount');
        }
        return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open.');
        return;
    }

    const currentAccountId = statusBarManager.getCurrentAccountId();

    // Build quick pick items with accounts and add new option
    type AccountPickItem = vscode.QuickPickItem & { account?: GitAccount; isAddNew?: boolean };

    const accountItems: AccountPickItem[] = accounts.map((acc) => ({
        label: currentAccountId === acc.id ? `$(check) ${acc.name}` : acc.name,
        description: `${acc.username} (${acc.authType.toUpperCase()})`,
        detail: acc.email,
        account: acc,
    }));

    // Add separator and "Add new account" option
    const addNewItem: AccountPickItem = {
        label: '$(add) Add new account...',
        description: 'Configure a new GitHub account',
        isAddNew: true,
    };

    const allItems: AccountPickItem[] = [
        ...accountItems,
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        addNewItem,
    ];

    const selection = await vscode.window.showQuickPick(allItems, {
        placeHolder: 'Select account to use for this repository',
    });

    if (!selection) {
        return;
    }

    // Handle "Add new account" selection
    if (selection.isAddNew) {
        await vscode.commands.executeCommand('gitManager.addAccount');
        return;
    }

    const account = selection.account;
    if (!account) {
        return;
    }

    try {
        // Update git config
        await gitService.setUserConfig(account.username, account.email, workspaceFolder.uri.fsPath);

        // Configure SSH if applicable
        if (account.authType === 'ssh') {
            await gitService.configureSSHForAccount(account, workspaceFolder.uri.fsPath);
        }

        // Save mapping
        await repoMappingService.setMapping(workspaceFolder.uri.fsPath, account.id);

        // Update status bar
        statusBarManager.setAccount(account.id);

        vscode.window.showInformationMessage(`Switched to account "${account.name}"`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to switch account: ${error}`);
    }
}

/**
 * Command: Configure repository account mapping
 */
async function configureRepoCommand(
    accountManager: AccountManager,
    repoMappingService: RepoMappingService
): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open.');
        return;
    }

    const accounts = accountManager.getAccounts();
    if (accounts.length === 0) {
        vscode.window.showInformationMessage('No accounts configured yet.');
        return;
    }

    const selection = await vscode.window.showQuickPick(
        accounts.map((acc) => ({
            label: acc.name,
            description: `${acc.username} (${acc.authType.toUpperCase()})`,
            account: acc,
        })),
        { placeHolder: 'Select default account for this repository' }
    );

    if (!selection) {
        return;
    }

    const saveOption = await vscode.window.showQuickPick(
        [
            {
                label: 'Save to VS Code settings',
                description: 'Account preference stored in VS Code',
                value: 'settings',
            },
            {
                label: 'Save to .gitaccount file',
                description: 'Create a config file in the repository (can be committed)',
                value: 'file',
            },
        ],
        { placeHolder: 'How would you like to save this preference?' }
    );

    if (!saveOption) {
        return;
    }

    if (saveOption.value === 'file') {
        await repoMappingService.writeGitAccountFile(
            workspaceFolder.uri.fsPath,
            selection.account.id
        );
        vscode.window.showInformationMessage('Created .gitaccount file in repository.');
    } else {
        await repoMappingService.setMapping(workspaceFolder.uri.fsPath, selection.account.id);
        vscode.window.showInformationMessage('Account preference saved to VS Code settings.');
    }
}

/**
 * Command: List all configured accounts
 */
async function listAccountsCommand(
    accountManager: AccountManager,
    secretStorage: SecretStorageService
): Promise<void> {
    const accounts = accountManager.getAccounts();

    if (accounts.length === 0) {
        vscode.window.showInformationMessage('No accounts configured yet.');
        return;
    }

    const items = await Promise.all(
        accounts.map(async (acc) => {
            const hasToken = acc.authType === 'pat' ? await secretStorage.hasToken(acc.id) : false;
            return {
                label: acc.name,
                description: `${acc.username} | ${acc.authType.toUpperCase()}`,
                detail: `Email: ${acc.email}${acc.sshHost ? ` | SSH Host: ${acc.sshHost}` : ''}${hasToken ? ' | Token: ✓' : ''}`,
            };
        })
    );

    await vscode.window.showQuickPick(items, {
        placeHolder: 'Configured accounts (press Escape to close)',
        canPickMany: false,
    });
}
