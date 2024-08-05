#!/usr/bin/env node

// Lancement de ce script : ts-node src/tools/demarchesSimplifiees/affichageDifferenceQuota.ts

import { GraphQLClient } from 'graphql-request';
import execute from '../utils';
import service from '../../helpers/services';
import { IDossierDS } from '../../ts/interfaces/global.interfaces';
import { queryGetDemarcheDemarcheSimplifiee } from '../../services/structures/repository/demarchesSimplifiees.repository';

const requestGraphQLForGetDemarcheDS = (
  graphQLClient: GraphQLClient,
  demarcheNumber: string,
  cursor: string,
): Promise<any> =>
  graphQLClient
    .request(queryGetDemarcheDemarcheSimplifiee(), {
      demarcheNumber: Number(demarcheNumber),
      after: cursor,
    })
    .catch(() => {
      return new Error("La démarche n'existe pas");
    });

execute(
  __filename,
  async ({ app, logger, exit, graphQLClient, demarcheSimplifiee }) => {
    const arrayCursor: string[] = ['', '', ''];
    const arrayHasNextPage: boolean[] = [true, true, true];
    let dossiersStructurePubliqueBrut = [];
    let dossiersEntrepriseEssBrut = [];
    let dossiersAssociationsBrut = [];

    do {
      if (arrayHasNextPage[0]) {
        // eslint-disable-next-line no-await-in-loop
        const demarcheStructurePublique = await requestGraphQLForGetDemarcheDS(
          graphQLClient,
          demarcheSimplifiee.numero_demarche_structure_publique_reconventionnement,
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
      if (arrayHasNextPage[1]) {
        // eslint-disable-next-line no-await-in-loop
        const demarcheAssociation = await requestGraphQLForGetDemarcheDS(
          graphQLClient,
          demarcheSimplifiee.numero_demarche_association_reconventionnement,
          arrayCursor[1],
        );
        dossiersAssociationsBrut = [
          ...dossiersAssociationsBrut,
          ...demarcheAssociation.demarche.dossiers.nodes,
        ];
        arrayCursor[1] =
          demarcheAssociation.demarche.dossiers.pageInfo.endCursor;
        arrayHasNextPage[1] =
          demarcheAssociation.demarche.dossiers.pageInfo.hasNextPage;
      }
      if (arrayHasNextPage[2]) {
        // eslint-disable-next-line no-await-in-loop
        const demarcheEntrepriseEss = await requestGraphQLForGetDemarcheDS(
          graphQLClient,
          demarcheSimplifiee.numero_demarche_entreprise_reconventionnement,
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
      logger.info('Aucun dossier trouvé');
      return;
    }

    logger.info(`Le nombre de dossiers est: ${dossiers.length}`);

    dossiers.forEach(async (dossier: IDossierDS) => {
      // eslint-disable-next-line no-async-promise-executor
      const structurePromise = new Promise<void>(async (resolve) => {
        try {
          const structures = await app.service(service.structures).Model.find({
            'structure.conventionnement.dossierReconventionnement.numero':
              dossier._id,
          });

          structures.forEach((structure) => {
            if (
              structure.conventionnement?.dossierReconventionnement
                ?.nbPostesAttribuees !== dossier.nbPostesAttribuees
            ) {
              logger.info(
                `La structure [${structure.idPG}] a un nombre de postes attribués différent : DossierDS [${dossier.nbPostesAttribuees}], Structure [${structure.conventionnement?.dossierReconventionnement?.nbPostesAttribuees}]`,
              );
            }
          });
          resolve(structurePromise);
        } catch (e) {
          logger.error(e);
        }
      });
      promises.push(structurePromise);
    });
    await Promise.allSettled(promises);
    exit(0, 'Analyse terminée');
  },
);
