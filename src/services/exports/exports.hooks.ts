import * as feathersAuthentication from '@feathersjs/authentication';
import disallowExternal from '../../hooks/disallowExternal';

const { authenticate } = feathersAuthentication.hooks;

export default {
  before: {
    all: [authenticate('jwt')],
    find: [disallowExternal()],
    get: [disallowExternal()],
    create: [disallowExternal()],
    update: [disallowExternal()],
    patch: [disallowExternal()],
    remove: [disallowExternal()],
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
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
