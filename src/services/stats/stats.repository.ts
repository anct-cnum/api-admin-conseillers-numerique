import service from '../../helpers/services';

const getStatsAccompagnements = async (query, app) =>
  app.service(service.cras).Model.aggregate([
    { $unwind: '$cra.accompagnement' },
    { $match: { ...query } },
    {
      $group: {
        _id: 'accompagnement',
        individuel: { $sum: '$cra.accompagnement.individuel' },
        atelier: { $sum: '$cra.accompagnement.atelier' },
        redirection: { $sum: '$cra.accompagnement.redirection' },
      },
    },
  ]);

export { getStatsAccompagnements };
