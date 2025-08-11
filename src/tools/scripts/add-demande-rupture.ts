#!/usr/bin/env node

import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';

// Lancement de ce script : node_modules/.bin/ts-node src/tools/scripts/add-demande-rupture.ts -c XX -s XX -d JJ/MM/AAAA

program.option('-c, --conseillerId <conseillerId>', 'idPG conseiller');
program.option('-s, --structureId <structureId>', 'idPG structure');
program.option(
  '-d, --dateRupture <dateRupture>',
  'date de rupture: JJ/MM/AAAA',
);
program.parse(process.argv);

execute(__filename, async ({ app, logger }) => {
  const { conseillerId, structureId, dateRupture } = program.opts();

  if (!conseillerId || Number.isNaN(conseillerId)) {
    logger.error('Le paramètre conseillerId est requis');
    return;
  }
  if (!structureId || Number.isNaN(structureId)) {
    logger.error('Le paramètre structureId est requis');
    return;
  }
  if (!dateRupture) {
    logger.error('Le paramètre dateRupture est requis');
    return;
  }
  const [jourDebut, moisDebut, anneeDebut] = dateRupture.split('/');
  const convertRupture = new Date(
    anneeDebut,
    moisDebut - 1,
    jourDebut,
    0,
    0,
    0,
  );
  try {
    const result = await app.service(service.misesEnRelation).Model.updateOne(
      {
        'conseillerObj.idPG': Number(conseillerId),
        'structureObj.idPG': Number(structureId),
        statut: 'finalisee',
      },
      {
        $set: {
          statut: 'nouvelle_rupture',
          date_rupture: convertRupture,
          dossierIncompletRupture: false,
          emetteurRupture: {
            email: app.get('user_support'),
            date: new Date(),
          },
          motifRupture: 'nonReconductionCDD',
        },
      },
    );

    if (result.modifiedCount === 0) {
      logger.error(
        `Échec de la mise à jour pour le CN ${conseillerId} - SA ${structureId}`,
      );
      return;
    }

    logger.info(
      `Mise en relation mise à jour avec succès pour le CN ${conseillerId} - SA ${structureId} / Date de rupture: ${dateRupture}`,
    );
  } catch (error) {
    logger.error('Erreur :', error);
  }
});
