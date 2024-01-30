#!/usr/bin/env node

// ts-node src/tools/scripts/conseillerRecruterPhase2.ts -c XXX -s XXX -p X

import { program } from 'commander';
import { ObjectId } from 'mongodb';
import dayjs from 'dayjs';
import execute from '../utils';
import service from '../../helpers/services';
import { PhaseConventionnement, StatutConventionnement } from '../../ts/enum';

program.option('-c, --conseillerId <conseillerId>', 'id conseiller');
program.option('-s, --structureId <structureId>', 'id structure');
program.option('-p, --phase <phase>', 'phase 1 ou 2');
program.parse(process.argv);

execute(__filename, async ({ app, logger, exit }) => {
  const options = program.opts();
  if (
    !ObjectId.isValid(options.structureId) ||
    !ObjectId.isValid(options.conseillerId) ||
    !options.phase
  ) {
    logger.error(
      `Veuillez renseigner un id conseiller & un id structure valide & et la phase précise (1 ou 2)`,
    );
    return;
  }
  let queryUpdate = {};
  const conseillerId = new ObjectId(options.conseillerId);
  const structureId = new ObjectId(options.structureId);
  if (options.phase === '2') {
    queryUpdate = {
      $set: {
        phaseConventionnement: PhaseConventionnement.PHASE_2,
      },
      $unset: {
        reconventionnement: '',
        miseEnRelationConventionnement: '',
      },
    };
  } else if (options.phase === '1') {
    queryUpdate = {
      $unset: {
        phaseConventionnement: '',
      },
    };
  } else {
    logger.error(
      `Veuillez renseigner une phase valide : ${Object.values(
        PhaseConventionnement,
      )} `,
    );
    return;
  }
  const structure = await app
    .service(service.structures)
    .Model.findOne({ _id: structureId });
  if (
    structure?.conventionnement?.statut !==
    StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ
  ) {
    logger.error(
      `La structure ${structure?.nom} a un statut : ${structure?.conventionnement?.statut}. Le statut doit etre égal à ${StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ}`,
    );
    return;
  }
  const update = await app.service(service.misesEnRelation).Model.updateOne(
    {
      'conseiller.$id': conseillerId,
      statut: 'finalisee',
      'structure.$id': structureId,
    },
    queryUpdate,
  );
  if (update.matchedCount === 1) {
    logger.info(
      `Le contrat en cours (finalisee) du conseiller ${conseillerId} est de phase ${options.phase} (structure: ${structure?.nom})`,
    );
    const contrats = await app.service(service.misesEnRelation).Model.find({
      'conseiller.$id': conseillerId,
      'structure.$id': structureId,
      statut: { $in: ['terminee', 'finalisee'] },
      typeDeContrat: { $ne: 'CDI' },
    });
    logger.info(`il y a ${contrats.length} contrat pour ce conseiller..`);
    // Pour n'importe qu'elle phase
    if (contrats.length === 2) {
      const dateDebutDeContrat = contrats.map((d) =>
        dayjs(d.dateDebutDeContrat).format('DD/MM/YYYY'),
      );
      const dateFinDeContrat = contrats.map((d) =>
        dayjs(d?.dateFinDeContrat).format('DD/MM/YYYY'),
      );
      if (
        dateDebutDeContrat[0]?.toString() ===
          dateDebutDeContrat[1]?.toString() &&
        dateFinDeContrat[0]?.toString() === dateFinDeContrat[1]?.toString()
      ) {
        await app.service(service.misesEnRelation).Model.deleteOne({
          statut: 'terminee',
          'conseiller.$id': conseillerId,
          'structure.$id': structureId,
        });
      } else {
        logger.error(
          `Une différence entre les 2 dates / misesEnRelations: ${dateDebutDeContrat[0]} - ${dateFinDeContrat[0]} / ${dateDebutDeContrat[1]} - ${dateFinDeContrat[1]}`,
        );
      }
    }
  } else {
    logger.info(`Contrat non trouvé.`);
  }
  exit();
});
