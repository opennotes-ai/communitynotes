import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create sample users
  const sampleUsers = [
    {
      discordId: '123456789012345678',
      username: 'TestUser1',
      discriminator: '0001',
      helpfulnessScore: 15.5,
      trustLevel: 'contributor',
    },
    {
      discordId: '234567890123456789',
      username: 'TestUser2',
      discriminator: '0002',
      helpfulnessScore: 8.2,
      trustLevel: 'newcomer',
    },
    {
      discordId: '345678901234567890',
      username: 'TrustedUser',
      discriminator: '0003',
      helpfulnessScore: 42.8,
      trustLevel: 'trusted',
      totalNotes: 25,
      totalRatings: 150,
    },
  ];

  const createdUsers = [];
  for (const userData of sampleUsers) {
    const user = await prisma.user.upsert({
      where: { discordId: userData.discordId },
      update: userData,
      create: userData,
    });
    createdUsers.push(user);
    console.log(`Created/updated user: ${user.username}`);
  }

  // Create sample server
  const sampleServer = {
    discordId: '987654321098765432',
    name: 'Test Server',
    icon: null,
    enabled: true,
    allowNoteRequests: true,
    allowNoteCreation: true,
    maxRequestsPerUser: 5,
    requireVerification: false,
    enabledChannels: ['123456789012345678', '234567890123456789'],
    disabledChannels: [],
    moderatorRoles: ['mod_role_id'],
    contributorRoles: ['contributor_role_id'],
  };

  const server = await prisma.server.upsert({
    where: { discordId: sampleServer.discordId },
    update: sampleServer,
    create: sampleServer,
  });
  console.log(`Created/updated server: ${server.name}`);

  // Add server members
  for (let i = 0; i < createdUsers.length; i++) {
    const user = createdUsers[i];
    const roles = i === 2 ? ['contributor_role_id'] : i === 0 ? ['mod_role_id'] : [];

    await prisma.serverMember.upsert({
      where: {
        userId_serverId: {
          userId: user.id,
          serverId: server.id,
        },
      },
      update: { roles },
      create: {
        userId: user.id,
        serverId: server.id,
        roles,
      },
    });
    console.log(`Added user ${user.username} to server with roles: ${roles.join(', ') || 'none'}`);
  }

  // Create sample messages
  const sampleMessages = [
    {
      discordId: '111111111111111111',
      channelId: '123456789012345678',
      serverId: server.id,
      authorId: '999999999999999999',
      content: 'This is a test message that might need fact-checking.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      discordId: '222222222222222222',
      channelId: '234567890123456789',
      serverId: server.id,
      authorId: '888888888888888888',
      content: 'Another message with potential misinformation.',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    },
  ];

  const createdMessages = [];
  for (const messageData of sampleMessages) {
    const message = await prisma.message.upsert({
      where: { discordId: messageData.discordId },
      update: messageData,
      create: messageData,
    });
    createdMessages.push(message);
    console.log(`Created/updated message: ${message.discordId}`);
  }

  // Create sample note requests
  const sampleRequests = [
    {
      messageId: createdMessages[0].id,
      requestorId: createdUsers[0].id,
      reason: 'This claim seems unsupported by evidence',
      sources: ['https://example.com/source1'],
    },
    {
      messageId: createdMessages[0].id,
      requestorId: createdUsers[1].id,
      reason: 'Need fact-checking for these statistics',
      sources: [],
    },
    {
      messageId: createdMessages[0].id,
      requestorId: createdUsers[2].id,
      reason: 'Missing important context',
      sources: ['https://example.com/source2', 'https://example.com/source3'],
    },
    {
      messageId: createdMessages[1].id,
      requestorId: createdUsers[1].id,
      reason: 'Potentially misleading information',
      sources: ['https://example.com/source4'],
    },
  ];

  for (const requestData of sampleRequests) {
    const request = await prisma.noteRequest.create({
      data: requestData,
    });
    console.log(`Created note request: ${request.id}`);
  }

  // Create sample community note
  const sampleNote = {
    messageId: createdMessages[0].id,
    authorId: createdUsers[2].id,
    content: 'This claim lacks supporting evidence. Multiple studies show different results. See sources for peer-reviewed research.',
    classification: 'unsubstantiated',
    sources: [
      'https://example.com/study1',
      'https://example.com/study2',
      'https://example.com/analysis',
    ],
    status: 'pending',
  };

  const note = await prisma.communityNote.create({
    data: sampleNote,
  });
  console.log(`Created community note: ${note.id}`);

  // Create sample ratings for the note
  const sampleRatings = [
    {
      noteId: note.id,
      raterId: createdUsers[0].id,
      helpful: true,
      reason: 'Well-sourced and factual',
      weight: 1.2,
    },
    {
      noteId: note.id,
      raterId: createdUsers[1].id,
      helpful: true,
      reason: 'Helpful context',
      weight: 0.8,
    },
  ];

  for (const ratingData of sampleRatings) {
    const rating = await prisma.noteRating.create({
      data: ratingData,
    });
    console.log(`Created note rating: ${rating.id}`);
  }

  // Update message request stats
  await prisma.message.update({
    where: { id: createdMessages[0].id },
    data: {
      totalRequests: 3,
      uniqueRequestors: 3,
      hasActiveNote: true,
    },
  });

  await prisma.message.update({
    where: { id: createdMessages[1].id },
    data: {
      totalRequests: 1,
      uniqueRequestors: 1,
      hasActiveNote: false,
    },
  });

  // Create request aggregations
  await prisma.requestAggregation.create({
    data: {
      messageId: createdMessages[0].id,
      totalRequests: 3,
      uniqueRequestors: 3,
      firstRequestAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      lastRequestAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      thresholdMet: false, // Assuming threshold is 4
      contributorsNotified: false,
    },
  });

  await prisma.requestAggregation.create({
    data: {
      messageId: createdMessages[1].id,
      totalRequests: 1,
      uniqueRequestors: 1,
      firstRequestAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      lastRequestAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      thresholdMet: false,
      contributorsNotified: false,
    },
  });

  // Update note rating stats
  await prisma.communityNote.update({
    where: { id: note.id },
    data: {
      helpfulCount: 2,
      notHelpfulCount: 0,
      totalRatings: 2,
      helpfulnessRatio: 1.0,
    },
  });

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });