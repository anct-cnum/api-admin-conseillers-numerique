import * as feathersAuthentication from '@feathersjs/authentication';
import * as local from '@feathersjs/authentication-local';
import disallowExternal from '../../hooks/disallowExternal';
// Don't remove this comment. It's needed to format import lines nicely.

const { authenticate } = feathersAuthentication.hooks;
const { hashPassword, protect } = local.hooks;

export default {
  before: {
    all: [],
    find: [authenticate('jwt'), disallowExternal()],
    get: [authenticate('jwt')],
    create: [hashPassword('password'), disallowExternal()],
    update: [hashPassword('password'), authenticate('jwt'), disallowExternal()],
    patch: [hashPassword('password'), authenticate('jwt'), disallowExternal()],
    remove: [authenticate('jwt'), disallowExternal()],
  },

  after: {
    all: [
      // Make sure the password field is never sent to the client
      // Always must be the last hook
      protect('password'),
    ],
    // token is needed right after create() to build invitation email links,
    // so refreshToken/token are only stripped on read/write methods that don't need them
    find: [protect('refreshToken'), protect('token')],
    get: [protect('refreshToken'), protect('token')],
    create: [],
    update: [protect('refreshToken'), protect('token')],
    patch: [protect('refreshToken'), protect('token')],
    remove: [protect('refreshToken'), protect('token')],
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },
};
