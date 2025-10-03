import { Message } from 'discord.js';

export function assertMessageContent(message: Message, expectedContent: string | RegExp): void {
  if (typeof expectedContent === 'string') {
    if (!message.content.includes(expectedContent)) {
      throw new Error(
        `Expected message to contain "${expectedContent}" but got "${message.content}"`
      );
    }
  } else {
    if (!expectedContent.test(message.content)) {
      throw new Error(
        `Expected message to match ${expectedContent} but got "${message.content}"`
      );
    }
  }
}

export function assertMessageEmbeds(message: Message, expectedCount: number): void {
  if (message.embeds.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} embeds but got ${message.embeds.length}`
    );
  }
}

export function assertEmbedTitle(message: Message, embedIndex: number, expectedTitle: string | RegExp): void {
  const embed = message.embeds[embedIndex];
  if (!embed) {
    throw new Error(`No embed found at index ${embedIndex}`);
  }

  const title = embed.title ?? '';
  if (typeof expectedTitle === 'string') {
    if (title !== expectedTitle) {
      throw new Error(`Expected embed title to be "${expectedTitle}" but got "${title}"`);
    }
  } else {
    if (!expectedTitle.test(title)) {
      throw new Error(`Expected embed title to match ${expectedTitle} but got "${title}"`);
    }
  }
}

export function assertEmbedDescription(message: Message, embedIndex: number, expectedDescription: string | RegExp): void {
  const embed = message.embeds[embedIndex];
  if (!embed) {
    throw new Error(`No embed found at index ${embedIndex}`);
  }

  const description = embed.description ?? '';
  if (typeof expectedDescription === 'string') {
    if (!description.includes(expectedDescription)) {
      throw new Error(
        `Expected embed description to contain "${expectedDescription}" but got "${description}"`
      );
    }
  } else {
    if (!expectedDescription.test(description)) {
      throw new Error(
        `Expected embed description to match ${expectedDescription} but got "${description}"`
      );
    }
  }
}

export function assertDatabaseRecord<T>(record: T | null, fieldName: string): asserts record is T {
  if (record === null) {
    throw new Error(`Expected ${fieldName} to exist in database but it was not found`);
  }
}

export function assertRecordField<T, K extends keyof T>(
  record: T,
  field: K,
  expectedValue: T[K]
): void {
  if (record[field] !== expectedValue) {
    throw new Error(
      `Expected ${String(field)} to be ${expectedValue} but got ${record[field]}`
    );
  }
}
