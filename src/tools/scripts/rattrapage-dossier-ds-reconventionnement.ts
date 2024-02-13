#!/usr/bin/env node
// Lancement de ce script : ts-node src/tools/scripts/rattrapage-dossier-ds-reconventionnement.ts -id <idPG> -n <numero>

import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { IStructures } from '../../ts/interfaces/db.interfaces';
import {
  getTypeDossierDemarcheSimplifiee,
  queryGetDossierDemarcheSimplifiee,
} from '../../services/structures/repository/demarchesSimplifiees.repository';
import { ITypeDossierDS } from '../../ts/interfaces/json.interface';
import { StatutConventionnement } from '../../ts/enum';

interface IDossierReconventionnement {
  numero: number;
  dateDeCreation: Date;
  statut: string;
  dateDerniereModification: Date;
  nbPostesAttribuees?: number;
  dateFinProchainContrat?: Date;
}

program.option('-id, --idPG <idPG>', 'idPG de la structure');
program.option('-n, --numero <numero>', 'numero de dossier');
program.parse(process.argv);

execute(
  __filename,
  async ({ app, logger, graphQLClient, demarcheSimplifiee, exit }) => {
    const options = program.opts();
    if (Number.isNaN(options.idPG) || Number.isNaN(options.numero)) {
      logger.error('Les options ne sont pas correctes');
      return;
    }
    try {
      const dossier: any | Error = await graphQLClient
        .request(queryGetDossierDemarcheSimplifiee(), {
          dossierNumber: Number(options.numero),
        })
        .catch(() => {
          return new Error("Le dossier n'existe pas");
        });
      if (dossier instanceof Error) {
        logger.error(dossier.message);
        exit();
        return;
      }
      const structure: IStructures = await app
        .service(service.structures)
        .Model.findOne({
          idPG: options.idPG,
          statut: 'VALIDATION_COSELEC',
        });
      if (!structure) {
        logger.error(`La structure ${options.idPG} n'existe pas`);
        exit();
        return;
      }
      const typeDossierDS: ITypeDossierDS | undefined =
        getTypeDossierDemarcheSimplifiee(
          structure?.insee?.unite_legale?.forme_juridique?.libelle,
          demarcheSimplifiee,
        );
      if (!typeDossierDS) {
        logger.error(
          `La structure ${options.idPG} n'a pas de forme juridique correspondante à un type de dossier DS`,
        );
        exit();
        return;
      }
      const {
        champs,
        state,
        datePassageEnConstruction,
        dateDerniereModification,
      } = dossier.dossier;
      const dossierReconventionnement: IDossierReconventionnement = {
        numero: Number(options.numero),
        dateDeCreation: new Date(datePassageEnConstruction),
        statut: state,
        dateDerniereModification: new Date(dateDerniereModification),
      };
      switch (typeDossierDS.type) {
        case 'entreprise':
          dossierReconventionnement.nbPostesAttribuees = parseInt(
            champs.find((champ: any) => champ.id === 'Q2hhbXAtMjg4MzI1Mg==')
              ?.integerNumber,
            10,
          );
          if (dossierReconventionnement.nbPostesAttribuees > 1) {
            dossierReconventionnement.dateFinProchainContrat = new Date(
              champs.find((champ: any) => champ.id === 'Q2hhbXAtMjkzOTk4OA==')
                ?.date,
            );
          }
          if (dossierReconventionnement.nbPostesAttribuees === 1) {
            dossierReconventionnement.dateFinProchainContrat = new Date(
              champs.find((champ: any) => champ.id === 'Q2hhbXAtMjg4MzI1OA==')
                ?.date,
            );
          }
          break;
        case 'structure_publique':
          dossierReconventionnement.nbPostesAttribuees = parseInt(
            champs.find((champ: any) => champ.id === 'Q2hhbXAtMjkwMjkyMw==')
              ?.integerNumber,
            10,
          );
          if (dossierReconventionnement.nbPostesAttribuees > 1) {
            dossierReconventionnement.dateFinProchainContrat = new Date(
              champs.find((champ: any) => champ.id === 'Q2hhbXAtMjk0MDAwNg==')
                ?.date,
            );
          }
          if (dossierReconventionnement.nbPostesAttribuees === 1) {
            dossierReconventionnement.dateFinProchainContrat = new Date(
              champs.find((champ: any) => champ.id === 'Q2hhbXAtMjkwMjkyNg==')
                ?.date,
            );
          }
          break;
        case 'association':
          dossierReconventionnement.nbPostesAttribuees = parseInt(
            champs.find((champ: any) => champ.id === 'Q2hhbXAtMjg3MzQ4Mw==')
              ?.integerNumber,
            10,
          );
          if (dossierReconventionnement.nbPostesAttribuees > 1) {
            dossierReconventionnement.dateFinProchainContrat = new Date(
              champs.find((champ: any) => champ.id === 'Q2hhbXAtMjk0MDAwNA==')
                ?.date,
            );
          }
          if (dossierReconventionnement.nbPostesAttribuees === 1) {
            dossierReconventionnement.dateFinProchainContrat = new Date(
              champs.find((champ: any) => champ.id === 'Q2hhbXAtMjg3NDM2Mw==')
                ?.date,
            );
          }
          break;
        default:
          logger.error(
            `La structure ${structure.idPG} n'a pas de type de dossier DS correspondant`,
          );
          exit();
          return;
      }
      const structureUpdated = await app
        .service(service.structures)
        .Model.updateOne(
          {
            _id: structure._id,
          },
          {
            $set: {
              'conventionnement.dossierReconventionnement':
                dossierReconventionnement,
              'conventionnement.statut':
                structure?.conventionnement?.statut ===
                StatutConventionnement.CONVENTIONNEMENT_VALIDÉ
                  ? StatutConventionnement.RECONVENTIONNEMENT_INITIÉ
                  : structure?.conventionnement?.statut,
            },
          },
        );
      if (structureUpdated.modifiedCount === 1) {
        await app.service(service.misesEnRelation).Model.updateMany(
          {
            'structure.$id': structure._id,
          },
          {
            $set: {
              'structureObj.conventionnement.dossierReconventionnement':
                dossierReconventionnement,
              'structureObj.conventionnement.statut':
                structure?.conventionnement?.statut ===
                StatutConventionnement.CONVENTIONNEMENT_VALIDÉ
                  ? StatutConventionnement.RECONVENTIONNEMENT_INITIÉ
                  : structure?.conventionnement?.statut,
            },
          },
        );
        logger.info(
          `La structure ${structure.idPG} a été mise à jour avec le dossier de reconventionnement ${options.numero}`,
        );
      }
    } catch (e) {
      logger.error(e);
    }
    exit(0, 'Migration terminée');
  },
);
