import axios from 'axios';
import { DBRef, ObjectId } from 'mongodb';
import { describe, expect, it } from 'vitest';
import { viderLesCollections, host } from '../../../tests/utils';

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
  it('étant donné une limite incorrecte quand j’apelle l’API conseiller alors j’ai un message d’erreur', async () => {
    // GIVEN
    await viderLesCollections(app);
    const limiteIncorrecte = 'limiteIncorrecte';

    // WHEN
    const response = await axios({
      url: `${host}/coop-mediation/conseillers`,
      params: { limit: limiteIncorrecte },
      validateStatus: (status) => status < 500,
    });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
      message: 'La limite est incorrecte.',
    });
  });

  it('étant donné une pagination incorrecte quand j’apelle l’API conseiller alors j’ai un message d’erreur', async () => {
    // GIVEN
    await viderLesCollections(app);
    const paginationIncorrecte = 'pageIncorrecte';

    // WHEN
    const response = await axios({
      url: `${host}/coop-mediation/conseillers`,
      params: { page: paginationIncorrecte },
      validateStatus: (status) => status < 500,
    });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
      message: 'La pagination est incorrecte.',
    });
  });

  it('étant donné un id incorrect quand j’apelle l’API conseiller alors j’ai un message d’erreur', async () => {
    // GIVEN
    await viderLesCollections(app);
    const idIncorrect = 999;

    // WHEN
    const response = await axios({
      url: `${host}/coop-mediation/conseillers`,
      params: { id: idIncorrect },
      validateStatus: (status) => status < 500,
    });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
      message: 'L’identifiant du conseiller est incorrect. (id)',
    });
  });

  it('étant donné un e-mail incorrect quand j’apelle l’API conseiller alors j’ai un message d’erreur', async () => {
    // GIVEN
    await viderLesCollections(app);
    const emailIncorrect = 'email.incorrect@example.com';

    // WHEN
    const response = await axios({
      url: `${host}/coop-mediation/conseillers`,
      params: { email: emailIncorrect },
      validateStatus: (status) => status < 500,
    });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
      message: 'L’e-mail du conseiller est incorrect. (email)',
    });
  });

  it('étant donné un id correct quand j’apelle l’API conseiller alors j’ai le conseiller recruté correspondant', async () => {
    // GIVEN
    await viderLesCollections(app);
    const id = new ObjectId('62ff549045f8484ff010002f');
    const idPgCorrect = 123;
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: id,
        idPG: idPgCorrect,
        statut: 'RECRUTE',
      }),
    );
    await app.service('permanences').create(
      permanenceModelFactory({
        _id: new ObjectId('00ff549045f8484ff0100000'),
        conseillers: [id],
        siret: '48234381100048',
      }),
    );
    await app.service('permanences').create(
      permanenceModelFactory({
        _id: new ObjectId('22ff549045f8484ff0100022'),
        conseillers: [id],
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
        idPG: 234,
        email: 'subordonne1@example.com',
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: new ObjectId('44ff549045f8484ff0100044'),
        idPG: 456,
        email: 'subordonne2@example.com',
      }),
    );
    await app.service('misesEnRelation').create(
      miseEnRelationModelFactory({
        _id: new ObjectId('55ff549045f8484ff0100055'),
        // @ts-expect-error
        conseillerObj: {
          _id: id,
        },
      }),
    );
    await app.service('conseillersSupprimes').create(
      conseillerSupprimeModelFactory({
        _id: new ObjectId('88ff549045f8484ff0100088'),
        conseiller: {
          _id: id,
        },
      }),
    );

    // WHEN
    const response = await axios({
      url: `${host}/coop-mediation/conseillers`,
      params: { id: idPgCorrect },
    });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.data).toStrictEqual<ConseillerPourLaCoopMediation[]>([
      {
        idPG: 123,
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
            statut: 'finalisee',
            structureObj: {
              idPG: 123,
              nom: 'Ville de Chambéry / La Dynam',
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
          _id: '11ff549045f8484ff0100011',
          coselec: [],
          nom: 'CCAS des HERBIERS',
          qpvListe: [],
        },
        subordonnes: [
          {
            idPG: 234,
          },
          {
            idPG: 456,
          },
        ],
      },
    ]);
  });

  it('étant donné un e-mail correct quand j’apelle l’API conseiller alors j’ai le conseiller recruté correspondant', async () => {
    // GIVEN
    await viderLesCollections(app);
    const emailCorrect = 'email.correct@example.com';
    const idConseiller = new ObjectId('62ff549045f8484ff010002f');
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: idConseiller,
        email: emailCorrect,
        statut: 'RECRUTE',
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
        idPG: 234,
        email: 'subordonne1@example.com',
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: new ObjectId('44ff549045f8484ff0100044'),
        idPG: 456,
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
    const response = await axios({
      url: `${host}/coop-mediation/conseillers`,
      params: { email: emailCorrect },
    });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.data).toStrictEqual<ConseillerPourLaCoopMediation[]>([
      {
        idPG: 123,
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
            statut: 'finalisee',
            structureObj: {
              idPG: 123,
              nom: 'Ville de Chambéry / La Dynam',
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
          _id: '11ff549045f8484ff0100011',
          coselec: [],
          nom: 'CCAS des HERBIERS',
          qpvListe: [],
        },
        subordonnes: [
          {
            idPG: 234,
          },
          {
            idPG: 456,
          },
        ],
      },
    ]);
  });

  it('n’ayant aucun filtre quand j’apelle l’API conseiller alors j’ai la première page de tous les conseillers recrutés dans l’ordre croissant', async () => {
    // GIVEN
    await viderLesCollections(app);
    const conseillerEnRupture = new ObjectId('11ff549045f8484ff0100012');
    const conseillerRecruteHorsPagination = new ObjectId(
      '99ff549045f8484ff0100099',
    );
    const conseillerRecruteEtRenouveller = new ObjectId(
      '62ff549045f8484ff010002f',
    );
    const conseillerRecruteAvecUneDemandeDeRupture = new ObjectId(
      '66ff549045f8484ff0100066',
    );
    const conseillerRecruteAvecUneRuptureFinalisee = new ObjectId(
      '77ff549045f8484ff0100077',
    );
    const conseillerRecrute = new ObjectId('88ff549045f8484ff0100088');
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: conseillerEnRupture,
        idPG: 123,
        statut: 'RUPTURE',
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: conseillerRecruteHorsPagination,
        idPG: 678,
        statut: 'RECRUTE',
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: conseillerRecruteEtRenouveller,
        idPG: 345,
        statut: 'RECRUTE',
      }),
    );
    await app.service('misesEnRelation').create(
      miseEnRelationModelFactory({
        _id: new ObjectId('55ff549045f8484ff0100088'),
        // @ts-expect-error
        conseillerObj: {
          _id: conseillerRecruteEtRenouveller,
        },
        statut: 'terminee',
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: conseillerRecruteAvecUneDemandeDeRupture,
        idPG: 234,
        statut: 'RECRUTE',
      }),
    );
    await app.service('misesEnRelation').create(
      miseEnRelationModelFactory({
        _id: new ObjectId('55ff549045f8484ff0100055'),
        // @ts-expect-error
        conseillerObj: {
          _id: conseillerRecruteAvecUneDemandeDeRupture,
        },
        statut: 'nouvelle_rupture',
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: conseillerRecruteAvecUneRuptureFinalisee,
        idPG: 456,
        statut: 'RECRUTE',
      }),
    );
    await app.service('misesEnRelation').create(
      miseEnRelationModelFactory({
        _id: new ObjectId('55ff549045f8484ff0100066'),
        // @ts-expect-error
        conseillerObj: {
          _id: conseillerRecruteAvecUneRuptureFinalisee,
        },
        statut: 'finalisee_rupture',
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: conseillerRecrute,
        idPG: 567,
        statut: 'RECRUTE',
      }),
    );
    await app.service('misesEnRelation').create(
      miseEnRelationModelFactory({
        _id: new ObjectId('55ff549045f8484ff0100077'),
        // @ts-expect-error
        conseillerObj: {
          _id: conseillerRecrute,
        },
        statut: 'finalisee',
      }),
    );

    // WHEN
    const response = await axios({
      url: `${host}/coop-mediation/conseillers`,
      params: { limit: 4, page: 1 },
    });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(4);
    expect(response.data[0].idPG).toBe(234);
    expect(response.data[1].idPG).toBe(345);
    expect(response.data[2].idPG).toBe(456);
    expect(response.data[3].idPG).toBe(567);
  });

  it('n’ayant aucun filtre quand j’apelle l’API conseiller page 2 alors j’ai la deuxième page de tous les conseillers recrutés dans l’ordre croissant', async () => {
    // GIVEN
    await viderLesCollections(app);
    const conseillerEnRupture = new ObjectId('11ff549045f8484ff0100012');
    const conseillerRecruteHorsPagination = new ObjectId(
      '99ff549045f8484ff0100099',
    );
    const conseillerRecruteEtRenouveller = new ObjectId(
      '62ff549045f8484ff010002f',
    );
    const conseillerRecruteAvecUneDemandeDeRupture = new ObjectId(
      '66ff549045f8484ff0100066',
    );
    const conseillerRecruteAvecUneRuptureFinalisee = new ObjectId(
      '77ff549045f8484ff0100077',
    );
    const conseillerRecrute = new ObjectId('88ff549045f8484ff0100088');
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: conseillerEnRupture,
        idPG: 123,
        statut: 'RUPTURE',
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: conseillerRecruteHorsPagination,
        idPG: 678,
        statut: 'RECRUTE',
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: conseillerRecruteEtRenouveller,
        idPG: 345,
        statut: 'RECRUTE',
      }),
    );
    await app.service('misesEnRelation').create(
      miseEnRelationModelFactory({
        _id: new ObjectId('55ff549045f8484ff0100088'),
        // @ts-expect-error
        conseillerObj: {
          _id: conseillerRecruteEtRenouveller,
        },
        statut: 'terminee',
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: conseillerRecruteAvecUneDemandeDeRupture,
        idPG: 234,
        statut: 'RECRUTE',
      }),
    );
    await app.service('misesEnRelation').create(
      miseEnRelationModelFactory({
        _id: new ObjectId('55ff549045f8484ff0100055'),
        // @ts-expect-error
        conseillerObj: {
          _id: conseillerRecruteAvecUneDemandeDeRupture,
        },
        statut: 'nouvelle_rupture',
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: conseillerRecruteAvecUneRuptureFinalisee,
        idPG: 456,
        statut: 'RECRUTE',
      }),
    );
    await app.service('misesEnRelation').create(
      miseEnRelationModelFactory({
        _id: new ObjectId('55ff549045f8484ff0100066'),
        // @ts-expect-error
        conseillerObj: {
          _id: conseillerRecruteAvecUneRuptureFinalisee,
        },
        statut: 'finalisee_rupture',
      }),
    );
    await app.service('conseillers').create(
      conseillerModelFactory({
        _id: conseillerRecrute,
        idPG: 567,
        statut: 'RECRUTE',
      }),
    );
    await app.service('misesEnRelation').create(
      miseEnRelationModelFactory({
        _id: new ObjectId('55ff549045f8484ff0100077'),
        // @ts-expect-error
        conseillerObj: {
          _id: conseillerRecrute,
        },
        statut: 'finalisee',
      }),
    );

    // WHEN
    const response = await axios({
      url: `${host}/coop-mediation/conseillers`,
      params: { limit: 4, page: 2 },
    });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(1);
    expect(response.data[0].idPG).toBe(678);
  });
});

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
    statut: 'finalisee',
    // @ts-expect-error
    structureObj: {
      _id: new ObjectId('62ff549045f8484ff010002f'),
      idPG: 123,
      nom: 'Ville de Chambéry / La Dynam',
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
