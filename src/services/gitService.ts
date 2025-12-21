import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { GitAccount } from '../types';

/**
 * Service for interacting with Git
 */
export class GitService {
    /**
     * Execute a git command in the workspace
     */
    private async execGit(args: string[], cwd?: string): Promise<string> {
        const workspaceFolder = cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        return new Promise((resolve, reject) => {
            cp.exec(`git ${args.join(' ')}`, { cwd: workspaceFolder }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(stderr || error.message));
                } else {
                    resolve(stdout.trim());
                }
            });
        });
    }

    /**
     * Set local git user configuration
     */
    async setUserConfig(name: string, email: string, cwd?: string): Promise<void> {
        await this.execGit(['config', 'user.name', `"${name}"`], cwd);
        await this.execGit(['config', 'user.email', `"${email}"`], cwd);
    }

    /**
     * Get current git user configuration
     */
    async getUserConfig(cwd?: string): Promise<{ name: string; email: string } | undefined> {
        try {
            const name = await this.execGit(['config', 'user.name'], cwd);
            const email = await this.execGit(['config', 'user.email'], cwd);
            return { name, email };
        } catch {
            return undefined;
        }
    }

    /**
     * Get the remote URL of the repository
     */
    async getRemoteUrl(cwd?: string): Promise<string | undefined> {
        try {
            return await this.execGit(['config', '--get', 'remote.origin.url'], cwd);
        } catch {
            return undefined;
        }
    }

    /**
     * Set the remote URL (useful for switching between SSH hosts)
     */
    async setRemoteUrl(url: string, cwd?: string): Promise<void> {
        await this.execGit(['remote', 'set-url', 'origin', url], cwd);
    }

    /**
     * Check if current directory is a git repository
     */
    async isGitRepository(cwd?: string): Promise<boolean> {
        try {
            await this.execGit(['rev-parse', '--git-dir'], cwd);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Configure SSH for an account by updating the remote URL
     * This changes the remote URL to use a custom SSH host alias
     */
    async configureSSHForAccount(account: GitAccount, cwd?: string): Promise<void> {
        if (account.authType !== 'ssh' || !account.sshHost) {
            return;
        }

        const currentUrl = await this.getRemoteUrl(cwd);
        if (!currentUrl) {
            return;
        }

        // Convert URL to use the custom SSH host
        // From: git@github.com:user/repo.git
        // To:   git@github.com-work:user/repo.git
        const sshUrlPattern = /^git@([^:]+):(.+)$/;
        const match = currentUrl.match(sshUrlPattern);

        if (match) {
            const newUrl = `git@${account.sshHost}:${match[2]}`;
            await this.setRemoteUrl(newUrl, cwd);
        }
    }

    /**
     * Get SSH config file path
     */
    getSSHConfigPath(): string {
        return path.join(os.homedir(), '.ssh', 'config');
    }

    /**
     * Check if SSH host is configured in ~/.ssh/config
     */
    async isSSHHostConfigured(hostAlias: string): Promise<boolean> {
        const configPath = this.getSSHConfigPath();

        try {
            const content = fs.readFileSync(configPath, 'utf-8');
            return content.includes(`Host ${hostAlias}`);
        } catch {
            return false;
        }
    }

    /**
     * Generate SSH config entry for an account
     */
    generateSSHConfigEntry(account: GitAccount): string {
        if (account.authType !== 'ssh' || !account.sshHost || !account.sshKeyPath) {
            return '';
        }

        return `
# Git Account Manager - ${account.name}
Host ${account.sshHost}
    HostName github.com
    User git
    IdentityFile ${account.sshKeyPath}
    IdentitiesOnly yes
`;
    }

    /**
     * Add SSH config entry for an account
     */
    async addSSHConfigEntry(account: GitAccount): Promise<void> {
        if (account.authType !== 'ssh' || !account.sshHost) {
            return;
        }

        const configPath = this.getSSHConfigPath();
        const entry = this.generateSSHConfigEntry(account);

        if (!entry) {
            return;
        }

        // Check if already configured
        if (await this.isSSHHostConfigured(account.sshHost)) {
            return;
        }

        // Ensure .ssh directory exists
        const sshDir = path.dirname(configPath);
        if (!fs.existsSync(sshDir)) {
            fs.mkdirSync(sshDir, { mode: 0o700 });
        }

        // Append to SSH config
        fs.appendFileSync(configPath, entry);
    }
}
