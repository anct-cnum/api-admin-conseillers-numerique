/* eslint-disable @typescript-eslint/no-use-before-define */
import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';

export default function getConseillersPourLaCoopMediation(app: Application) {
  return async (request: IRequest, response: Response): Promise<void> => {
    const { email, id, limit, page } = request.query;

    if (id !== undefined) {
      const conseillerParId = await compteLeNombreDeConseillerParId(app, id);

      if (conseillerParId === 0) {
        response
          .status(400)
          .json({ message: 'L’identifiant du conseiller est incorrect.' });
        return;
      }
    }

    if (email !== undefined) {
      const conseillerParEmail = await compteLeNombreDeConseillerParEmail(
        app,
        email,
      );

      if (conseillerParEmail === 0) {
        response
          .status(400)
          .json({ message: 'L’e-mail du conseiller est incorrect.' });
        return;
      }
    }

    const conseillers = await retournerDesConseillers(
      app,
      email,
      id,
      limit,
      page,
    );

    response.status(200).json(conseillers);
  };
}

function compteLeNombreDeConseillerParEmail(app: Application, email: string) {
  return app.service(service.conseillers).Model.countDocuments({ email });
}

function compteLeNombreDeConseillerParId(app: Application, _id: string) {
  return app.service(service.conseillers).Model.countDocuments({ _id });
}

export type ConseillerPourLaCoopMediation = Readonly<{
  _id: string;
  codeCommune: string;
  codeDepartement: string;
  codePostal: string;
  email: string;
  emailPro: string;
  misesEnRelation: ReadonlyArray<{
    dateDebutDeContrat: string;
    dateFinDeContrat: string;
    dateRecrutement: string;
    structureObj: Readonly<{
      _id: string;
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
    horaires: object[];
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
  structure: Readonly<{
    nom: string;
  }>;
  subordonnes: ReadonlyArray<{
    _id: string;
  }>;
  supprimeLe: string;
}>;

async function retournerDesConseillers(
  app: Application,
  email: string = '',
  id: string = '',
  limit: string = '10',
  page: string = '0',
): Promise<ReadonlyArray<ConseillerPourLaCoopMediation>> {
  let match = {};

  if (email !== '') {
    match = { email };
  } else if (id !== '') {
    match = { _id: new ObjectId(id) };
  }

  const conseillers = await app.service(service.conseillers).Model.aggregate([
    {
      $match: match,
    },
    {
      $skip: Number(page) > 0 ? (Number(page) - 1) * Number(limit) : 0,
    },
    {
      $limit: Number(limit),
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
      $unwind: {
        path: '$structure',
        preserveNullAndEmptyArrays: true,
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
        localField: '_id',
        from: 'misesEnRelation',
        foreignField: 'conseillerObj._id',
        as: 'misesEnRelation',
      },
    },
    {
      $lookup: {
        localField: '_id',
        from: 'conseillersSupprimes',
        foreignField: 'conseiller._id',
        as: 'conseillerSupprime',
      },
    },
    {
      $unwind: {
        path: '$conseillerSupprime',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
    {
      $project: {
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
        'structure.nom': 1,
        'subordonnes._id': 1,
        'misesEnRelation.structureObj': 1,
        'misesEnRelation.dateRecrutement': 1,
        'misesEnRelation.dateDebutDeContrat': 1,
        'misesEnRelation.dateFinDeContrat': 1,
        'misesEnRelation.typeDeContrat': 1,
        supprimeLe: '$conseillerSupprime.deletedAt',
      },
    },
  ]);

  return conseillers;
}
