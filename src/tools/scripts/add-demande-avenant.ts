#!/usr/bin/env node

import { program } from 'commander';
import { ObjectId } from 'mongodb';
import execute from '../utils';
import service from '../../helpers/services';
import { getCoselec } from '../../utils';
import { checkStructurePhase2 } from '../../services/structures/repository/structures.repository';

// ts-node src/tools/scripts/add-demande-avenant.ts -s XX -p X -m "XXX"

interface Options {
  structureId: ObjectId;
  postes: number;
  motif: string;
}

program.option('-s, --structureId <structureId>', 'id structure');
program.option('-p, --postes <postes>', 'postes');
program.option('-m, --motif <motif>', 'motif');
program.parse(process.argv);

execute(__filename, async ({ app, logger, exit }) => {
  const { postes, structureId, motif }: Options = program.opts();

  const motifsValid = [
    "Ma structure souhaite renforcer l'équipe",
    "Je souhaite développer l'offre de service Conseillers Numériques",
    'Je rencontre une forte demande sur mon territoire',
  ];

  if (!ObjectId.isValid(structureId)) {
    logger.error(`Veuillez renseigner un id structure valide.`);
    return;
  }

  if (Number.isNaN(Number(postes)) || Number(postes) <= 0) {
    logger.error(`Veuillez saisir un nombre de postes valide (supérieur à 0).`);
    return;
  }

  if (!motifsValid.includes(motif)) {
    logger.error(`Veuillez saisir un motif valide. Motifs acceptés :`);
    motifsValid.forEach((motifValid) => logger.info(`- "${motifValid}"`));
    return;
  }

  try {
    const getStructure = await app.service(service.structures).Model.findOne({
      _id: structureId,
    });

    if (!getStructure) {
      logger.error(`Structure avec l'id ${structureId} non trouvée.`);
      return;
    }

    const phaseConventionnement = checkStructurePhase2(
      getStructure.conventionnement?.statut,
    );
    const nbPostesAvantDemande =
      getCoselec(getStructure).nombreConseillersCoselec ?? 0;

    const demandeCoselec = {
      id: new ObjectId(),
      nombreDePostesSouhaites: Number(postes),
      motif,
      emetteurAvenant: { date: new Date(), email: app.get('user_support') },
      type: 'ajout',
      statut: 'en_cours',
      banniereValidationAvenant: false,
      phaseConventionnement,
      nbPostesAvantDemande,
    };

    const updateStructure = await app
      .service(service.structures)
      .Model.updateOne(
        { _id: new ObjectId(structureId) },
        { $push: { demandesCoselec: demandeCoselec } },
      );

    if (updateStructure.modifiedCount === 1) {
      const updateMisesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.updateMany(
          { 'structure.$id': new ObjectId(structureId) },
          { $push: { 'structureObj.demandesCoselec': demandeCoselec } },
        );

      logger.info(
        `Demande d'ajout de ${postes} postes effectuée pour la structure ${getStructure.idPG} qui a actuellement ${nbPostesAvantDemande} poste(s)`,
      );
      logger.info(
        `${updateMisesEnRelation.modifiedCount} mise(s) en relation mise(s) à jour`,
      );
    } else {
      logger.error(`Échec de la mise à jour de la structure.`);
    }
  } catch (error) {
    logger.error('Erreur:', error);
  }

  exit();
});
