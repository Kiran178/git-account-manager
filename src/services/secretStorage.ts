import * as vscode from 'vscode';
import { STORAGE_KEYS } from '../types';

/**
 * Service for securely storing sensitive data like Personal Access Tokens
 */
export class SecretStorageService {
    constructor(private readonly secretStorage: vscode.SecretStorage) { }

    /**
     * Store a Personal Access Token for an account
     */
    async storeToken(accountId: string, token: string): Promise<void> {
        const key = `${STORAGE_KEYS.PAT_PREFIX}${accountId}`;
        await this.secretStorage.store(key, token);
    }

    /**
     * Retrieve a Personal Access Token for an account
     */
    async getToken(accountId: string): Promise<string | undefined> {
        const key = `${STORAGE_KEYS.PAT_PREFIX}${accountId}`;
        return await this.secretStorage.get(key);
    }

    /**
     * Delete a Personal Access Token for an account
     */
    async deleteToken(accountId: string): Promise<void> {
        const key = `${STORAGE_KEYS.PAT_PREFIX}${accountId}`;
        await this.secretStorage.delete(key);
    }

    /**
     * Check if a token exists for an account
     */
    async hasToken(accountId: string): Promise<boolean> {
        const token = await this.getToken(accountId);
        return token !== undefined && token.length > 0;
    }
}
