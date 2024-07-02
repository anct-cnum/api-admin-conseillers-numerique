import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { DBRef, ObjectId } from 'mongodb';
import app from '../../../app';
import {
  IConseillers,
  IConseillersSupprimes,
  IMisesEnRelation,
  IPermanences,
  IStructures,
} from '../../../ts/interfaces/db.interfaces';
import { ConseillerPourLaCoopMediation } from './getConseillersPourLaCoopMediation';

describe('retourner un ou des conseillers pour la coop médiation avec le rôle admin', () => {
  app.listen(app.get('port'));

  it('étant donné un id incorrect quand j’apelle l’API conseiller alors j’ai un message d’erreur', async () => {
    // GIVEN
    const idIncorrect = '0000009045f8484ff010002f';

    // WHEN
    const response = await request(app)
      .get('/coop-mediation/conseillers')
      .query({ id: idIncorrect });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'L’identifiant du conseiller est incorrect.',
    });
  });

  it('étant donné un e-mail incorrect quand j’apelle l’API conseiller alors j’ai un message d’erreur', async () => {
    // GIVEN
    const emailIncorrect = 'email.incorrect@example.com';

    // WHEN
    const response = await request(app)
      .get('/coop-mediation/conseillers')
      .query({ email: emailIncorrect });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'L’e-mail du conseiller est incorrect.',
    });
  });

  it('étant donné un id correct quand j’apelle l’API conseiller alors j’ai le conseiller correspondant', async () => {
    // GIVEN
    await viderLesCollections();
    const idCorrect = new ObjectId('62ff549045f8484ff010002f');
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: idCorrect,
      }),
    );
    await app.service('permanences').create(
      permanenceModelFactory({
        _id: new ObjectId('00ff549045f8484ff0100000'),
        conseillers: [idCorrect],
        siret: '48234381100048',
      }),
    );
    await app.service('permanences').create(
      permanenceModelFactory({
        _id: new ObjectId('22ff549045f8484ff0100022'),
        conseillers: [idCorrect],
        siret: '12345678912345',
      }),
    );
    await app.service('structures').create(
      structureModelFactory({
        _id: new ObjectId('11ff549045f8484ff0100011'),
        nom: 'CCAS des HERBIERS',
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: new ObjectId('33ff549045f8484ff0100033'),
        email: 'subordonne1@example.com',
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: new ObjectId('44ff549045f8484ff0100044'),
        email: 'subordonne2@example.com',
      }),
    );
    await app.service('misesEnRelation').create(
      miseEnRelationModelFactory({
        _id: new ObjectId('55ff549045f8484ff0100055'),
        // @ts-expect-error
        conseillerObj: {
          _id: idCorrect,
        },
      }),
    );
    await app.service('conseillersSupprimes').create(
      conseillerSupprimeModelFactory({
        _id: new ObjectId('88ff549045f8484ff0100088'),
        conseiller: {
          _id: idCorrect,
        },
      }),
    );

    // WHEN
    const response = await request(app)
      .get('/coop-mediation/conseillers')
      .query({ id: idCorrect.toString() });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual<ConseillerPourLaCoopMediation[]>([
      {
        _id: '62ff549045f8484ff010002f',
        codeCommune: '14118',
        codeDepartement: '14',
        codePostal: '14000',
        email: 'mailperso@example.com',
        emailPro: 'mailpro@example.com',
        misesEnRelation: [
          {
            dateDebutDeContrat: '2021-05-09T00:00:00.000Z',
            dateFinDeContrat: '2024-05-08T00:00:00.000Z',
            dateRecrutement: '2021-05-09T00:00:00.000Z',
            structureObj: {
              _id: '62ff549045f8484ff010002f',
            },
            typeDeContrat: 'CDD',
          },
        ],
        nom: 'carpentier',
        permanences: [
          {
            _id: '00ff549045f8484ff0100000',
            adresse: {
              codePostal: '13011',
              numeroRue: '4',
              rue: 'Avenue de saint menet',
              ville: 'MARSEILLE',
            },
            conseillers: ['62ff549045f8484ff010002f'],
            conseillersItinerants: [],
            email: 'espoir@example.com',
            estStructure: true,
            horaires: [
              {
                apresMidi: ['Fermé', 'Fermé'],
                matin: ['Fermé', 'Fermé'],
              },
            ],
            lieuPrincipalPour: ['62ff549045f8484ff010002f'],
            location: {
              coordinates: [5.496847, 43.289358],
              type: 'Point',
            },
            nomEnseigne: "Association l'espoir (Groupe SOS)",
            numeroTelephone: '0102030405',
            siret: '48234381100048',
            siteWeb: 'www.conseiller-numerique.gouv.fr',
            structure: '11ff549045f8484ff0100011',
            typeAcces: ['rdv'],
            updatedAt: '2020-05-09T00:00:00.000Z',
            updatedBy: '61c448f6838083d339c294a1',
          },
          {
            _id: '22ff549045f8484ff0100022',
            adresse: {
              codePostal: '13011',
              numeroRue: '4',
              rue: 'Avenue de saint menet',
              ville: 'MARSEILLE',
            },
            conseillers: ['62ff549045f8484ff010002f'],
            conseillersItinerants: [],
            email: 'espoir@example.com',
            estStructure: true,
            horaires: [
              {
                apresMidi: ['Fermé', 'Fermé'],
                matin: ['Fermé', 'Fermé'],
              },
            ],
            lieuPrincipalPour: ['62ff549045f8484ff010002f'],
            location: {
              coordinates: [5.496847, 43.289358],
              type: 'Point',
            },
            nomEnseigne: "Association l'espoir (Groupe SOS)",
            numeroTelephone: '0102030405',
            siret: '12345678912345',
            siteWeb: 'www.conseiller-numerique.gouv.fr',
            structure: '11ff549045f8484ff0100011',
            typeAcces: ['rdv'],
            updatedAt: '2020-05-09T00:00:00.000Z',
            updatedBy: '61c448f6838083d339c294a1',
          },
        ],
        prenom: 'monique',
        statut: 'RECRUTE',
        structure: {
          nom: 'CCAS des HERBIERS',
        },
        subordonnes: [
          {
            _id: '33ff549045f8484ff0100033',
          },
          {
            _id: '44ff549045f8484ff0100044',
          },
        ],
        supprimeLe: '2024-05-08T00:00:00.000Z',
      },
    ]);
  });

  it('étant donné un e-mail correct quand j’apelle l’API conseiller alors j’ai le conseiller correspondant', async () => {
    // GIVEN
    await viderLesCollections();
    const emailCorrect = 'email.correct@example.com';
    const idConseiller = new ObjectId('62ff549045f8484ff010002f');
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: idConseiller,
        email: emailCorrect,
      }),
    );
    await app.service('permanences').create(
      permanenceModelFactory({
        _id: new ObjectId('00ff549045f8484ff0100000'),
        conseillers: [idConseiller],
        siret: '48234381100048',
      }),
    );
    await app.service('permanences').create(
      permanenceModelFactory({
        _id: new ObjectId('22ff549045f8484ff0100022'),
        conseillers: [idConseiller],
        siret: '12345678912345',
      }),
    );
    await app.service('structures').create(
      structureModelFactory({
        _id: new ObjectId('11ff549045f8484ff0100011'),
        nom: 'CCAS des HERBIERS',
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: new ObjectId('33ff549045f8484ff0100033'),
        email: 'subordonne1@example.com',
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: new ObjectId('44ff549045f8484ff0100044'),
        email: 'subordonne2@example.com',
      }),
    );
    await app.service('misesEnRelation').create(
      miseEnRelationModelFactory({
        _id: new ObjectId('55ff549045f8484ff0100055'),
        // @ts-expect-error
        conseillerObj: {
          _id: idConseiller,
        },
      }),
    );
    await app.service('conseillersSupprimes').create(
      conseillerSupprimeModelFactory({
        _id: new ObjectId('88ff549045f8484ff0100088'),
        conseiller: {
          _id: idConseiller,
        },
      }),
    );

    // WHEN
    const response = await request(app)
      .get('/coop-mediation/conseillers')
      .query({ email: emailCorrect });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual<ConseillerPourLaCoopMediation[]>([
      {
        _id: '62ff549045f8484ff010002f',
        codeCommune: '14118',
        codeDepartement: '14',
        codePostal: '14000',
        email: 'email.correct@example.com',
        emailPro: 'mailpro@example.com',
        misesEnRelation: [
          {
            dateDebutDeContrat: '2021-05-09T00:00:00.000Z',
            dateFinDeContrat: '2024-05-08T00:00:00.000Z',
            dateRecrutement: '2021-05-09T00:00:00.000Z',
            structureObj: {
              _id: '62ff549045f8484ff010002f',
            },
            typeDeContrat: 'CDD',
          },
        ],
        nom: 'carpentier',
        permanences: [
          {
            _id: '00ff549045f8484ff0100000',
            adresse: {
              codePostal: '13011',
              numeroRue: '4',
              rue: 'Avenue de saint menet',
              ville: 'MARSEILLE',
            },
            conseillers: ['62ff549045f8484ff010002f'],
            conseillersItinerants: [],
            email: 'espoir@example.com',
            estStructure: true,
            horaires: [
              {
                apresMidi: ['Fermé', 'Fermé'],
                matin: ['Fermé', 'Fermé'],
              },
            ],
            lieuPrincipalPour: ['62ff549045f8484ff010002f'],
            location: {
              coordinates: [5.496847, 43.289358],
              type: 'Point',
            },
            nomEnseigne: "Association l'espoir (Groupe SOS)",
            numeroTelephone: '0102030405',
            siret: '48234381100048',
            siteWeb: 'www.conseiller-numerique.gouv.fr',
            structure: '11ff549045f8484ff0100011',
            typeAcces: ['rdv'],
            updatedAt: '2020-05-09T00:00:00.000Z',
            updatedBy: '61c448f6838083d339c294a1',
          },
          {
            _id: '22ff549045f8484ff0100022',
            adresse: {
              codePostal: '13011',
              numeroRue: '4',
              rue: 'Avenue de saint menet',
              ville: 'MARSEILLE',
            },
            conseillers: ['62ff549045f8484ff010002f'],
            conseillersItinerants: [],
            email: 'espoir@example.com',
            estStructure: true,
            horaires: [
              {
                apresMidi: ['Fermé', 'Fermé'],
                matin: ['Fermé', 'Fermé'],
              },
            ],
            lieuPrincipalPour: ['62ff549045f8484ff010002f'],
            location: {
              coordinates: [5.496847, 43.289358],
              type: 'Point',
            },
            nomEnseigne: "Association l'espoir (Groupe SOS)",
            numeroTelephone: '0102030405',
            siret: '12345678912345',
            siteWeb: 'www.conseiller-numerique.gouv.fr',
            structure: '11ff549045f8484ff0100011',
            typeAcces: ['rdv'],
            updatedAt: '2020-05-09T00:00:00.000Z',
            updatedBy: '61c448f6838083d339c294a1',
          },
        ],
        prenom: 'monique',
        statut: 'RECRUTE',
        structure: {
          nom: 'CCAS des HERBIERS',
        },
        subordonnes: [
          {
            _id: '33ff549045f8484ff0100033',
          },
          {
            _id: '44ff549045f8484ff0100044',
          },
        ],
        supprimeLe: '2024-05-08T00:00:00.000Z',
      },
    ]);
  });

  it('n’ayant aucun filtre quand j’apelle l’API conseiller alors j’ai la première page de tous les conseillers dans l’ordre croissant', async () => {
    // GIVEN
    await viderLesCollections();
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: new ObjectId('66ff549045f8484ff0100066'),
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: new ObjectId('62ff549045f8484ff010002f'),
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: new ObjectId('77ff549045f8484ff0100077'),
      }),
    );

    // WHEN
    const response = await request(app)
      .get('/coop-mediation/conseillers')
      .query({ limit: 2, page: 1 });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]._id).toBe('62ff549045f8484ff010002f');
    expect(response.body[1]._id).toBe('66ff549045f8484ff0100066');
  });

  it('n’ayant aucun filtre quand j’apelle l’API conseiller page 2 alors j’ai la deuxième page de tous les conseillers dans l’ordre croissant', async () => {
    // GIVEN
    await viderLesCollections();
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: new ObjectId('66ff549045f8484ff0100066'),
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: new ObjectId('62ff549045f8484ff010002f'),
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: new ObjectId('77ff549045f8484ff0100077'),
      }),
    );

    // WHEN
    const response = await request(app)
      .get('/coop-mediation/conseillers')
      .query({ limit: 2, page: 2 });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]._id).toBe('77ff549045f8484ff0100077');
  });
});

async function viderLesCollections(): Promise<void> {
  await app.service('conseillers').Model.deleteMany({});
  await app.service('permanences').Model.deleteMany({});
  await app.service('structures').Model.deleteMany({});
  await app.service('misesEnRelation').Model.deleteMany({});
  await app.service('conseillersSupprimes').Model.deleteMany({});
}

function conseillerModelFactory(
  override: Partial<IConseillers> = {},
): Partial<IConseillers> {
  return {
    _id: new ObjectId('62ff549045f8484ff010002f'),
    idPG: 123,
    codeCommune: '14118',
    codeDepartement: '14',
    codePostal: '14000',
    email: 'mailperso@example.com',
    emailPro: 'mailpro@example.com',
    nom: 'carpentier',
    prenom: 'monique',
    statut: 'RECRUTE',
    structureId: new ObjectId('11ff549045f8484ff0100011'),
    coordinateurs: [
      {
        id: new ObjectId('33ff549045f8484ff0100033'),
      },
      {
        id: new ObjectId('44ff549045f8484ff0100044'),
      },
    ],
    ...override,
  };
}

function permanenceModelFactory(
  override: Partial<IPermanences> = {},
): IPermanences {
  return {
    _id: new ObjectId('22ff549045f8484ff0100022'),
    estStructure: true,
    nomEnseigne: "Association l'espoir (Groupe SOS)",
    numeroTelephone: '0102030405',
    email: 'espoir@example.com',
    siteWeb: 'www.conseiller-numerique.gouv.fr',
    siret: '12345678912345',
    adresse: {
      numeroRue: '4',
      rue: 'Avenue de saint menet',
      codePostal: '13011',
      ville: 'MARSEILLE',
    },
    location: {
      type: 'Point',
      coordinates: [5.496847, 43.289358],
    },
    horaires: [
      {
        matin: ['Fermé', 'Fermé'],
        apresMidi: ['Fermé', 'Fermé'],
      },
    ],
    typeAcces: ['rdv'],
    conseillers: [new ObjectId('62ff549045f8484ff010002f')],
    lieuPrincipalPour: [new ObjectId('62ff549045f8484ff010002f')],
    conseillersItinerants: [],
    structure: new DBRef(
      'structure',
      new ObjectId('11ff549045f8484ff0100011'),
      'test',
    ),
    updatedAt: new Date('2020-05-09'),
    updatedBy: new ObjectId('61c448f6838083d339c294a1'),
    ...override,
  };
}

function structureModelFactory(
  override: Partial<IStructures> = {},
): Partial<IStructures> {
  return {
    _id: new ObjectId('11ff549045f8484ff0100011'),
    nom: 'CCAS des HERBIERS',
    ...override,
  };
}

function miseEnRelationModelFactory(
  override: Partial<IMisesEnRelation> = {},
): Partial<IMisesEnRelation> {
  return {
    _id: new ObjectId('56ff549045f8484ff0100056'),
    // @ts-expect-error
    conseillerObj: {
      _id: new ObjectId('62ff549045f8484ff010002f'),
    },
    // @ts-expect-error
    structureObj: {
      _id: new ObjectId('62ff549045f8484ff010002f'),
    },
    dateRecrutement: new Date('2021-05-09'),
    dateDebutDeContrat: new Date('2021-05-09'),
    dateFinDeContrat: new Date('2024-05-08'),
    typeDeContrat: 'CDD',
    ...override,
  };
}

function conseillerSupprimeModelFactory(
  override: Partial<IConseillersSupprimes> = {},
): Partial<IConseillersSupprimes> {
  return {
    _id: new ObjectId('11ff549045f8484ff0100011'),
    deletedAt: new Date('2024-05-08'),
    conseiller: {
      _id: new ObjectId('62ff549045f8484ff010002f'),
    },
    ...override,
  };
}
