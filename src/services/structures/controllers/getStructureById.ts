import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import {
  formatAdresseStructure,
  formatQpv,
  formatType,
} from '../structures.repository';
import { getConseillersById } from '../../../helpers/commonQueriesFunctions';

const getStructureById =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    try {
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(idStructure) });
      const conseillerIds = await getConseillersById(app)(structure._id);
      const craCount = await app
        .service(service.cras)
        .Model.countDocuments({ 'conseiller.$id': { $in: conseillerIds } });

      structure.set('craCount', craCount);
      structure.set('adresseFormat', formatAdresseStructure(structure.insee));
      structure.set('qpvStatut', formatQpv(structure.qpvStatut));
      structure.set('type', formatType(structure.type));

      res.status(200).json(structure);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
      throw new Error(error);
    }
  };

export default getStructureById;
