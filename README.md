# Git Account Manager

A VS Code extension to manage multiple GitHub accounts and switch between them based on repository context.

## Features

- 🔐 **Secure Storage**: Credentials stored securely using VS Code's SecretStorage API
- 🔑 **Dual Auth Support**: Support for both SSH keys and Personal Access Tokens
- 🔄 **Easy Switching**: Switch accounts with a single click from the status bar
- 🎯 **Auto-Detection**: Automatically detect which account to use based on repository configuration
- 📁 **Repo Mapping**: Configure default accounts per repository

## Usage

### Adding an Account

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Run `Git Manager: Add Account`
3. Follow the prompts to enter:
   - Display name (e.g., "Work", "Personal")
   - GitHub username
   - Git commit email
   - Authentication type (SSH or PAT)
   - SSH key path or Personal Access Token

### Switching Accounts

Click on the account name in the status bar (bottom left) to switch accounts for the current repository.

Or use Command Palette: `Git Manager: Switch Account`

### Configuring Repository

1. Run `Git Manager: Configure Repository Account`
2. Select the default account
3. Choose to save in VS Code settings or as a `.gitaccount` file

## Commands

| Command | Description |
|---------|-------------|
| `Git Manager: Add Account` | Add a new GitHub account |
| `Git Manager: Remove Account` | Remove an existing account |
| `Git Manager: Switch Account` | Switch account for current repo |
| `Git Manager: Configure Repository Account` | Set default account for repo |
| `Git Manager: List Accounts` | View all configured accounts |

## SSH Configuration

When using SSH authentication, the extension will:
1. Create a host alias in `~/.ssh/config`
2. Update the remote URL to use the custom host alias

Example SSH config entry:
```
Host github.com-work
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_rsa_work
    IdentitiesOnly yes
```

## .gitaccount File

You can create a `.gitaccount` file in your repository root to specify which account to use:

```json
{
  "accountId": "account_123456",
  "accountName": "Work"
}
```

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch
```

## License

MIT
