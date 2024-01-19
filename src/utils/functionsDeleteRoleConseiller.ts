import service from '../helpers/services';

const getMisesEnRelationsFinaliseesNaturelles =
  (app) => async (dateDebut, dateFin) =>
    app.service(service.misesEnRelation).Model.aggregate([
      {
        $match: {
          statut: {
            $in: ['finalisee', 'recrutee', 'terminee_naturelle'],
          },
        },
      },
      {
        $group: {
          _id: '$conseiller.$id',
          terminee_naturelle: {
            $sum: {
              $cond: [
                {
                  $eq: ['$statut', 'terminee_naturelle'],
                },
                1,
                0,
              ],
            },
          },
          idMiseEnRelation: {
            $push: {
              $cond: [
                {
                  $eq: ['$statut', 'terminee_naturelle'],
                },
                '$_id',
                null,
              ],
            },
          },
          structuresIdsTerminee: {
            $push: {
              $cond: [
                {
                  $eq: ['$statut', 'terminee_naturelle'],
                },
                '$structure.$id',
                null,
              ],
            },
          },
          structuresIdsAutre: {
            $push: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$statut', 'recrutee'] },
                    { $eq: ['$statut', 'finalisee'] },
                  ],
                },
                '$structure.$id',
                null,
              ],
            },
          },
          datesFinDeContrat: {
            $push: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$statut', 'terminee_naturelle'] },
                    {
                      $gte: ['$dateFinDeContrat', dateDebut],
                    },
                    {
                      $lte: ['$dateFinDeContrat', dateFin],
                    },
                  ],
                },
                '$dateFinDeContrat',
                null,
              ],
            },
          },
        },
      },
      {
        $match: {
          datesFinDeContrat: {
            $elemMatch: { $gte: dateDebut, $lte: dateFin },
          },
          terminee_naturelle: {
            $gte: 1,
          },
        },
      },
      {
        $project: {
          _id: '$idMiseEnRelation',
          conseillerId: '$_id',
          structuresIdsTerminee: 1,
          structuresIdsAutre: 1,
          datesFinDeContrat: 1,
        },
      },
    ]);

const getConseiller = (app) => async (id) =>
  app.service(service.conseillers).Model.findOne({
    _id: id,
  });

const updateConseillersPG = (pool) => async (email, disponible, datePG) => {
  try {
    await pool.query(
      `
      UPDATE djapp_coach
      SET (
        disponible,
        updated
      )
      =
      ($2,$3)
      WHERE LOWER(email) = LOWER($1)`,
      [email, disponible, datePG],
    );
  } catch (error) {
    throw new Error(error);
  }
};

const deleteConseillerInCoordinateurs =
  (app) => async (conseillerId, structureId) =>
    app.service(service.conseillers).Model.updateMany(
      {
        estCoordinateur: true,
        structureId,
        'listeSubordonnes.type': 'conseillers',
        'listeSubordonnes.liste': {
          $elemMatch: { $eq: conseillerId },
        },
      },
      {
        $pull: {
          'listeSubordonnes.liste': conseillerId,
        },
      },
    );

const deleteCoordinateurInConseillers =
  (app) => async (coordinateurId, structureId) => {
    const conseillers = await app.service(service.conseillers).Model.find({
      structureId,
      coordinateurs: {
        $elemMatch: {
          id: coordinateurId,
        },
      },
    });
    if (conseillers.length > 0) {
      for (const conseiller of conseillers) {
        if (conseiller.coordinateurs.length === 1) {
          app.service(service.conseillers).Model.updateMany(
            { _id: conseiller._id },
            {
              $unset: {
                coordinateurs: '',
              },
            },
          );
          app.service(service.misesEnRelation).Model.updateMany(
            { 'conseiller.$id': conseiller._id },
            {
              $unset: {
                'conseillerObj.coordinateurs': '',
              },
            },
          );
        } else {
          app.service(service.conseillers).Model.updateOne(
            { _id: conseiller._id },
            {
              $pull: {
                coordinateurs: {
                  id: coordinateurId,
                },
              },
            },
          );
          app.service(service.misesEnRelation).Model.updateMany(
            { 'conseiller.$id': conseiller._id, 'structure.$id': structureId },
            {
              $pull: {
                'conseillerObj.coordinateurs': {
                  id: coordinateurId,
                },
              },
            },
          );
        }
      }
    }
  };

const nettoyageCoordinateur =
  (app) => async (structureIdterminee, conseiller) => {
    await deleteConseillerInCoordinateurs(app)(
      conseiller._id,
      structureIdterminee,
    );
    if (conseiller.estCoordinateur) {
      await deleteCoordinateurInConseillers(app)(
        conseiller._id,
        structureIdterminee,
      );
    }
  };

const updateCacheObj = (app) => async (idConseiller) => {
  const conseiller = await getConseiller(idConseiller);
  app.service(service.misesEnRelation).Model.updateMany(
    { 'conseiller.$id': idConseiller },
    {
      $set: {
        conseillerObj: conseiller,
      },
    },
  );
};

const deletePermanences = (app) => async (idConseiller, idStructure) =>
  app.service(service.permanences).Model.deleteMany({
    conseillers: {
      $eq: [idConseiller],
    },
    'structure.$id': idStructure,
  });

const updatePermanences = (app) => async (idConseiller, idStructure) =>
  app.service(service.permanences).Model.updateMany(
    {
      conseillers: { $elemMatch: { $eq: idConseiller } },
      'structure.$id': idStructure,
    },
    {
      $pull: {
        conseillers: idConseiller,
        lieuPrincipalPour: idConseiller,
        conseillersItinerants: idConseiller,
      },
    },
  );

const deletePermanencesInCras =
  (app) => async (idConseiller, structureId, updatedAt) =>
    app.service(service.cras).Model.updateMany(
      {
        'conseiller.$id': idConseiller,
        'structure.$id': structureId,
      },
      { $set: { updatedAt }, $unset: { permanence: '' } },
    );

const nettoyagePermanence =
  (app) => async (structureIdterminee, conseillerId, updatedAt) => {
    await deletePermanences(app)(conseillerId, structureIdterminee)
      .then(async () => {
        await updatePermanences(app)(conseillerId, structureIdterminee);
      })
      .then(async () => {
        await deletePermanencesInCras(app)(
          conseillerId,
          structureIdterminee,
          updatedAt,
        );
      });
  };

export {
  getMisesEnRelationsFinaliseesNaturelles,
  getConseiller,
  updateConseillersPG,
  deleteConseillerInCoordinateurs,
  deleteCoordinateurInConseillers,
  nettoyageCoordinateur,
  updateCacheObj,
  deletePermanences,
  updatePermanences,
  deletePermanencesInCras,
  nettoyagePermanence,
};