import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'] as const;
const NODE_ENV_VALUES = ['development', 'test', 'production'] as const;

const readPackageVersion = (): string => {
  try {
    const currentDirectory = dirname(fileURLToPath(import.meta.url));
    const packageJsonPath = resolve(currentDirectory, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: unknown };

    return typeof packageJson.version === 'string' && packageJson.version.length > 0
      ? packageJson.version
      : '0.0.0';
  } catch {
    return '0.0.0';
  }
};

const envSchema = z.object({
  NODE_ENV: z.enum(NODE_ENV_VALUES).default('development'),
  HOST: z.string().trim().min(1).default('0.0.0.0'),
  PORT: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      return Number(value);
    }

    return value;
  }, z.number().int().min(1).max(65_535).default(3996)),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  SERVICE_NAME: z.string().trim().min(1).default('thebes-platform'),
  SERVICE_VERSION: z.string().trim().min(1).default(readPackageVersion()),
});

export type AppConfig = z.output<typeof envSchema>;
export type AppEnvironment = z.input<typeof envSchema>;

const formatConfigurationError = (error: z.ZodError): string =>
  error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'environment';
      return `${path}: ${issue.message}`;
    })
    .join('; ');

export const loadConfig = (environment: AppEnvironment = process.env): AppConfig => {
  const result = envSchema.safeParse(environment);

  if (!result.success) {
    throw new Error(`Invalid environment configuration: ${formatConfigurationError(result.error)}`);
  }

  return result.data;
};
