export async function waitFor<T>(
  fn: () => T | Promise<T>,
  options: {
    timeout?: number;
    interval?: number;
    errorMessage?: string;
  } = {}
): Promise<T> {
  const { timeout = 10000, interval = 100, errorMessage = 'Timeout waiting for condition' } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await fn();
      if (result) {
        return result;
      }
    } catch (error) {
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(errorMessage);
}

export async function waitForDatabaseRecord<T>(
  queryFn: () => Promise<T | null>,
  options?: {
    timeout?: number;
    interval?: number;
    errorMessage?: string;
  }
): Promise<T> {
  return waitFor(
    async () => {
      const record = await queryFn();
      if (record !== null) {
        return record;
      }
      return null as any;
    },
    {
      ...options,
      errorMessage: options?.errorMessage ?? 'Database record not found within timeout',
    }
  );
}

export async function waitForBotMessage(
  checkFn: () => Promise<boolean>,
  options?: {
    timeout?: number;
    interval?: number;
    errorMessage?: string;
  }
): Promise<void> {
  await waitFor(
    async () => {
      const found = await checkFn();
      return found ? true : null as any;
    },
    {
      ...options,
      errorMessage: options?.errorMessage ?? 'Bot message not received within timeout',
    }
  );
}
