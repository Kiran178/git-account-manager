/**
 * Represents a configured Git/GitHub account
 */
export interface GitAccount {
    /** Unique identifier for the account */
    id: string;
    /** Display name (e.g., "Work", "Personal") */
    name: string;
    /** GitHub username */
    username: string;
    /** Git commit email */
    email: string;
    /** Authentication type */
    authType: 'ssh' | 'pat';
    /** Path to SSH private key (for SSH auth) */
    sshKeyPath?: string;
    /** SSH host alias (e.g., github.com-work) */
    sshHost?: string;
}

/**
 * Repository to account mapping
 */
export interface RepoMapping {
    /** Workspace folder path */
    repoPath: string;
    /** Linked account ID */
    accountId: string;
    /** Optional remote URL pattern for auto-detection */
    remotePattern?: string;
}

/**
 * Configuration stored in .gitaccount file
 */
export interface GitAccountConfig {
    /** Account ID to use for this repository */
    accountId?: string;
    /** Account name to use (alternative to ID) */
    accountName?: string;
}

/**
 * Storage keys for SecretStorage
 */
export const STORAGE_KEYS = {
    ACCOUNTS: 'gitManager.accounts',
    MAPPINGS: 'gitManager.repoMappings',
    PAT_PREFIX: 'gitManager.pat.',
} as const;
