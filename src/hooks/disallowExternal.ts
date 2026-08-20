import * as Sentry from '@sentry/node';
import { MethodNotAllowed } from '@feathersjs/errors';
import { HookContext } from '@feathersjs/feathers';

export default () => (context: HookContext) => {
  if (context.params.provider) {
    Sentry.captureException(
      new Error(`Appel externe bloqué sur ${context.path}.${context.method}`),
    );
    throw new MethodNotAllowed(
      `La méthode ${context.method} n'est pas disponible via l'API`,
    );
  }
  return context;
};
