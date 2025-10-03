import { PrismaClient } from '@prisma/client';

export class DatabaseHelpers {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async connect(): Promise<void> {
    await this.prisma.$connect();
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async cleanDatabase(): Promise<void> {
    const tablenames = await this.prisma.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter(name => name !== '_prisma_migrations')
      .map(name => `"public"."${name}"`)
      .join(', ');

    if (tables.length > 0) {
      await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    }
  }

  async createTestUser(data: {
    discordId: string;
    username: string;
    discriminator: string;
    email?: string;
    phoneNumber?: string;
    verified?: boolean;
  }) {
    return await this.prisma.user.create({
      data: {
        discordId: data.discordId,
        username: data.username,
        discriminator: data.discriminator,
        email: data.email,
        phoneNumber: data.phoneNumber,
        verified: data.verified ?? false,
      },
    });
  }

  async createTestServer(data: {
    discordId: string;
    name: string;
    ownerId: string;
  }) {
    return await this.prisma.server.create({
      data: {
        discordId: data.discordId,
        name: data.name,
        ownerId: data.ownerId,
      },
    });
  }

  async getUserByDiscordId(discordId: string) {
    return await this.prisma.user.findUnique({
      where: { discordId },
    });
  }

  async getServerByDiscordId(discordId: string) {
    return await this.prisma.server.findUnique({
      where: { discordId },
    });
  }

  async getNoteRequestsByMessageId(messageId: string) {
    return await this.prisma.noteRequest.findMany({
      where: { messageId },
    });
  }

  async getOpenNotesByMessageId(messageId: string) {
    return await this.prisma.openNote.findMany({
      where: { messageId },
    });
  }

  getPrismaClient(): PrismaClient {
    return this.prisma;
  }
}
