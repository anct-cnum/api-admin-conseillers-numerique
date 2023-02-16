import { Application } from '@feathersjs/express';
import { action } from '../../helpers/accessControl/accessList';
import service from '../../helpers/services';
import { IRequest } from '../../ts/interfaces/global.interfaces';
import { checkAccessRequestCras } from '../cras/cras.repository';

const getTauxActivation = (nombreConseillersCoselec, cnfsActives) =>
  nombreConseillersCoselec > 0
    ? Math.round((cnfsActives * 100) / nombreConseillersCoselec)
    : 0;

const checkAccessRequestStatsTerritoires = async (
  app: Application,
  req: IRequest,
) =>
  app
    .service(service.statsTerritoires)
    .Model.accessibleBy(req.ability, action.read)
    .getQuery();

const getPersonnesAccompagnees =
  (app: Application, checkRoleAccessStatsTerritoires) => (query: object) =>
    app
      .service(service.cras)
      .Model.aggregate([
        { $match: { ...query, $and: [checkRoleAccessStatsTerritoires] } },
        { $group: { _id: null, count: { $sum: '$cra.nbParticipants' } } },
        { $project: { count: '$count' } },
      ]);
const getPersonnesRecurrentes =
  (app: Application, checkRoleAccessStatsTerritoires) => (query: object) =>
    app.service(service.cras).Model.aggregate([
      { $match: { ...query, $and: [checkRoleAccessStatsTerritoires] } },
      { $group: { _id: null, count: { $sum: '$cra.nbParticipantsRecurrents' } } },
      { $project: { count: '$count' } },
    ]);

const countPersonnesAccompagnees = async (
  app: Application,
  req: IRequest,
  query,
) => {
  const checkAccessRequestCrass = await checkAccessRequestCras(app, req);
  const personnesAccompagnees = await getPersonnesAccompagnees(
    app,
    checkAccessRequestCrass,
  )(query);

  return personnesAccompagnees.length > 0 ? personnesAccompagnees[0]?.count : 0;
};

const countPersonnesRecurrentes = async (
  app: Application,
  req: IRequest,
  query,
) => {
  const checkAccessRequestCrass = await checkAccessRequestCras(app, req);
  const personnesRecurrentes = await getPersonnesRecurrentes(
    app,
    checkAccessRequestCrass,
  )(query);

  return personnesRecurrentes.length > 0 ? personnesRecurrentes[0]?.count : 0;
};
export {
  checkAccessRequestStatsTerritoires,
  countPersonnesAccompagnees,
  getTauxActivation,
  countPersonnesRecurrentes
};
