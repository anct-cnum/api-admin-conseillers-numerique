#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/demarchesSimplifiees/reconventionnement.ts

import { GraphQLClient } from 'graphql-request';
import { Application } from '@feathersjs/express';
import execute from '../utils';
import service from '../../helpers/services';
import {
  TypeDossierReconventionnement,
  StatutConventionnement,
} from '../../ts/enum';
import {
  IConfigurationDemarcheSimplifiee,
  IDossierDS,
} from '../../ts/interfaces/global.interfaces';
import { queryGetDemarcheDemarcheSimplifiee } from '../../services/structures/repository/demarchesSimplifiees.repository';

const getDemarcheNumber = (type: string, app: Application) => {
  const demarcheSimplifiee: IConfigurationDemarcheSimplifiee = app.get(
    'demarche_simplifiee',
  );
  switch (type) {
    case 'association':
      return Number(
        demarcheSimplifiee.numero_demarche_association_reconventionnement,
      );
    case 'entreprise':
      return Number(
        demarcheSimplifiee.numero_demarche_entreprise_reconventionnement,
      );
    case 'structure_publique':
      return Number(
        demarcheSimplifiee.numero_demarche_structure_publique_reconventionnement,
      );
    default:
      return null;
  }
};

const requestGraphQLForGetDemarcheDS = (
  app: Application,
  graphQLClient: GraphQLClient,
  type: string,
  cursor: string,
): Promise<any> =>
  graphQLClient
    .request(queryGetDemarcheDemarcheSimplifiee(), {
      demarcheNumber: getDemarcheNumber(type, app),
      after: cursor,
    })
    .catch(() => {
      return new Error("La démarche n'existe pas");
    });

execute(__filename, async ({ app, logger, exit, graphQLClient }) => {
  const arrayCursor: string[] = ['', '', ''];
  const arrayHasNextPage: boolean[] = [true, true, true];
  let dossiersStructurePubliqueBrut = [];
  let dossiersEntrepriseEssBrut = [];
  let dossiersAssociationsBrut = [];

  do {
    if (arrayHasNextPage[0] === true) {
      const demarcheStructurePublique = await requestGraphQLForGetDemarcheDS(
        app,
        graphQLClient,
        TypeDossierReconventionnement.StructurePublique,
        arrayCursor[0],
      );
      dossiersStructurePubliqueBrut = [
        ...dossiersStructurePubliqueBrut,
        ...demarcheStructurePublique.demarche.dossiers.nodes,
      ];
      arrayCursor[0] =
        demarcheStructurePublique.demarche.dossiers.pageInfo.endCursor;
      arrayHasNextPage[0] =
        demarcheStructurePublique.demarche.dossiers.pageInfo.hasNextPage;
    }
    if (arrayHasNextPage[1] === true) {
      const demarcheAssociation = await requestGraphQLForGetDemarcheDS(
        app,
        graphQLClient,
        TypeDossierReconventionnement.Association,
        arrayCursor[1],
      );
      dossiersAssociationsBrut = [
        ...dossiersAssociationsBrut,
        ...demarcheAssociation.demarche.dossiers.nodes,
      ];
      arrayCursor[1] = demarcheAssociation.demarche.dossiers.pageInfo.endCursor;
      arrayHasNextPage[1] =
        demarcheAssociation.demarche.dossiers.pageInfo.hasNextPage;
    }
    if (arrayHasNextPage[2] === true) {
      const demarcheEntrepriseEss = await requestGraphQLForGetDemarcheDS(
        app,
        graphQLClient,
        TypeDossierReconventionnement.Entreprise,
        arrayCursor[2],
      );
      dossiersEntrepriseEssBrut = [
        ...dossiersEntrepriseEssBrut,
        ...demarcheEntrepriseEss.demarche.dossiers.nodes,
      ];
      arrayCursor[2] =
        demarcheEntrepriseEss.demarche.dossiers.pageInfo.endCursor;
      arrayHasNextPage[2] =
        demarcheEntrepriseEss.demarche.dossiers.pageInfo.hasNextPage;
    }
  } while (arrayHasNextPage.some((hasNextPage) => hasNextPage === true));

  const dossierStructurePublique = await Promise.all(
    dossiersStructurePubliqueBrut.map((dossier) => {
      const {
        champs,
        number,
        datePassageEnConstruction,
        dateDerniereModification,
        state,
      } = dossier;
      const item: IDossierDS = {};
      item._id = number;
      item.dateDeCreation = datePassageEnConstruction;
      item.dateDerniereModification = dateDerniereModification;
      item.statut = state;
      item.idPG = parseInt(
        champs.find((champ: any) => champ.id === 'Q2hhbXAtMjg1MTgwNA==')
          ?.integerNumber,
        10,
      );
      item.nbPostesAttribuees = parseInt(
        champs.find((champ: any) => champ.id === 'Q2hhbXAtMjkwMjkyMw==')
          ?.integerNumber,
        10,
      );
      if (item.nbPostesAttribuees > 1) {
        item.dateFinProchainContrat = champs.find(
          (champ: any) => champ.id === 'Q2hhbXAtMjk0MDAwNg==',
        )?.date;
      }
      if (item.nbPostesAttribuees === 1) {
        item.dateFinProchainContrat = champs.find(
          (champ: any) => champ.id === 'Q2hhbXAtMjkwMjkyNg==',
        )?.date;
      }

      return item;
    }),
  );

  const dossierEntrepriseEss = await Promise.all(
    dossiersEntrepriseEssBrut.map((dossier) => {
      const {
        champs,
        number,
        datePassageEnConstruction,
        dateDerniereModification,
        state,
      } = dossier;
      const item: IDossierDS = {};
      item._id = number;
      item.dateDeCreation = datePassageEnConstruction;
      item.dateDerniereModification = dateDerniereModification;
      item.statut = state;
      item.idPG = parseInt(
        champs.find((champ: any) => champ.id === 'Q2hhbXAtMjg1MjA1OQ==')
          ?.integerNumber,
        10,
      );
      item.nbPostesAttribuees = parseInt(
        champs.find((champ: any) => champ.id === 'Q2hhbXAtMjg4MzI1Mg==')
          ?.integerNumber,
        10,
      );
      if (item.nbPostesAttribuees > 1) {
        item.dateFinProchainContrat = champs.find(
          (champ: any) => champ.id === 'Q2hhbXAtMjkzOTk4OA==',
        )?.date;
      }
      if (item.nbPostesAttribuees === 1) {
        item.dateFinProchainContrat = champs.find(
          (champ: any) => champ.id === 'Q2hhbXAtMjg4MzI1OA==',
        )?.date;
      }

      return item;
    }),
  );

  const dossierAssociation = await Promise.all(
    dossiersAssociationsBrut.map((dossier) => {
      const {
        champs,
        number,
        datePassageEnConstruction,
        dateDerniereModification,
        state,
      } = dossier;
      const item: IDossierDS = {};
      item._id = number;
      item.dateDeCreation = datePassageEnConstruction;
      item.dateDerniereModification = dateDerniereModification;
      item.statut = state;
      item.idPG = parseInt(
        champs.find((champ: any) => champ.id === 'Q2hhbXAtMjg0ODE4Ng==')
          ?.integerNumber,
        10,
      );
      item.nbPostesAttribuees = parseInt(
        champs.find((champ: any) => champ.id === 'Q2hhbXAtMjg3MzQ4Mw==')
          ?.integerNumber,
        10,
      );
      if (item.nbPostesAttribuees > 1) {
        item.dateFinProchainContrat = champs.find(
          (champ: any) => champ.id === 'Q2hhbXAtMjk0MDAwNA==',
        )?.date;
      }
      if (item.nbPostesAttribuees === 1) {
        item.dateFinProchainContrat = champs.find(
          (champ: any) => champ.id === 'Q2hhbXAtMjg3NDM2Mw==',
        )?.date;
      }

      return item;
    }),
  );

  const dossiers = dossierStructurePublique.concat(
    dossierEntrepriseEss,
    dossierAssociation,
  );

  const promises: Promise<void>[] = [];

  if (dossiers.length === 0) {
    logger.info(`Aucun dossier trouvé`);
    return;
  }

  dossiers.forEach(async (dossier: IDossierDS) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve) => {
      try {
        const structure = await app
          .service(service.structures)
          .Model.findOne({ idPG: dossier.idPG });
        const structureUpdated = await app
          .service(service.structures)
          .Model.updateOne(
            {
              idPG: dossier.idPG,
              statut: 'VALIDATION_COSELEC',
              'conventionnement.statut': {
                $ne: StatutConventionnement.CONVENTIONNEMENT_EN_COURS,
              },
              $or: [
                {
                  'conventionnement.dossierReconventionnement.dateDerniereModification':
                    {
                      $lt: new Date(dossier.dateDerniereModification),
                    },
                },
                {
                  'conventionnement.dossierReconventionnement.dateDerniereModification':
                    {
                      $exists: false,
                    },
                },
                {
                  'conventionnement.dossierReconventionnement.numero': {
                    $exists: false,
                  },
                },
              ],
            },
            {
              'conventionnement.statut':
                structure?.conventionnement?.statut ===
                StatutConventionnement.CONVENTIONNEMENT_VALIDÉ
                  ? StatutConventionnement.RECONVENTIONNEMENT_INITIÉ
                  : structure?.conventionnement?.statut,
              'conventionnement.dossierReconventionnement': {
                numero: dossier._id,
                dateDeCreation: new Date(dossier.dateDeCreation),
                dateFinProchainContrat: dossier.dateFinProchainContrat
                  ? new Date(dossier.dateFinProchainContrat)
                  : null,
                statut: dossier.statut,
                dateDerniereModification: new Date(
                  dossier.dateDerniereModification,
                ),
                nbPostesAttribuees:
                  structure?.conventionnement?.dossierReconventionnement
                    ?.nbPostesAttribuees ?? dossier.nbPostesAttribuees,
              },
            },
          );
        if (structureUpdated.modifiedCount === 1) {
          await app.service(service.misesEnRelation).Model.updateMany(
            {
              'structure.$id': structure._id,
              'structureObj.statut': 'VALIDATION_COSELEC',
              'structureObj.conventionnement.statut': {
                $ne: StatutConventionnement.CONVENTIONNEMENT_EN_COURS,
              },
              $or: [
                {
                  'structureObj.conventionnement.dossierReconventionnement.dateDerniereModification':
                    {
                      $lt: new Date(dossier.dateDerniereModification),
                    },
                },
                {
                  'structureObj.conventionnement.dossierReconventionnement.dateDerniereModification':
                    {
                      $exists: false,
                    },
                },
                {
                  'structureObj.conventionnement.dossierReconventionnement.numero':
                    {
                      $exists: false,
                    },
                },
              ],
            },
            {
              'structureObj.conventionnement.statut':
                structure?.conventionnement?.statut ===
                StatutConventionnement.CONVENTIONNEMENT_VALIDÉ
                  ? StatutConventionnement.RECONVENTIONNEMENT_INITIÉ
                  : structure?.conventionnement?.statut,
              'structureObj.conventionnement.dossierReconventionnement': {
                numero: dossier._id,
                dateDeCreation: new Date(dossier.dateDeCreation),
                dateFinProchainContrat: dossier.dateFinProchainContrat
                  ? new Date(dossier.dateFinProchainContrat)
                  : null,
                statut: dossier.statut,
                dateDerniereModification: new Date(
                  dossier.dateDerniereModification,
                ),
                nbPostesAttribuees:
                  structure?.conventionnement?.dossierReconventionnement
                    ?.nbPostesAttribuees ?? dossier.nbPostesAttribuees,
              },
            },
          );
          logger.info(`Structure [${dossier.idPG}] mise à jour avec succès`);
        }
        resolve(p);
      } catch (e) {
        logger.error(e);
      }
    });
    promises.push(p);
  });
  await Promise.allSettled(promises);
  exit(0, 'Migration terminée');
});
