export const testUsers = {
  regularUser: {
    discordId: process.env.DISCORD_TEST_USER_ID || '123456789012345678',
    username: 'testuser',
    discriminator: '0001',
    email: 'testuser@example.com',
    phoneNumber: '+15555551234',
  },

  verifiedUser: {
    discordId: '234567890123456789',
    username: 'verifieduser',
    discriminator: '0002',
    email: 'verified@example.com',
    phoneNumber: '+15555555678',
    verified: true,
  },

  unverifiedUser: {
    discordId: '345678901234567890',
    username: 'unverifieduser',
    discriminator: '0003',
    email: 'unverified@example.com',
    verified: false,
  },

  adminUser: {
    discordId: '456789012345678901',
    username: 'adminuser',
    discriminator: '0004',
    email: 'admin@example.com',
    verified: true,
  },
};

export function createUserData(overrides?: Partial<typeof testUsers.regularUser>) {
  return {
    ...testUsers.regularUser,
    ...overrides,
  };
}

export function createVerifiedUserData(overrides?: Partial<typeof testUsers.verifiedUser>) {
  return {
    ...testUsers.verifiedUser,
    ...overrides,
  };
}
