import preventPrototypePollution from './hooks/preventPrototypePollution';

export default {
  before: {
    all: [],
    find: [],
    get: [],
    create: [preventPrototypePollution()],
    update: [preventPrototypePollution()],
    patch: [preventPrototypePollution()],
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
