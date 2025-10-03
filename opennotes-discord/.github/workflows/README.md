# GitHub Actions Workflows

This directory contains CI/CD workflows for the opennotes-discord bot.

## Workflows

### 1. Test Suite (`test.yml`)

Runs on every push and pull request to `main` and `develop` branches.

**What it does:**
- Runs unit tests with coverage
- Performs linting
- Builds the application
- Security audit
- Docker image build (on main branch only)
- Performance tests

**Node versions tested:** 18.x, 20.x

### 2. Integration Tests (`integration-tests.yml`)

Runs integration tests with real Discord API, PostgreSQL, Redis, and NATS services.

**Triggers:**
- Manual trigger via workflow_dispatch
- Scheduled (nightly at 2 AM UTC)
- Pull requests with label `run-integration-tests`

**Node version:** 18.x (default), 20.x (optional via manual trigger)

## Setting Up GitHub Secrets

Integration tests require the following secrets to be configured in your GitHub repository settings.

### Required Secrets

Navigate to: **Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `TEST_DISCORD_TOKEN` | Discord bot token for testing | `MTIzNDU2Nzg5MDEyMzQ1Njc4.GAbCdE.fGhIjKlMnOpQrStUvWxYz` |
| `TEST_DISCORD_CLIENT_ID` | Discord application client ID | `1234567890123456789` |
| `TEST_DISCORD_CLIENT_SECRET` | Discord application client secret | `abcdefghijklmnopqrstuvwxyz123456` |
| `TEST_GUILD_ID` | Test Discord server (guild) ID | `9876543210987654321` |
| `TEST_CHANNEL_ID` | Test Discord channel ID | `1111222233334444555` |
| `TEST_USER_ID` | Test Discord user ID | `6666777788889999000` |
| `JWT_SECRET` | JWT secret for authentication | `your-jwt-secret-at-least-32-characters-long-for-security` |
| `ENCRYPTION_KEY` | Encryption key (32 characters) | `32-character-encryption-key!!` |

### How to Get Discord Credentials

1. **Create a test bot:**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application"
   - Give it a test name like "OpenNotes Test Bot"
   - Go to "Bot" section
   - Click "Reset Token" to get `TEST_DISCORD_TOKEN`
   - Copy the token immediately (it won't show again)

2. **Get Client ID and Secret:**
   - In the same application, go to "OAuth2"
   - Copy "CLIENT ID" → use as `TEST_DISCORD_CLIENT_ID`
   - Click "Reset Secret" → use as `TEST_DISCORD_CLIENT_SECRET`

3. **Create a test server:**
   - In Discord, create a new server for testing
   - Enable Developer Mode: User Settings → Advanced → Developer Mode
   - Right-click on the server icon → Copy Server ID → use as `TEST_GUILD_ID`

4. **Get Channel and User IDs:**
   - Right-click on a test channel → Copy Channel ID → use as `TEST_CHANNEL_ID`
   - Right-click on your username → Copy User ID → use as `TEST_USER_ID`

5. **Invite the bot to your test server:**
   - Go back to Developer Portal → OAuth2 → URL Generator
   - Select scopes: `bot`, `applications.commands`
   - Select bot permissions: `Send Messages`, `Read Messages`, etc.
   - Copy the generated URL and open it in your browser
   - Select your test server and authorize

### Generate Secrets for JWT and Encryption

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64').slice(0, 32))"
```

Use the first output for `JWT_SECRET` and the second for `ENCRYPTION_KEY`.

## Running Integration Tests Manually

### Via GitHub UI

1. Go to the **Actions** tab in your repository
2. Click on **Integration Tests** workflow
3. Click **Run workflow** button
4. (Optional) Select Node.js version from dropdown
5. Click **Run workflow** to start

### Via GitHub CLI

```bash
gh workflow run integration-tests.yml

gh workflow run integration-tests.yml -f node_version=20.x
```

### View Results

```bash
gh run list --workflow=integration-tests.yml

gh run view <run-id>

gh run view <run-id> --log
```

## Using the PR Label

To run integration tests on a specific pull request:

1. **Add the label:**
   - Go to your pull request
   - Click "Labels" on the right sidebar
   - Create a new label called `run-integration-tests` (if it doesn't exist)
   - Add it to your PR

2. **The workflow will automatically trigger** when:
   - The label is added
   - New commits are pushed (while label is present)
   - PR is reopened (while label is present)

3. **Remove the label** when you no longer need integration tests to run on every commit

### Create the Label

Via GitHub UI:
- Go to **Issues → Labels → New label**
- Name: `run-integration-tests`
- Description: `Trigger integration tests on this PR`
- Color: `#0e8a16` (green)

Via GitHub CLI:
```bash
gh label create run-integration-tests \
  --description "Trigger integration tests on this PR" \
  --color 0e8a16
```

## Viewing Test Results

### In GitHub Actions UI

1. Go to **Actions** tab
2. Click on the workflow run
3. Click on the **integration-tests** job
4. Expand step **Run integration tests** to see output
5. Download artifacts:
   - Click **Summary** at the top
   - Scroll to **Artifacts** section
   - Download `integration-test-results` or `integration-coverage-report`

### In Pull Request

If integration tests fail on a PR, the workflow will automatically post a comment with:
- Link to the failed workflow run
- Node version used
- Commit SHA

### Artifacts

Test results and coverage reports are stored as artifacts for 30 days:

- `integration-test-results` - Contains coverage, logs, and reports
- `integration-coverage-report` - Contains detailed coverage HTML reports

Download and extract to view locally:

```bash
unzip integration-coverage-report.zip
open coverage/lcov-report/index.html
```

## Scheduled Runs

Integration tests run automatically every night at 2 AM UTC.

**Why?**
- Catch issues from external dependencies
- Verify Discord API compatibility
- Ensure database migrations work
- Detect flaky tests

**View scheduled runs:**
```bash
gh run list --workflow=integration-tests.yml --event=schedule
```

## Troubleshooting

### Tests fail with "Discord token invalid"

- Verify `TEST_DISCORD_TOKEN` secret is set correctly
- Check if the token has expired (regenerate if needed)
- Ensure the bot has been invited to the test server

### Tests fail with "Guild not found"

- Verify `TEST_GUILD_ID` matches your test server
- Ensure the bot has joined the test server
- Check bot permissions in the server

### Tests timeout

- Check if services (PostgreSQL, Redis, NATS) started properly
- Look at "Wait for services to be ready" step
- Increase timeout in workflow if needed (currently 30 minutes)

### Database migration fails

- Verify PostgreSQL is running in CI
- Check Prisma schema syntax
- Review database migration logs in workflow output

### Services not connecting

Services use these ports:
- PostgreSQL: 5432
- Redis: 6379
- NATS: 4222

If tests can't connect, check:
1. Service health checks in workflow
2. Environment variables (`DATABASE_URL`, `REDIS_URL`, `NATS_URL`)
3. Firewall rules (shouldn't be an issue in GitHub Actions)

## Best Practices

1. **Keep test Discord credentials separate** from production
2. **Use a dedicated test server** - don't test on production servers
3. **Rotate secrets regularly** - regenerate tokens quarterly
4. **Monitor scheduled run failures** - set up notifications
5. **Clean up test data** - integration tests should clean up after themselves
6. **Run locally first** - test integration tests locally before pushing

## Local Integration Testing

Before relying on CI, test locally:

```bash
cp .env.test.example .env.test

docker-compose up -d postgres redis nats

npm run test:integration
```

Update `.env.test` with your test Discord credentials.

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Jest Integration Testing](https://jestjs.io/docs/testing-frameworks)
