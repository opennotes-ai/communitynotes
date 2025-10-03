export const testServers = {
  testGuild: {
    discordId: process.env.DISCORD_TEST_GUILD_ID || '987654321098765432',
    name: 'Test Server',
    ownerId: process.env.DISCORD_TEST_USER_ID || '123456789012345678',
  },

  secondaryGuild: {
    discordId: '876543210987654321',
    name: 'Secondary Test Server',
    ownerId: '234567890123456789',
  },
};

export function createServerData(overrides?: Partial<typeof testServers.testGuild>) {
  return {
    ...testServers.testGuild,
    ...overrides,
  };
}
