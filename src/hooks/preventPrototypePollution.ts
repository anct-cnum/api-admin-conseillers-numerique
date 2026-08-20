import * as Sentry from '@sentry/node';
import { BadRequest } from '@feathersjs/errors';
import { HookContext } from '@feathersjs/feathers';

const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];
const MAX_DEPTH = 20;

const containsDangerousKey = (value: unknown, depth = 0): boolean => {
  if (depth > MAX_DEPTH) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsDangerousKey(item, depth + 1));
  }
  if (value !== null && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).some((key) => {
      if (key.split('.').some((segment) => DANGEROUS_KEYS.includes(segment))) {
        return true;
      }
      return containsDangerousKey(
        (value as Record<string, unknown>)[key],
        depth + 1,
      );
    });
  }
  return false;
};

export default () => (context: HookContext) => {
  if (containsDangerousKey(context.data)) {
    Sentry.captureException(
      new Error(
        `Tentative de pollution de prototype bloquée sur ${context.path}.${context.method}`,
      ),
    );
    throw new BadRequest('Requête invalide');
  }
  return context;
};
