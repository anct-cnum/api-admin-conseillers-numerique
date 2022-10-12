import { Application } from '@feathersjs/express';
import { action } from '../../helpers/accessControl/accessList';
import service from '../../helpers/services';
import { IStructures } from '../../ts/interfaces/db.interfaces';
import { IRequest } from '../../ts/interfaces/global.interfaces';

const checkAccessRequestCras = async (app: Application, req: IRequest) =>
  app
    .service(service.cras)
    .Model.accessibleBy(req.ability, action.read)
    .getQuery();

const getConseillersIdsByStructure = async (idStructure, app) => {
  const miseEnRelations = await app.service(service.misesEnRelation).Model.find(
    {
      'structure.$id': idStructure,
      statut: { $in: ['finalisee', 'finalisee_rupture', 'nouvelle_rupture'] },
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

const getConseillersIdsByTerritoire = async (type, idType, app) => {
  const conseillersIds = [];
  const query = {
    [type]: idType,
  };

  const structures: IStructures[] = await app
    .service(service.structures)
    .Model.find(query);
  const promises = [];

  structures?.forEach((structure) => {
    // eslint-disable-next-line
    const p = new Promise(async (resolve) => {
      const conseillersStructure = await app
        .service(service.conseillers)
        .Model.find({
          structureId: structure._id,
        });
      if (conseillersStructure.length > 0) {
        conseillersStructure?.forEach((conseiller) => {
          conseillersIds.push(conseiller._id);
        });
      }
      resolve(conseillersIds);
    });
    promises.push(p);
  });

  await Promise.all(promises);
  return conseillersIds;
};

const getCodesPostauxStatistiquesCrasStructure = async (
  conseillersId,
  ability,
  read,
  app,
) =>
  app
    .service(service.cras)
    .Model.accessibleBy(ability, read)
    .distinct('cra.codePostal', {
      'conseiller.$id': {
        $in: conseillersId,
      },
    });

export {
  checkAccessRequestCras,
  getConseillersIdsByStructure,
  getConseillersIdsByTerritoire,
  getCodesPostauxStatistiquesCrasStructure,
};
