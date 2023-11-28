/* eslint-disable @typescript-eslint/default-param-last */
/* eslint-disable class-methods-use-this */
/* eslint-disable import/prefer-default-export */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Id,
  NullableId,
  Paginated,
  Params,
  ServiceMethods,
} from '@feathersjs/feathers';
import authenticateMode from '../../middleware/authenticateMode';
import { Application } from '../../declarations';
import createAbilities from '../../middleware/createAbilities';
import {
  getStatsNationales,
  getDatasStructures,
  getStatsStructure,
  getStatsTerritoires,
  getStatsTerritoire,
  getStatsConseiller,
  getStatsTerritoireCra,
  getStatsNationalesGrandReseau,
  getStatsConseillerParcoursRecrutement,
} from './controllers';

interface Data {}

interface ServiceOptions {}
export class Stats implements ServiceMethods<Data> {
  app: Application;

  options: ServiceOptions;

  constructor(app: Application, options: ServiceOptions = {}) {
    this.options = options;
    this.app = app;
    this.options = options;

    app.get(
      '/stats/nationales/cras',
      authenticateMode(app),
      createAbilities(app),
      getStatsNationales(app),
    );
    app.get(
      '/stats/nationales/cras/grand-reseau',
      authenticateMode(app),
      createAbilities(app),
      getStatsNationalesGrandReseau(app),
    );
    app.get(
      '/stats/structure/cras',
      authenticateMode(app),
      createAbilities(app),
      getStatsStructure(app),
    );
    app.get(
      '/stats/conseiller/cras',
      authenticateMode(app),
      createAbilities(app),
      getStatsConseiller(app),
    );
    app.get(
      '/stats/recrutement/conseiller/cras',
      authenticateMode(app),
      createAbilities(app),
      getStatsConseillerParcoursRecrutement(app),
    );
    app.get(
      '/stats/datas/structures',
      authenticateMode(app),
      createAbilities(app),
      getDatasStructures(app, options),
    );
    app.get(
      '/stats/territoires',
      authenticateMode(app),
      createAbilities(app),
      getStatsTerritoires(app, options),
    );
    app.get(
      '/stats/territoire',
      authenticateMode(app),
      createAbilities(app),
      getStatsTerritoire(app),
    );
    app.get(
      '/stats/territoire/cra',
      authenticateMode(app),
      createAbilities(app),
      getStatsTerritoireCra(app),
    );
  }

  // fonctions par default créées par feathers à la génération d'un service custom (non relié à une collection) ne pas prendre en compte
  async find(_params?: Params): Promise<Data[] | Paginated<Data>> {
    return [];
  }

  async get(id: Id, _params?: Params): Promise<Data> {
    return {
      id,
      text: `A new message with ID: ${id}!`,
    };
  }

  async create(data: Data, params?: Params): Promise<Data> {
    if (Array.isArray(data)) {
      return Promise.all(data.map((current) => this.create(current, params)));
    }

    return data;
  }

  async update(_id: NullableId, data: Data, _params?: Params): Promise<Data> {
    return data;
  }

  async patch(_id: NullableId, data: Data, _params?: Params): Promise<Data> {
    return data;
  }

  async remove(_id: NullableId, data: Data, _params?: Params): Promise<Data> {
    return data;
  }
}
