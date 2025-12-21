import * as vscode from 'vscode';
import { GitAccount, STORAGE_KEYS } from '../types';
import { SecretStorageService } from './secretStorage';

/**
 * Service for managing Git accounts
 */
export class AccountManager {
    private accounts: GitAccount[] = [];

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly secretStorage: SecretStorageService
    ) { }

    /**
     * Initialize the account manager by loading saved accounts
     */
    async initialize(): Promise<void> {
        await this.loadAccounts();
    }

    /**
     * Load accounts from global state
     */
    private async loadAccounts(): Promise<void> {
        const savedAccounts = this.context.globalState.get<GitAccount[]>(STORAGE_KEYS.ACCOUNTS, []);
        this.accounts = savedAccounts;
    }

    /**
     * Save accounts to global state
     */
    private async saveAccounts(): Promise<void> {
        await this.context.globalState.update(STORAGE_KEYS.ACCOUNTS, this.accounts);
    }

    /**
     * Generate a unique ID for a new account
     */
    private generateId(): string {
        return `account_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add a new account
     */
    async addAccount(account: Omit<GitAccount, 'id'>, pat?: string): Promise<GitAccount> {
        const newAccount: GitAccount = {
            ...account,
            id: this.generateId(),
        };

        this.accounts.push(newAccount);
        await this.saveAccounts();

        // Store PAT if provided
        if (pat && account.authType === 'pat') {
            await this.secretStorage.storeToken(newAccount.id, pat);
        }

        return newAccount;
    }

    /**
     * Remove an account by ID
     */
    async removeAccount(id: string): Promise<boolean> {
        const index = this.accounts.findIndex(acc => acc.id === id);
        if (index === -1) {
            return false;
        }

        const account = this.accounts[index];
        this.accounts.splice(index, 1);
        await this.saveAccounts();

        // Remove PAT if it was a PAT-based account
        if (account.authType === 'pat') {
            await this.secretStorage.deleteToken(id);
        }

        return true;
    }

    /**
     * Get all accounts
     */
    getAccounts(): GitAccount[] {
        return [...this.accounts];
    }

    /**
     * Get account by ID
     */
    getAccountById(id: string): GitAccount | undefined {
        return this.accounts.find(acc => acc.id === id);
    }

    /**
     * Get account by name
     */
    getAccountByName(name: string): GitAccount | undefined {
        return this.accounts.find(acc => acc.name.toLowerCase() === name.toLowerCase());
    }

    /**
     * Update an existing account
     */
    async updateAccount(id: string, updates: Partial<Omit<GitAccount, 'id'>>): Promise<boolean> {
        const account = this.accounts.find(acc => acc.id === id);
        if (!account) {
            return false;
        }

        Object.assign(account, updates);
        await this.saveAccounts();
        return true;
    }
}
