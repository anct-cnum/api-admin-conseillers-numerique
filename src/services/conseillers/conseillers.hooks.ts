import * as feathersAuthentication from '@feathersjs/authentication';

const { authenticate } = feathersAuthentication.hooks;
const search = require('feathers-mongodb-fuzzy-search');

export default {
  before: {
    all: [authenticate('jwt')],
    find: [search()],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
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
