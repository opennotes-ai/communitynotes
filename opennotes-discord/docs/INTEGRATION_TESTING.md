# Integration Testing Guide

This document provides comprehensive guidance on running integration tests for the opennotes-discord bot.

## Overview

Integration tests verify that the Discord bot works correctly with real Discord servers, databases, Redis, and NATS. Unlike unit tests that mock dependencies, integration tests use actual connections to external services to ensure end-to-end functionality.

## Test Structure

```
src/__integration__/
├── helpers/          # Test utility classes and functions
│   ├── DatabaseHelpers.ts      # Database operations for tests
│   ├── TestDiscordBot.ts       # Bot lifecycle management
│   ├── waitFor.ts              # Async waiting utilities
│   └── assertions.ts           # Custom assertion functions
├── fixtures/         # Test data fixtures
│   ├── users.ts               # User test data
│   └── servers.ts             # Server test data
├── flows/           # End-to-end workflow tests
└── smoke/           # Basic connectivity and sanity tests
    ├── bot-startup.integration.test.ts
    └── commands.integration.test.ts
```

## Prerequisites

### 1. Discord Bot Setup

You need a Discord bot configured specifically for testing:

1. Create a new Discord application at https://discord.com/developers/applications
2. Navigate to the "Bot" section and create a bot
3. Copy the bot token
4. Under "OAuth2" > "URL Generator":
   - Select scopes: `bot`, `applications.commands`
   - Select bot permissions: `Send Messages`, `Read Message History`, `Use Slash Commands`, `Manage Messages`
5. Use the generated URL to invite the bot to your test server

### 2. Test Discord Server

Create a dedicated Discord server for testing:

1. Create a new Discord server (this will be your test environment)
2. Invite your test bot to this server using the OAuth2 URL
3. Copy the Server ID (enable Developer Mode in Discord settings, then right-click the server)
4. Copy your User ID (right-click your username and select "Copy ID")

### 3. Infrastructure Services

Ensure the following services are running locally:

- **PostgreSQL**: Database for storing bot data
- **Redis**: Caching and session storage
- **NATS**: Message streaming

You can use Docker Compose to start these services:

```bash
docker-compose up -d postgres redis nats
```

## Environment Configuration

### 1. Create `.env.test` File

Copy the example file and fill in your credentials:

```bash
cp .env.test.example .env.test
```

### 2. Configure Required Variables

Edit `.env.test` with your test credentials:

```env
# Database - Use a separate test database
DATABASE_URL=postgresql://testuser:testpass@localhost:5432/opennotes_discord_test

# Redis - Use a different DB number for testing
REDIS_URL=redis://localhost:6379/1

# NATS
NATS_URL=nats://localhost:4222

# Discord Bot Credentials (from your test bot)
DISCORD_TOKEN=your_actual_test_bot_token
DISCORD_CLIENT_ID=your_actual_client_id
DISCORD_CLIENT_SECRET=your_actual_client_secret

# Test Server and User IDs
DISCORD_TEST_GUILD_ID=your_test_server_id
DISCORD_TEST_USER_ID=your_discord_user_id

# Security (generate secure random strings)
JWT_SECRET=your_test_jwt_secret_at_least_32_characters_long
ENCRYPTION_KEY=your_test_encryption_key_32_chars

# Email (optional - can use test values if not testing email)
EMAIL_USER=test@example.com
EMAIL_PASS=test_password

# Twilio (optional - can use test values if not testing SMS)
TWILIO_ACCOUNT_SID=test_sid
TWILIO_AUTH_TOKEN=test_token
TWILIO_PHONE_NUMBER=+1234567890

# Logging
LOG_LEVEL=error

# API
API_PORT=3001
```

### 3. Create Test Database

Create a separate database for testing:

```bash
createdb opennotes_discord_test
```

Run migrations on the test database:

```bash
DATABASE_URL=postgresql://testuser:testpass@localhost:5432/opennotes_discord_test npm run db:migrate
```

## Running Integration Tests

### Run All Integration Tests

```bash
npm run test:integration
```

### Run Tests in Watch Mode

Automatically re-run tests when files change:

```bash
npm run test:integration:watch
```

### Run Tests with Verbose Output

See detailed test output including console logs:

```bash
npm run test:integration:verbose
```

### Run Specific Test File

```bash
npm run test:integration -- src/__integration__/smoke/bot-startup.integration.test.ts
```

## Test Categories

### Smoke Tests

Basic sanity checks to verify core functionality:

- **bot-startup.integration.test.ts**: Verifies bot can start, connect to all services, and shutdown gracefully
- **commands.integration.test.ts**: Verifies all slash commands and context menu commands are registered correctly

### Flow Tests

End-to-end workflow tests (to be added):

- User verification flow
- Note creation and display flow
- Notification delivery flow

## Writing Integration Tests

### Using Test Helpers

#### DatabaseHelpers

Manage database state in tests:

```typescript
import { DatabaseHelpers } from '../helpers/DatabaseHelpers.js';

const dbHelpers = new DatabaseHelpers();

await dbHelpers.connect();

await dbHelpers.cleanDatabase();

const user = await dbHelpers.createTestUser({
  discordId: '123456789',
  username: 'testuser',
  discriminator: '0001',
});

const record = await dbHelpers.getUserByDiscordId('123456789');

await dbHelpers.disconnect();
```

#### TestDiscordBot

Manage bot lifecycle in tests:

```typescript
import { TestDiscordBot } from '../helpers/TestDiscordBot.js';

const testBot = new TestDiscordBot();

await testBot.start();

const client = testBot.getClient();

const bot = testBot.getBot();

await testBot.stop();
```

#### waitFor Utilities

Wait for async conditions:

```typescript
import { waitFor, waitForDatabaseRecord } from '../helpers/waitFor.js';

await waitFor(
  () => someCondition === true,
  { timeout: 5000, interval: 100 }
);

const user = await waitForDatabaseRecord(
  () => dbHelpers.getUserByDiscordId('123456789'),
  { timeout: 10000 }
);
```

#### Custom Assertions

Assert Discord message properties:

```typescript
import {
  assertMessageContent,
  assertMessageEmbeds,
  assertEmbedTitle,
} from '../helpers/assertions.js';

assertMessageContent(message, 'Expected content');

assertMessageEmbeds(message, 1);

assertEmbedTitle(message, 0, 'Expected Title');
```

### Using Fixtures

Import pre-defined test data:

```typescript
import { testUsers, createUserData } from '../fixtures/users.js';
import { testServers, createServerData } from '../fixtures/servers.js';

const user = await dbHelpers.createTestUser(testUsers.regularUser);

const customUser = createUserData({ username: 'custom' });
const server = createServerData({ name: 'Custom Server' });
```

## Best Practices

### 1. Isolation

- Each test should be independent
- Clean database state between tests
- Don't rely on test execution order

### 2. Timeouts

- Integration tests can take longer than unit tests
- Use appropriate timeouts (default: 60 seconds)
- Increase timeout for tests that wait for external services

### 3. Cleanup

- Always clean up resources in `afterAll` or `afterEach`
- Stop the bot properly to avoid hanging connections
- Disconnect from all services

### 4. Error Handling

- Use try-catch when testing error scenarios
- Check both success and failure paths
- Verify error messages and status codes

### 5. Real Credentials

- Never commit `.env.test` with real credentials
- Use a dedicated test bot and server
- Keep test data separate from production

## Troubleshooting

### Tests Timeout

**Problem**: Tests hang or timeout

**Solutions**:
- Verify all services (PostgreSQL, Redis, NATS) are running
- Check Discord bot token is valid
- Ensure test server ID and user ID are correct
- Increase timeout in test configuration

### Database Connection Errors

**Problem**: Cannot connect to test database

**Solutions**:
- Verify PostgreSQL is running: `pg_isready`
- Check database exists: `psql -l | grep opennotes_discord_test`
- Verify DATABASE_URL in `.env.test`
- Run migrations: `npm run db:migrate`

### Discord API Errors

**Problem**: Bot fails to login or register commands

**Solutions**:
- Verify bot token is correct and not expired
- Check bot has necessary permissions
- Ensure bot is invited to test server
- Verify DISCORD_TEST_GUILD_ID is correct

### Redis Connection Errors

**Problem**: Cannot connect to Redis

**Solutions**:
- Verify Redis is running: `redis-cli ping`
- Check REDIS_URL in `.env.test`
- Ensure Redis DB number (default: 1) is available

### NATS Connection Errors

**Problem**: Cannot connect to NATS

**Solutions**:
- Verify NATS is running: `docker ps | grep nats`
- Check NATS_URL in `.env.test`
- Review NATS logs: `docker logs <nats-container>`

### Environment Variable Errors

**Problem**: Missing required environment variable

**Solutions**:
- Ensure `.env.test` exists in project root
- Verify all required variables are set
- Check variable names match `.env.test.example`

## Continuous Integration

### Running Tests in CI

Integration tests require real infrastructure. For CI environments:

1. Set up test infrastructure in CI pipeline
2. Use Docker Compose to start services
3. Set environment variables as CI secrets
4. Run tests with appropriate timeouts

Example GitHub Actions workflow:

```yaml
integration-tests:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
    - run: docker-compose up -d postgres redis nats
    - run: npm ci
    - run: npm run db:migrate
    - run: npm run test:integration
      env:
        DISCORD_TOKEN: ${{ secrets.DISCORD_TEST_TOKEN }}
        DISCORD_CLIENT_ID: ${{ secrets.DISCORD_TEST_CLIENT_ID }}
        DISCORD_TEST_GUILD_ID: ${{ secrets.DISCORD_TEST_GUILD_ID }}
```

## Next Steps

After setting up integration testing:

1. Add more flow tests for complete user journeys
2. Test error scenarios and edge cases
3. Add performance benchmarks
4. Integrate with CI/CD pipeline
5. Monitor test coverage and reliability

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Discord.js Guide](https://discordjs.guide/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
