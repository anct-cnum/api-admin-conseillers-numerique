import service from '../../helpers/services';

const getConseillersIdsByStructure = async (idStructure, app) => {
  const miseEnRelations = await app.service(service.misesEnRelation).Model.find(
    {
      'structure.$id': idStructure,
      statut: { $in: ['finalisee', 'finalisee_rupture'] },
    },
    {
      'conseillerObj._id': 1,
      _id: 0,
    },
  );
  const conseillerIds = [];
  miseEnRelations.forEach((miseEnRelation) => {
    conseillerIds.push(miseEnRelation?.conseillerObj._id);
  });

  return conseillerIds;
};

const getCodesPostauxStatistiquesCrasStructure = async (conseillersId, app) =>
  app.service(service.cras).Model.distinct('cra.codePostal', {
    'conseiller.$id': {
      $in: conseillersId,
    },
  });

export {
  getConseillersIdsByStructure,
  getCodesPostauxStatistiquesCrasStructure,
};
