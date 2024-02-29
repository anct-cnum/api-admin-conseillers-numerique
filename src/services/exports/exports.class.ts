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
  getExportConseillersCoordonnesCsv,
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
    /**
     * @openapi
     * '/exports/candidats-csv':
     *  get:
     *     tags:
     *     - Export
     *     summary: Récupérer la liste des candidats au format CSV
     */
    app.get(
      '/exports/candidats-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportJeRecruteCsv(app),
    );
    /**
     * @openapi
     * '/exports/candidatsValidesStructure-csv':
     *  get:
     *     tags:
     *     - Export
     *     summary: Récupérer la liste des candidats validés par structure au format CSV
     */
    app.get(
      '/exports/candidatsValidesStructure-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportCandidatsValideStructureCsv(app),
    );
    /**
     * @openapi
     * '/exports/embauches-csv':
     *  get:
     *     tags:
     *     - Export
     *     summary: Récupérer la liste des embauchés au format CSV
     */
    app.get(
      '/exports/embauches-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportEmbauchesCsv(app),
    );
    /**
     * @openapi
     * '/exports/candidatsByStructure-csv':
     *  get:
     *     tags:
     *     - Export
     *     summary: Récupérer la liste des candidats par structure au format CSV
     */
    app.get(
      '/exports/candidatsByStructure-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportCandidatsByStructureCsv(app),
    );
    /**
     * @openapi
     * '/exports/demandes-coordinateurs-csv':
     *  get:
     *     tags:
     *     - Export
     *     summary: Récupérer la liste des demandes des coordinateurs au format CSV
     */
    app.get(
      '/exports/demandes-coordinateurs-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportListeDemandesCoordinateursCsv(app),
    );
    /**
     * @openapi
     * '/exports/cnfs-without-cra-csv':
     *  get:
     *     tags:
     *     - Export
     *     summary: Récupérer la liste des conseillers sans CRA au format CSV
     */
    app.get(
      '/exports/cnfs-without-cra-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportConseillersWithoutCRACsv(app),
    );
    /**
     * @openapi
     * '/exports/structures-csv':
     *  get:
     *     tags:
     *     - Export
     *     summary: Récupérer la liste des structures au format CSV
     */
    app.get(
      '/exports/structures-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportStructuresCsv(app),
    );
    /**
     * @openapi
     * '/exports/demandes-ruptures-csv':
     *  get:
     *     tags:
     *     - Export
     *     summary: Récupérer la liste des demandes de ruptures au format CSV
     */
    app.get(
      '/exports/demandes-ruptures-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportDemandesRupturesCsv(app),
    );
    /**
     * @openapi
     * '/exports/cnfs-hub-csv':
     *  get:
     *     tags:
     *     - Export
     *     summary: Récupérer la liste des conseillers au format CSV pour le Hub
     */
    app.get(
      '/exports/cnfs-hub-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportConseillersHubCsv(app),
    );
    /**
     * @openapi
     * '/exports/statistiques-csv':
     *  get:
     *     tags:
     *     - Export
     *     summary: Récupérer les statistiques au format CSV
     */
    app.get(
      '/exports/statistiques-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportStatistiquesCsv(app),
    );
    /**
     * @openapi
     * '/exports/territoires-csv':
     *  get:
     *     tags:
     *     - Export
     *     summary: Récupérer les territoires au format CSV
     */
    app.get(
      '/exports/territoires-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportTerritoiresCsv(app),
    );
    /**
     * @openapi
     * '/exports/conseillers-csv':
     *  get:
     *     tags:
     *     - Export
     *     summary: Récupérer les conseillers au format CSV
     */
    app.get(
      '/exports/conseillers-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportConseillersCsv(app),
    );
    /**
     * @openapi
     * '/exports/conseillers-coordonnes-csv':
     *  get:
     *     tags:
     *     - Export
     *     summary: Récupérer les conseillers coordonnés au format CSV
     */
    app.get(
      '/exports/conseillers-coordonnes-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportConseillersCoordonnesCsv(app),
    );
    /**
     * @openapi
     * '/exports/liste-structures-csv':
     *  get:
     *     tags:
     *     - Export
     *     summary: Récupérer la liste des structures au format CSV
     */
    app.get(
      '/exports/liste-structures-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportListeStructuresCsv(app),
    );
    /**
     * @openapi
     * '/exports/liste-gestionnaires-csv':
     *  get:
     *     tags:
     *     - Export
     *     summary: Récupérer la liste des gestionnaires au format CSV
     */
    app.get(
      '/exports/liste-gestionnaires-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportListeGestionnairesCsv(app),
    );
    /**
     * @openapi
     * '/exports/historique-dossiers-convention-csv':
     *  get:
     *     tags:
     *     - Export
     *     summary: Récupérer l'historique des dossiers de convention au format CSV
     */
    app.get(
      '/exports/historique-dossiers-convention-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportHistoriqueDossiersConventionCsv(app),
    );
    /**
     * @openapi
     * '/exports//exports/historique-contrats-csv':
     *  get:
     *     tags:
     *     - Export
     *     summary: Récupérer l'historique des contrats au format CSV
     */
    app.get(
      '/exports/historique-contrats-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportHistoriqueContratsCsv(app),
    );
    /**
     * @openapi
     * '/exports/structure-non-interesser-reconventionnement-csv':
     *  get:
     *     tags:
     *     - Export
     *     summary: Récupérer la liste des structures non intéressées par le reconventionnement au format CSV
     */
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
