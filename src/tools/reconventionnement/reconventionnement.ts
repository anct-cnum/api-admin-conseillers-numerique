#!/usr/bin/env node

// Lancement de ce script : ts-node src/tools/reconventionnement/reconventionnement.ts

import { GraphQLClient } from 'graphql-request';
import execute from '../utils';
import service from '../../helpers/services';
import TypeDossierReconventionnement from '../../ts/enum';
import { queryGetDemarcheReconventionnement } from '../../services/structures/repository/reconventionnement.repository';
import { IDossierDS } from '../../ts/interfaces/global.interfaces';

const categoriesCorrespondances = require('../../../datas/categorieFormCorrespondances.json');

const getDemarcheNumber = (type: string) =>
  categoriesCorrespondances.find((categorie) => categorie.type === type)
    .numero_demarche;

const requestGraphQLForGetDemarcheDS = (
  graphQLClient: GraphQLClient,
  type: string,
) =>
  graphQLClient
    .request(queryGetDemarcheReconventionnement(), {
      demarcheNumber: getDemarcheNumber(type),
    })
    .catch(() => {
      return new Error("La démarche n'existe pas");
    });

execute(__filename, async ({ app, logger, exit, graphQLClient }) => {
  const demarcheStructurePublique = await requestGraphQLForGetDemarcheDS(
    graphQLClient,
    TypeDossierReconventionnement.StructurePublique,
  );
  if (demarcheStructurePublique instanceof Error) {
    logger.info(demarcheStructurePublique.message);
    return;
  }
  const demarcheEntrepriseEss = await requestGraphQLForGetDemarcheDS(
    graphQLClient,
    TypeDossierReconventionnement.Entreprise,
  );
  if (demarcheEntrepriseEss instanceof Error) {
    logger.info(demarcheEntrepriseEss.message);
    return;
  }
  const demarcheAssociation = await requestGraphQLForGetDemarcheDS(
    graphQLClient,
    TypeDossierReconventionnement.Association,
  );
  if (demarcheAssociation instanceof Error) {
    logger.info(demarcheAssociation.message);
    return;
  }

  const dossierStructurePublique = await Promise.all(
    demarcheStructurePublique.demarche.dossiers.nodes.map((dossier) => {
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
          ?.stringValue,
        10,
      );
      item.nbPostesAttribuees = Math.abs(
        parseInt(
          champs.find((champ: any) => champ.id === 'Q2hhbXAtMjkwMjkyMw==')
            ?.integerNumber,
          10,
        ),
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
    demarcheEntrepriseEss.demarche.dossiers.nodes.map((dossier) => {
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
      item.idPG = champs.find(
        (champ: any) => champ.id === 'Q2hhbXAtMjg1MjA1OQ==',
      )?.stringValue;
      item.nbPostesAttribuees = Math.abs(
        parseInt(
          champs.find((champ: any) => champ.id === 'Q2hhbXAtMjg4MzI1Mg==')
            ?.integerNumber,
          10,
        ),
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
    demarcheAssociation.demarche.dossiers.nodes.map((dossier) => {
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
      item.idPG = champs.find(
        (champ: any) => champ.id === 'Q2hhbXAtMjg0ODE4Ng==',
      )?.stringValue;
      item.nbPostesAttribuees = Math.abs(
        parseInt(
          champs.find((champ: any) => champ.id === 'Q2hhbXAtMjg3MzQ4Mw==')
            ?.integerNumber,
          10,
        ),
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
        const structureUpdated = await app
          .service(service.structures)
          .Model.updateOne(
            {
              idPG: dossier.idPG,
              'dossierDemarcheSimplifiee.dateDernierModification': {
                $gt: new Date(dossier.dateDerniereModification),
              },
            },
            {
              dossierDemarcheSimplifiee: {
                numero: dossier._id,
                dateDeCreation: new Date(dossier.dateDeCreation),
                dateFinProchainContrat: dossier.dateFinProchainContrat
                  ? new Date(dossier.dateFinProchainContrat)
                  : null,
                nbPostesAttribuees: dossier.nbPostesAttribuees,
                statut: dossier.statut,
                dateDernierModification: new Date(
                  dossier.dateDerniereModification,
                ),
              },
            },
          );
        if (structureUpdated.modifiedCount === 1) {
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
