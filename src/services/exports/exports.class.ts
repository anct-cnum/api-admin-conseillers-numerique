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
  getExportCandidatsByStructureCsv,
  getExportCandidatsValideStructureCsv,
  getExportConseillersWithoutCRACsv,
  getExportJeRecruteCsv,
  getExportDemandesRupturesCsv,
  getExportStructuresCsv,
  getExportEmbauchesCsv,
  getExportConseillersHubCsv,
  getExportStatistiquesCsv,
  getExportTerritoiresCsv,
  getExportListeStructuresCsv,
  getExportListeGestionnairesCsv,
  getExportConseillersCsv,
  getExportHistoriqueDossiersConventionCsv,
  getExportHistoriqueContratsCsv,
  getExportStructureNonInteresserReconventionnementCsv,
  getExportListeDemandesCoordinateursCsv,
} from './controllers';

interface Data {}

interface ServiceOptions {}
// eslint-disable-next-line import/prefer-default-export
export class Exports implements ServiceMethods<Data> {
  app: Application;

  options: ServiceOptions;

  // eslint-disable-next-line @typescript-eslint/default-param-last
  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;

    app.get(
      '/exports/candidats-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportJeRecruteCsv(app),
    );
    app.get(
      '/exports/candidatsValidesStructure-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportCandidatsValideStructureCsv(app),
    );
    app.get(
      '/exports/embauches-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportEmbauchesCsv(app),
    );
    app.get(
      '/exports/candidatsByStructure-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportCandidatsByStructureCsv(app),
    );
    app.get(
      '/exports/demandes-coordinateurs-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportListeDemandesCoordinateursCsv(app),
    );
    app.get(
      '/exports/cnfs-without-cra-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportConseillersWithoutCRACsv(app),
    );
    app.get(
      '/exports/structures-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportStructuresCsv(app),
    );
    app.get(
      '/exports/demandes-ruptures-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportDemandesRupturesCsv(app),
    );
    app.get(
      '/exports/cnfs-hub-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportConseillersHubCsv(app),
    );
    app.get(
      '/exports/statistiques-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportStatistiquesCsv(app),
    );
    app.get(
      '/exports/territoires-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportTerritoiresCsv(app),
    );
    app.get(
      '/exports/conseillers-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportConseillersCsv(app),
    );
    app.get(
      '/exports/liste-structures-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportListeStructuresCsv(app),
    );
    app.get(
      '/exports/liste-gestionnaires-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportListeGestionnairesCsv(app),
    );
    app.get(
      '/exports/historique-dossiers-convention-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportHistoriqueDossiersConventionCsv(app),
    );
    app.get(
      '/exports/historique-contrats-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportHistoriqueContratsCsv(app),
    );
    app.get(
      '/exports/structure-non-interesser-reconventionnement-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportStructureNonInteresserReconventionnementCsv(app),
    );
  }

  // fonctions par default créées par feathers à la génération d'un service custom (non relié à une collection) ne pas prendre en compte

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  async find(_params?: Params): Promise<Data[] | Paginated<Data>> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  async get(id: Id, _params?: Params): Promise<Data> {
    return {
      id,
      text: `A new message with ID: ${id}!`,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async create(data: Data, params?: Params): Promise<Data> {
    if (Array.isArray(data)) {
      return Promise.all(data.map((current) => this.create(current, params)));
    }

    return data;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  async update(_id: NullableId, data: Data, _params?: Params): Promise<Data> {
    return data;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  async patch(_id: NullableId, data: Data, _params?: Params): Promise<Data> {
    return data;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  async remove(_id: NullableId, data: Data): Promise<Data> {
    return data;
  }
}
