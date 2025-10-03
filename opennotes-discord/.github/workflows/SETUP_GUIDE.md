# Integration Tests Setup Guide

Quick reference for setting up GitHub Actions integration tests.

## Prerequisites

- Admin access to GitHub repository
- Discord Developer account
- Test Discord server (guild)

## Quick Setup Checklist

- [ ] Create Discord test bot application
- [ ] Create test Discord server
- [ ] Invite bot to test server
- [ ] Configure GitHub secrets (8 required)
- [ ] Create `run-integration-tests` label
- [ ] Test workflow manually
- [ ] Verify scheduled runs are enabled

## Step-by-Step Setup

### 1. Create Discord Test Bot (5 minutes)

**Discord Developer Portal:**
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "OpenNotes Test Bot" (or similar)
4. Click "Create"

**Get Bot Token:**
1. Click "Bot" in left sidebar
2. Click "Reset Token"
3. Copy the token → Save as `TEST_DISCORD_TOKEN`
4. Under "Privileged Gateway Intents" enable:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent
5. Click "Save Changes"

**Get OAuth2 Credentials:**
1. Click "OAuth2" in left sidebar
2. Copy "CLIENT ID" → Save as `TEST_DISCORD_CLIENT_ID`
3. Click "Reset Secret"
4. Copy the secret → Save as `TEST_DISCORD_CLIENT_SECRET`

### 2. Create Test Discord Server (2 minutes)

1. In Discord, click "+" to add a server
2. Click "Create My Own"
3. Choose "For me and my friends"
4. Name it "OpenNotes Test Server"
5. Click "Create"

**Enable Developer Mode:**
1. Click your profile icon (bottom left)
2. User Settings → Advanced
3. Enable "Developer Mode"
4. Close settings

**Get Server and Channel IDs:**
1. Right-click on server icon → Copy Server ID → Save as `TEST_GUILD_ID`
2. Right-click on #general channel → Copy Channel ID → Save as `TEST_CHANNEL_ID`
3. Right-click on your username → Copy User ID → Save as `TEST_USER_ID`

### 3. Invite Bot to Test Server (1 minute)

1. Back in Developer Portal → OAuth2 → URL Generator
2. Select scopes:
   - `bot`
   - `applications.commands`
3. Select bot permissions:
   - Send Messages
   - Send Messages in Threads
   - Read Message History
   - Add Reactions
   - Use Slash Commands
   - Manage Messages (for testing moderation)
4. Copy the generated URL at the bottom
5. Paste URL in browser
6. Select your test server
7. Click "Authorize"

### 4. Generate Secrets (1 minute)

Open terminal and run:

```bash
node -e "console.log('JWT_SECRET:', require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY:', require('crypto').randomBytes(16).toString('hex'))"
```

Copy the outputs for `JWT_SECRET` and `ENCRYPTION_KEY`.

### 5. Configure GitHub Secrets (3 minutes)

**Navigate to repository:**
1. Go to your GitHub repository
2. Click "Settings" tab
3. Click "Secrets and variables" → "Actions"
4. Click "New repository secret"

**Add each secret:**

| Name | Value Source | Required |
|------|--------------|----------|
| `TEST_DISCORD_TOKEN` | From step 1 (Bot Token) | Yes |
| `TEST_DISCORD_CLIENT_ID` | From step 1 (OAuth2 Client ID) | Yes |
| `TEST_DISCORD_CLIENT_SECRET` | From step 1 (OAuth2 Secret) | Yes |
| `TEST_GUILD_ID` | From step 2 (Server ID) | Yes |
| `TEST_CHANNEL_ID` | From step 2 (Channel ID) | Yes |
| `TEST_USER_ID` | From step 2 (Your User ID) | Yes |
| `JWT_SECRET` | From step 4 (JWT Secret) | Yes |
| `ENCRYPTION_KEY` | From step 4 (Encryption Key) | Yes |

For each secret:
1. Click "New repository secret"
2. Enter "Name" (exactly as shown above)
3. Paste "Secret" value
4. Click "Add secret"
5. Repeat for all 8 secrets

### 6. Create PR Label (1 minute)

**Via GitHub UI:**
1. Go to "Issues" tab
2. Click "Labels"
3. Click "New label"
4. Name: `run-integration-tests`
5. Description: `Trigger integration tests on this PR`
6. Color: `#0e8a16` (green)
7. Click "Create label"

**Via GitHub CLI (alternative):**
```bash
gh label create run-integration-tests \
  --description "Trigger integration tests on this PR" \
  --color 0e8a16
```

### 7. Test the Workflow (2 minutes)

1. Go to "Actions" tab
2. Click "Integration Tests" workflow
3. Click "Run workflow" button
4. Leave defaults
5. Click "Run workflow"
6. Wait ~5 minutes
7. Verify it completes successfully

If it fails, check:
- All 8 secrets are set correctly
- Bot is in the test server
- Bot has proper permissions
- Discord token hasn't expired

## Verification Script

Run this locally to verify your credentials work:

```bash
cd /path/to/opennotes-discord

cp .env.test.example .env.test

npm run test:integration
```

If local tests pass, CI should pass too!

## Security Notes

- Never commit Discord tokens or secrets to git
- Use separate test bot from production
- Rotate secrets quarterly
- Limit test server access to developers only
- Don't use production Discord server for testing

## Troubleshooting

### "Discord token is invalid"

**Solution:**
1. Go to Discord Developer Portal
2. Your bot application → Bot tab
3. Click "Reset Token"
4. Update `TEST_DISCORD_TOKEN` secret in GitHub

### "Missing guild permissions"

**Solution:**
1. Re-invite bot with correct permissions (see step 3)
2. Or manually add permissions in Discord:
   - Server Settings → Roles
   - Find bot role
   - Enable required permissions

### "Database connection failed"

**Solution:**
This shouldn't happen in CI (services are auto-configured).
If it does, check:
1. Workflow services configuration
2. `DATABASE_URL` format in workflow file

### "NATS connection timeout"

**Solution:**
1. Check NATS service health in workflow logs
2. Verify port 4222 is exposed
3. Try re-running the workflow

### Workflow doesn't trigger on PR

**Solution:**
1. Verify label `run-integration-tests` exists
2. Check label is added to PR
3. Verify PR is against `main` or `develop` branch

## Next Steps

After setup:

1. **Monitor scheduled runs:**
   ```bash
   gh run list --workflow=integration-tests.yml
   ```

2. **Set up notifications** (optional):
   - GitHub → Settings → Notifications
   - Enable "Actions" notifications

3. **Document any test-specific configuration** in your test server

4. **Add test data** if needed for more comprehensive tests

## Maintenance

**Quarterly:**
- [ ] Rotate `TEST_DISCORD_TOKEN` (regenerate in Discord portal)
- [ ] Rotate `JWT_SECRET` and `ENCRYPTION_KEY`
- [ ] Review test server permissions
- [ ] Clean up old test data

**Monthly:**
- [ ] Review failed scheduled runs
- [ ] Update test cases if Discord API changes
- [ ] Verify bot permissions haven't changed

## Resources

- [Full README](.github/workflows/README.md) - Detailed documentation
- [Discord Developer Portal](https://discord.com/developers/applications)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Discord.js Guide](https://discordjs.guide/)

## Support

If you encounter issues:

1. Check workflow logs in GitHub Actions
2. Review error messages in PR comments
3. Verify secrets are set correctly
4. Test locally with `.env.test` file
5. Check Discord API status: https://discordstatus.com/

## Estimated Setup Time

- **First time:** ~15 minutes
- **With experience:** ~5 minutes
- **Just updating secrets:** ~2 minutes
