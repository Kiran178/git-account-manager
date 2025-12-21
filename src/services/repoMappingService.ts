import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { RepoMapping, GitAccountConfig, STORAGE_KEYS } from '../types';
import { AccountManager } from './accountManager';
import { GitService } from './gitService';

/**
 * Service for managing repository-to-account mappings
 */
export class RepoMappingService {
    private mappings: Map<string, RepoMapping> = new Map();

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly accountManager: AccountManager,
        private readonly gitService: GitService
    ) { }

    /**
     * Initialize the mapping service
     */
    async initialize(): Promise<void> {
        await this.loadMappings();
    }

    /**
     * Load mappings from global state
     */
    private async loadMappings(): Promise<void> {
        const saved = this.context.globalState.get<Record<string, RepoMapping>>(STORAGE_KEYS.MAPPINGS, {});
        this.mappings = new Map(Object.entries(saved));
    }

    /**
     * Save mappings to global state
     */
    private async saveMappings(): Promise<void> {
        const obj = Object.fromEntries(this.mappings);
        await this.context.globalState.update(STORAGE_KEYS.MAPPINGS, obj);
    }

    /**
     * Set mapping for a repository
     */
    async setMapping(repoPath: string, accountId: string, remotePattern?: string): Promise<void> {
        this.mappings.set(repoPath, {
            repoPath,
            accountId,
            remotePattern,
        });
        await this.saveMappings();
    }

    /**
     * Remove mapping for a repository
     */
    async removeMapping(repoPath: string): Promise<void> {
        this.mappings.delete(repoPath);
        await this.saveMappings();
    }

    /**
     * Get mapping for a repository
     */
    getMapping(repoPath: string): RepoMapping | undefined {
        return this.mappings.get(repoPath);
    }

    /**
     * Read .gitaccount file from repository
     */
    private readGitAccountFile(repoPath: string): GitAccountConfig | undefined {
        const configPath = path.join(repoPath, '.gitaccount');

        try {
            if (fs.existsSync(configPath)) {
                const content = fs.readFileSync(configPath, 'utf-8');
                return JSON.parse(content) as GitAccountConfig;
            }
        } catch (error) {
            console.error('Error reading .gitaccount file:', error);
        }

        return undefined;
    }

    /**
     * Detect account for a repository using multiple strategies
     * Priority:
     * 1. .gitaccount file in repo root
     * 2. Remote URL pattern matching
     * 3. Workspace-level mapping
     * 4. undefined (requires manual selection)
     */
    async detectAccountForRepo(repoPath: string): Promise<string | undefined> {
        // 1. Check .gitaccount file
        const fileConfig = this.readGitAccountFile(repoPath);
        if (fileConfig) {
            if (fileConfig.accountId) {
                const account = this.accountManager.getAccountById(fileConfig.accountId);
                if (account) {
                    return account.id;
                }
            }
            if (fileConfig.accountName) {
                const account = this.accountManager.getAccountByName(fileConfig.accountName);
                if (account) {
                    return account.id;
                }
            }
        }

        // 2. Check remote URL patterns
        const remoteUrl = await this.gitService.getRemoteUrl(repoPath);
        if (remoteUrl) {
            for (const [, mapping] of this.mappings) {
                if (mapping.remotePattern && remoteUrl.includes(mapping.remotePattern)) {
                    return mapping.accountId;
                }
            }
        }

        // 3. Check workspace-level mapping
        const directMapping = this.mappings.get(repoPath);
        if (directMapping) {
            return directMapping.accountId;
        }

        return undefined;
    }

    /**
     * Write .gitaccount file to repository
     */
    async writeGitAccountFile(repoPath: string, accountId: string): Promise<void> {
        const account = this.accountManager.getAccountById(accountId);
        if (!account) {
            throw new Error('Account not found');
        }

        const config: GitAccountConfig = {
            accountId: account.id,
            accountName: account.name,
        };

        const configPath = path.join(repoPath, '.gitaccount');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
}
