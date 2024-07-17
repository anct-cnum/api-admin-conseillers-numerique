import { Application } from '@feathersjs/express';
import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';

import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';

export function validerConseillersPourLaCoopMediation(app: Application) {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      const schema = Joi.object().keys({
        limit: Joi.number().error(new Error('La limite est incorrecte.')),
        page: Joi.number().error(new Error('La pagination est incorrecte.')),
        id: Joi.number().external(async (id) => {
          if (id !== undefined) {
            const conseillerParId = await compteLeNombreDeConseillerParId(
              app,
              id,
            );

            if (conseillerParId === 0) {
              throw new Error('L’identifiant du conseiller est incorrect.');
            }
          }

          return id;
        }),
        email: Joi.string().external(async (email) => {
          if (email !== undefined) {
            const conseillerParEmail = await compteLeNombreDeConseillerParEmail(
              app,
              email,
            );

            if (conseillerParEmail === 0) {
              throw new Error('L’e-mail du conseiller est incorrect.');
            }
          }

          return email;
        }),
      });

      await schema.validateAsync(request.query);

      return next();
    } catch (error) {
      return response.status(400).json({ message: error.message }).end();
    }
  };
}

export function getConseillersPourLaCoopMediation(app: Application) {
  return async (request: IRequest, response: Response) => {
    const { email, id, limit, page } = request.query;

    const conseillers = await retournerDesConseillersRecrutesParOrdreCroissant(
      app,
      email,
      id === undefined ? id : Number(id),
      limit === undefined ? limit : Number(limit),
      page === undefined ? page : Number(page),
    );

    return response.status(200).json(conseillers).end();
  };
}

function compteLeNombreDeConseillerParEmail(app: Application, email: string) {
  return app.service(service.conseillers).Model.countDocuments({ email });
}

function compteLeNombreDeConseillerParId(app: Application, idPg: string) {
  return app.service(service.conseillers).Model.countDocuments({ idPG: idPg });
}

export type ConseillerPourLaCoopMediation = Readonly<{
  idPG: number;
  codeCommune: string;
  codeDepartement: string;
  codePostal: string;
  email: string;
  emailPro: string;
  misesEnRelation: ReadonlyArray<{
    dateDebutDeContrat: string;
    dateFinDeContrat: string;
    dateRecrutement: string;
    statut: string;
    structureObj: Readonly<{
      idPG: number;
      nom: string;
    }>;
    typeDeContrat: string;
  }>;
  nom: string;
  permanences: ReadonlyArray<{
    _id: string;
    estStructure: boolean;
    nomEnseigne: string;
    numeroTelephone: string;
    email: string;
    siteWeb: string;
    siret: string;
    adresse: {
      numeroRue: string;
      rue: string;
      codePostal: string;
      ville: string;
    };
    location: {
      type: string;
      coordinates: number[];
    };
    horaires: Object[];
    typeAcces: string[];
    conseillers: string[];
    lieuPrincipalPour: string[];
    conseillersItinerants: string[];
    structure: string;
    updatedAt: string;
    updatedBy: string;
  }>;
  prenom: string;
  statut: string;
  structure: Readonly<Record<string, boolean | Date | Object | string>>;
  subordonnes: ReadonlyArray<{
    idPG: number;
  }>;
}>;

async function retournerDesConseillersRecrutesParOrdreCroissant(
  app: Application,
  email: string = '',
  idPg: number = 0,
  limit: number = 10,
  page: number = 0,
): Promise<ReadonlyArray<ConseillerPourLaCoopMediation>> {
  let match = {};

  if (email !== '') {
    match = { email };
  } else if (idPg !== 0) {
    match = { idPG: idPg };
  }

  const conseillers = await app.service(service.conseillers).Model.aggregate([
    {
      $match: {
        statut: 'RECRUTE',
        ...match,
      },
    },
    {
      $sort: {
        idPG: 1,
      },
    },
    {
      $skip: page > 0 ? (page - 1) * limit : 0,
    },
    {
      $limit: limit,
    },
    {
      $lookup: {
        localField: '_id',
        from: 'permanences',
        foreignField: 'conseillers',
        as: 'permanences',
      },
    },
    {
      $lookup: {
        localField: 'structureId',
        from: 'structures',
        foreignField: '_id',
        as: 'structure',
      },
    },
    {
      $lookup: {
        localField: 'coordinateurs.id',
        from: 'conseillers',
        foreignField: '_id',
        as: 'subordonnes',
      },
    },
    {
      $lookup: {
        from: 'misesEnRelation',
        let: {
          idConseiller: '$_id',
        },
        as: 'misesEnRelation',
        pipeline: [
          {
            $match: {
              statut: {
                $in: [
                  'nouvelle_rupture',
                  'finalisee_rupture',
                  'finalisee',
                  'terminee',
                ],
              },
              $expr: {
                $eq: ['$$idConseiller', '$conseillerObj._id'],
              },
            },
          },
          {
            $project: {
              _id: 0,
              'structureObj.idPG': 1,
              'structureObj.nom': 1,
              dateRecrutement: 1,
              dateDebutDeContrat: 1,
              dateFinDeContrat: 1,
              statut: 1,
              typeDeContrat: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        _id: 0,
        idPG: 1,
        nom: 1,
        prenom: 1,
        email: 1,
        emailPro: 1,
        codeCommune: 1,
        codePostal: 1,
        codeDepartement: 1,
        statut: 1,
        'permanences._id': 1,
        'permanences.adresse': 1,
        'permanences.conseillers': 1,
        'permanences.conseillersItinerants': 1,
        'permanences.email': 1,
        'permanences.estStructure': 1,
        'permanences.horaires': 1,
        'permanences.lieuPrincipalPour': 1,
        'permanences.location': 1,
        'permanences.nomEnseigne': 1,
        'permanences.numeroTelephone': 1,
        'permanences.siret': 1,
        'permanences.siteWeb': 1,
        'permanences.structure': '$structureId',
        'permanences.typeAcces': 1,
        'permanences.updatedAt': 1,
        'permanences.updatedBy': 1,
        structure: {
          $arrayElemAt: ['$structure', -1],
        },
        'subordonnes.idPG': 1,
        misesEnRelation: 1,
      },
    },
  ]);

  return conseillers;
}
