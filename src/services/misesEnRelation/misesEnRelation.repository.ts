import { Application } from '@feathersjs/express';
import { action } from '../../helpers/accessControl/accessList';
import service from '../../helpers/services';
import { IRequest } from '../../ts/interfaces/global.interfaces';

const checkAccessReadRequestMisesEnRelation = async (
  app: Application,
  req: IRequest,
) =>
  app
    .service(service.misesEnRelation)
    .Model.accessibleBy(req.ability, action.read)
    .getQuery();

export default checkAccessReadRequestMisesEnRelation;
