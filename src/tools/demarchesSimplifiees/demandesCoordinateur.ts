#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/demarchesSimplifiees/demandesCoordinateur.ts

import { GraphQLClient } from 'graphql-request';
import { ObjectId } from 'mongodb';
import execute from '../utils';
import service from '../../helpers/services';
import { queryGetDemarcheDemarcheSimplifiee } from '../../services/structures/repository/reconventionnement.repository';
import { IDossierDS } from '../../ts/interfaces/global.interfaces';

const requestGraphQLForGetDemarcheDS = (
  graphQLClient: GraphQLClient,
  cursor: string,
): Promise<any> =>
  graphQLClient
    .request(queryGetDemarcheDemarcheSimplifiee(), {
      demarcheNumber: 79487,
      after: cursor,
    })
    .catch(() => {
      return new Error("La démarche n'existe pas");
    });

execute(__filename, async ({ app, logger, exit, graphQLClient }) => {
  let arrayCursor: string = '';
  let arrayHasNextPage: boolean = true;
  let dossiersStructurePubliqueBrut = [];
  do {
    if (arrayHasNextPage === true) {
      const demarcheStructurePublique = await requestGraphQLForGetDemarcheDS(
        graphQLClient,
        arrayCursor,
      );
      dossiersStructurePubliqueBrut = [
        ...dossiersStructurePubliqueBrut,
        ...demarcheStructurePublique.demarche.dossiers.nodes,
      ];
      arrayCursor =
        demarcheStructurePublique.demarche.dossiers.pageInfo.endCursor;
      arrayHasNextPage =
        demarcheStructurePublique.demarche.dossiers.pageInfo.hasNextPage;
    }
  } while (arrayHasNextPage === true);

  const dossiers = await Promise.all(
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
        champs.find((champ: any) => champ.id === 'Q2hhbXAtMzI3MTEzNw==')
          ?.integerNumber,
        10,
      );

      return item;
    }),
  );

  const promises: Promise<void>[] = [];

  if (dossiers.length === 0) {
    logger.info(`Aucun dossier trouvé`);
    return;
  }

  dossiers.forEach(async (dossier: IDossierDS) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve, reject) => {
      try {
        const structure = await app
          .service(service.structures)
          .Model.findOne({ idPG: dossier.idPG });
        if (!structure) {
          reject();
          return;
        }
        const match = {
          idPG: dossier.idPG,
          statut: 'VALIDATION_COSELEC',
        };
        const matchMiseEnRelation = {
          'structure.$id': structure._id,
          'structureObj.statut': 'VALIDATION_COSELEC',
        };
        const demandeCoordinateurObject = {};
        const demandeCoordinateurMiseEnRelationObject = {};
        if (
          structure?.demandesCoordinateur?.some(
            (demande) => demande.dossier.numero === dossier._id,
          )
        ) {
          Object.assign(match, {
            demandesCoordinateur: {
              $elemMatch: {
                'dossier.numero': dossier._id,
                'dossier.dateDerniereModification': {
                  $gt: new Date(dossier.dateDerniereModification),
                },
              },
            },
          });
          Object.assign(matchMiseEnRelation, {
            'structureObj.demandesCoordinateur': {
              $elemMatch: {
                'dossier.numero': dossier._id,
                'dossier.dateDerniereModification': {
                  $gt: new Date(dossier.dateDerniereModification),
                },
              },
            },
          });
          Object.assign(demandeCoordinateurObject, {
            $set: {
              'demandesCoordinateur.$.dossier.statut': dossier.statut,
              'demandesCoordinateur.$.dossier.dateDerniereModification':
                new Date(dossier.dateDerniereModification),
            },
          });
          Object.assign(demandeCoordinateurMiseEnRelationObject, {
            $set: {
              'structureObj.demandesCoordinateur.$.dossier.statut':
                dossier.statut,
              'structureObj.demandesCoordinateur.$.dossier.dateDerniereModification':
                new Date(dossier.dateDerniereModification),
            },
          });
        } else {
          const idDemandeCoordinateur = new ObjectId();
          Object.assign(demandeCoordinateurObject, {
            $push: {
              demandesCoordinateur: {
                statut: 'en_cours',
                id: idDemandeCoordinateur,
                dossier: {
                  statut: dossier.statut,
                  numero: dossier._id,
                  dateDeCreation: new Date(dossier.dateDeCreation),
                  dateDerniereModification: new Date(
                    dossier.dateDerniereModification,
                  ),
                },
              },
            },
          });
          Object.assign(demandeCoordinateurMiseEnRelationObject, {
            $push: {
              'structureObj.demandesCoordinateur': {
                statut: 'en_cours',
                id: idDemandeCoordinateur,
                dossier: {
                  statut: dossier.statut,
                  numero: dossier._id,
                  dateDeCreation: new Date(dossier.dateDeCreation),
                  dateDerniereModification: new Date(
                    dossier.dateDerniereModification,
                  ),
                },
              },
            },
          });
        }
        const structureUpdated = await app
          .service(service.structures)
          .Model.updateOne(match, demandeCoordinateurObject);
        if (structureUpdated.modifiedCount === 1) {
          await app
            .service(service.misesEnRelation)
            .Model.updateMany(
              matchMiseEnRelation,
              demandeCoordinateurMiseEnRelationObject,
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
