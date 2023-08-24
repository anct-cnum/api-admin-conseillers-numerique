#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/demarchesSimplifiees/conventionnement.ts

import { GraphQLClient } from 'graphql-request';
import execute from '../utils';
import service from '../../helpers/services';
import {
  TypeDossierReconventionnement,
  StatutConventionnement,
} from '../../ts/enum';
import { queryGetDemarcheDemarcheSimplifiee } from '../../services/structures/repository/reconventionnement.repository';
import { IDossierDS } from '../../ts/interfaces/global.interfaces';

const categoriesCorrespondances = require('../../../datas/categorieFormCorrespondances.json');

const getDemarcheNumber = (type: string) =>
  categoriesCorrespondances.find((categorie) => categorie.type === type)
    .numero_demarche_conventionnement;

const requestGraphQLForGetDemarcheDS = (
  graphQLClient: GraphQLClient,
  type: string,
  cursor: string,
): Promise<any> =>
  graphQLClient
    .request(queryGetDemarcheDemarcheSimplifiee(), {
      demarcheNumber: getDemarcheNumber(type),
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
        champs.find((champ: any) => champ.id === 'Q2hhbXAtMzE0NDcyNw==')
          ?.integerNumber,
        10,
      );

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
        champs.find((champ: any) => champ.id === 'Q2hhbXAtMzE0NDcyOQ==')
          ?.integerNumber,
        10,
      );

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
        champs.find((champ: any) => champ.id === 'Q2hhbXAtMzE0NDczMA==')
          ?.integerNumber,
        10,
      );

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
    if (dossier?.idPG) {
      // eslint-disable-next-line no-async-promise-executor
      const p = new Promise<void>(async (resolve) => {
        try {
          const structureUpdated = await app
            .service(service.structures)
            .Model.updateOne(
              {
                idPG: dossier.idPG,
                statut: 'VALIDATION_COSELEC',
                $and: [
                  {
                    $or: [
                      {
                        'conventionnement.statut':
                          StatutConventionnement.CONVENTIONNEMENT_EN_COURS,
                      },
                      {
                        'conventionnement.statut': { $exists: false },
                      },
                    ],
                  },
                  {
                    $or: [
                      {
                        'conventionnement.dossierConventionnement.dateDernierModification':
                          {
                            $gt: new Date(dossier.dateDerniereModification),
                          },
                      },
                      {
                        'conventionnement.dossierConventionnement.dateDernierModification':
                          {
                            $exists: false,
                          },
                      },
                    ],
                  },
                ],
              },
              {
                'conventionnement.statut':
                  StatutConventionnement.CONVENTIONNEMENT_EN_COURS,
                'conventionnement.dossierConventionnement': {
                  numero: dossier._id,
                  dateDeCreation: new Date(dossier.dateDeCreation),
                  statut: dossier.statut,
                  dateDerniereModification: new Date(
                    dossier.dateDerniereModification,
                  ),
                },
              },
            );
          if (structureUpdated.modifiedCount === 1) {
            await app.service(service.misesEnRelation).Model.updateMany(
              {
                'structureObj.idPG': dossier.idPG,
                'structureObj.statut': 'VALIDATION_COSELEC',
                $and: [
                  {
                    $or: [
                      {
                        'structureObj.conventionnement.statut':
                          StatutConventionnement.CONVENTIONNEMENT_EN_COURS,
                      },
                      {
                        'structureObj.conventionnement.statut': {
                          $exists: false,
                        },
                      },
                    ],
                  },
                  {
                    $or: [
                      {
                        'structureObj.conventionnement.dossierConventionnement.dateDernierModification':
                          {
                            $gt: new Date(dossier.dateDerniereModification),
                          },
                      },
                      {
                        'structureObj.conventionnement.dossierConventionnement.dateDernierModification':
                          {
                            $exists: false,
                          },
                      },
                    ],
                  },
                ],
              },
              {
                'structureObj.conventionnement.statut':
                  StatutConventionnement.CONVENTIONNEMENT_EN_COURS,
                'structureObj.conventionnement.dossierConventionnement': {
                  numero: dossier._id,
                  dateDeCreation: new Date(dossier.dateDeCreation),
                  statut: dossier.statut,
                  dateDerniereModification: new Date(
                    dossier.dateDerniereModification,
                  ),
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
    } else {
      logger.info(
        `Structure avec le dossier [${dossier._id}] non mise à jour car idPG non renseigné`,
      );
    }
  });
  await Promise.allSettled(promises);
  exit(0, 'Migration terminée');
});