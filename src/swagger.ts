import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from '@feathersjs/express';
import conseillersModel from './models/conseillers.model';
import structuresModel from './models/structures.model';
import accessLogsModel from './models/accessLogs.model';
import communesModel from './models/communes.model';
import conseillersRupturesModel from './models/conseillersRuptures.model';
import conseillersSupprimesModel from './models/conseillersSupprimes.model';
import crasModel from './models/cras.model';
import misesEnRelationModel from './models/misesEnRelation.model';
import permanencesModel from './models/permanences.model';
import qpvModel from './models/qpv.model';
import statsConseillersCrasModel from './models/statsConseillersCras.model';
import statsTerritoiresModel from './models/statsTerritoires.model';
import usersModel from './models/users.model';

const m2s = require('mongoose-to-swagger');

export default function (app: Application): void {
  const options: swaggerJsdoc.Options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'REST API Tableau de pilotage',
        description:
          'Cette API est utilisée pour le tableau de pilotage de la plateforme conseiller numérique. Elle possède 106 routes pour les différentes fonctionnalités de la plateforme. Ses routes sont accessibles uniquement par les utilisateurs authentifiés avec le SSO inclusion connect. Vous pouvez retrouver les modèles de données dans la section "Schémas" de cette page.',
        version: '1.0.0',
      },
      servers: [{ url: app.get('host') }],
      components: {
        schemas: {
          AccessLogs: m2s(accessLogsModel(app)),
          Communes: m2s(communesModel(app)),
          Conseillers: m2s(conseillersModel(app)),
          ConseillersRuptures: m2s(conseillersRupturesModel(app)),
          ConseillersSupprimes: m2s(conseillersSupprimesModel(app)),
          Cras: m2s(crasModel(app)),
          MisesEnRelation: m2s(misesEnRelationModel(app)),
          Permanences: m2s(permanencesModel(app)),
          Qpv: m2s(qpvModel(app)),
          StatsConseillersCras: m2s(statsConseillersCrasModel(app)),
          StatsTerritoires: m2s(statsTerritoiresModel(app)),
          Structures: m2s(structuresModel(app)),
          Users: m2s(usersModel(app)),
        },
      },
      tags: [
        {
          name: 'Conseiller',
          description: 'Routes lié aux conseillers (14 routes)',
        },
        {
          name: 'ConseillerRupture',
          description: 'Routes lié aux conseillers en rupture (1 route)',
        },
        { name: 'Cra', description: 'Routes lié aux CRA (3 routes)' },
        { name: 'Export', description: 'Routes lié aux exports (18 routes)' },
        {
          name: 'MiseEnRelation',
          description: 'Routes lié aux mises en relation (14 routes)',
        },
        { name: 'Stats', description: 'Routes lié aux stats (9 routes)' },
        {
          name: 'Structure',
          description: 'Routes lié aux structures (35 routes)',
        },
        {
          name: 'User',
          description: 'Routes lié aux utilisateurs (19 routes)',
        },
      ],
    },
    apis: [
      './src/services/conseillers/conseillers.class.ts',
      './src/services/conseillersRuptures/conseillersRuptures.class.ts',
      './src/services/conseillersSupprimes/conseillersSupprimes.class.ts',
      './src/services/cras/cras.class.ts',
      './src/services/exports/exports.class.ts',
      './src/services/misesEnRelation/misesEnRelation.class.ts',
      './src/services/stats/stats.class.ts',
      './src/services/structures/structures.class.ts',
      './src/services/users/users.class.ts',
    ],
  };
  const swaggerSpec = swaggerJsdoc(options);
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, false, {
      docExpansion: 'none',
    }),
  );
}
