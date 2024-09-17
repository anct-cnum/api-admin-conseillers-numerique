import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  viderLesCollections,
  requetePost,
  InitialisationDate,
} from '../../../tests/utils';
import request from 'supertest';
import axios from 'axios';

import app from '../../../app';
import {
  construireConseiller,
  envoyerConfirmationParMail,
} from './creerCandidatureConseiller';

const champsObligatoires = {
  prenom: 'Jean',
  nom: 'Martin',
  email: 'jean.martin@example.com',
  nomCommune: 'Paris',
  codePostal: '75001',
  codeCommune: '75000',
  codeDepartement: '75',
  codeRegion: '75',
  codeCom: null,
  location: {
    type: 'Point',
    coordinates: [0, 0],
  },
  aUneExperienceMedNum: false,
  dateDisponibilite: new Date(3024, 8, 1, 13),
  distanceMax: 5,
  motivation: 'Ma motivation',
  telephone: '',
  estDemandeurEmploi: true,
  estEnEmploi: false,
  estEnFormation: false,
  estDiplomeMedNum: false,
  nomDiplomeMedNum: '',
  'h-captcha-response': 'captcha',
};

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('recevoir et valider une candidature conseiller', () => {
  beforeEach(async () => {
    await viderLesCollections(app);
    mockedAxios.post.mockResolvedValue({
      data: { success: true },
    });
  });

  it('si j’envoie un formulaire avec tous les champs obligatoires alors il est validé', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
    };
    // WHEN
    const response = await request(app)
      .post('/candidature-conseiller')
      .send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.body.aUneExperienceMedNum).toBe(false);
    expect(response.body.codeCommune).toBe('75000');
    expect(response.body.codeDepartement).toBe('75');
    expect(response.body.codePostal).toBe('75001');
    expect(response.body.codeRegion).toBe('75');
    expect(response.body.codeCom).toBe(null);
    expect(response.body.dateDisponibilite).toBe('3024-09-01T11:00:00.000Z');
    expect(response.body.distanceMax).toBe(5);
    expect(response.body.email).toBe('jean.martin@example.com');
    expect(response.body.idPG).toBe(1);
    expect(response.body.location).toStrictEqual({
      coordinates: [0, 0],
      type: 'Point',
    });
    expect(response.body.motivation).toBe('Ma motivation');
    expect(response.body.nom).toBe('Martin');
    expect(response.body.nomCommune).toBe('Paris');
    expect(response.body.prenom).toBe('Jean');
    expect(response.body.userCreated).toBe(false);
    expect(response.body.estDemandeurEmploi).toBe(true);
    expect(response.body.estEnEmploi).toBe(false);
    expect(response.body.estEnFormation).toBe(false);
    expect(response.body.estDiplomeMedNum).toBe(false);
    expect(response.body.nomDiplomeMedNum).toBe('');
  });

  it('si j’envoie un formulaire avec tous les champs possibles alors il est validé', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      telephone: '+33123456789',
      codeCom: '75',
      estDemandeurEmploi: true,
      estEnEmploi: true,
      estEnFormation: true,
      estDiplomeMedNum: true,
      nomDiplomeMedNum: 'Diplome',
    };

    // WHEN
    const response = await request(app)
      .post('/candidature-conseiller')
      .send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.body.aUneExperienceMedNum).toBe(false);
    expect(response.body.codeCommune).toBe('75000');
    expect(response.body.codeDepartement).toBe('75');
    expect(response.body.codePostal).toBe('75001');
    expect(response.body.codeRegion).toBe('75');
    expect(response.body.dateDisponibilite).toBe('3024-09-01T11:00:00.000Z');
    expect(response.body.distanceMax).toBe(5);
    expect(response.body.email).toBe('jean.martin@example.com');
    expect(response.body.idPG).toBe(1);
    expect(response.body.location).toStrictEqual({
      coordinates: [0, 0],
      type: 'Point',
    });
    expect(response.data.motivation).toBe('Ma motivation');
    expect(response.data.nom).toBe('Martin');
    expect(response.data.nomCommune).toBe('Paris');
    expect(response.data.prenom).toBe('Jean');
    expect(response.data.userCreated).toBe(false);
    expect(response.data.telephone).toBe('+33123456789');
    expect(response.data.codeCom).toBe('75');
    expect(response.data.estDemandeurEmploi).toBe(true);
    expect(response.data.estEnEmploi).toBe(true);
    expect(response.data.estEnFormation).toBe(true);
    expect(response.data.estDiplomeMedNum).toBe(true);
    expect(response.data.nomDiplomeMedNum).toBe('Diplome');
    expect(response.data.disponible).toBe(true);
    expect(response.data.emailConfirmedAt).toBe(null);
    expect(response.data.emailConfirmationKey).toBe(undefined);
  });

  it('si jenvoie un formulaire alors je reçois un mail de confirmation', async () => {
    // GIVEN
    const createUtilisateur = await construireConseiller(
      app,
      champsObligatoires,
    );

    // WHEN
    const result = await app.service('conseillers').create(createUtilisateur);
    const envoiMail = await envoyerConfirmationParMail(
      app,
      result.email,
      result.prenom,
      result.emailConfirmationKey,
    );

    // THEN
    expect(envoiMail.response).toBe('250 2.0.0 Ok: queued');
    expect(envoiMail.accepted[0]).toBe('jean.martin@example.com');
  });

  it('si j’envoie un formulaire avec un email invalide alors j’ai une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      email: 'abc',
    };

    // WHEN
    const response = await request(app)
      .post('/candidature-conseiller')
      .send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'L’adresse e-mail est invalide',
    });
  });

  it('si j’envoie un formulaire avec un numéro de téléphone invalide alors j’ai une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      telephone: 'abc',
    };

    // WHEN
    const response = await request(app)
      .post('/candidature-conseiller')
      .send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'Le numéro de téléphone est invalide',
    });
  });

  it.each([33, 590, 596, 594, 262, 269, 687])(
    'si j’envoie un formulaire avec un numéro de téléphone qui commence par +%d alors il est validé',
    async (debutTelephone) => {
      // GIVEN
      const envoiUtilisateur = {
        ...champsObligatoires,
        telephone: '+' + debutTelephone + '611223344',
      };

      // WHEN
      const response = await request(app)
        .post('/candidature-conseiller')
        .send(envoiUtilisateur);

      // THEN
      expect(response.headers['content-type']).toBe(
        'application/json; charset=utf-8',
      );
      expect(response.status).toBe(200);
      expect(response.body.telephone).toBe('+' + debutTelephone + '611223344');
    },
  );

  it('si j’envoie un formulaire avec un code postal invalide alors j’ai une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      codePostal: '123',
    };

    // WHEN
    const response = await request(app)
      .post('/candidature-conseiller')
      .send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'Le code postal est invalide',
    });
  });

  it('si j’envoie un formulaire avec un code commune invalide alors j’ai une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      codeCommune: '123',
    };

    // WHEN
    const response = await request(app)
      .post('/candidature-conseiller')
      .send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'Le code commune est invalide',
    });
  });

  it('si j’envoie un formulaire avec une date disponibilité inférieure à la date du jour alors j’ai une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      dateDisponibilite: '2024-01-01T00:00:00.000Z',
    };

    // WHEN
    const response = await request(app)
      .post('/candidature-conseiller')
      .send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'La date doit être supérieure ou égale à la date du jour',
    });
  });

  it('si j’envoie un formulaire avec aucune situation renseignée alors j’ai une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      estDemandeurEmploi: false,
      estEnEmploi: false,
      estEnFormation: false,
      estDiplomeMedNum: false,
      nomDiplomeMedNum: '',
      aUneExperienceMedNum: false,
    };

    // WHEN
    const response = await request(app)
      .post('/candidature-conseiller')
      .send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'L’experience médiateur numérique est requise',
    });
  });

  it('si j’envoie un formulaire avec une expérience renseignée Mednum et que je nai pas de nom renseigné alors j’ai une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      estDemandeurEmploi: false,
      estEnEmploi: false,
      estEnFormation: false,
      estDiplomeMedNum: true,
      nomDiplomeMedNum: '',
      aUneExperienceMedNum: false,
    };

    // WHEN
    const response = await request(app)
      .post('/candidature-conseiller')
      .send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'Le nom du diplôme est requis',
    });
  });

  it('si j’envoie un formulaire avec une distance max invalide alors j’ai une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      distanceMax: 3,
    };

    // WHEN
    const response = await request(app)
      .post('/candidature-conseiller')
      .send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'La distance est invalide',
    });
  });

  it('si j’envoie un formulaire avec un e-mail déjà existant alors j’ai une erreur', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
    };
    await requetePost('/candidature-conseiller', envoiUtilisateur);

    // WHEN
    await request(app).post('/candidature-conseiller').send(envoiUtilisateur);
    const response = await request(app)
      .post('/candidature-conseiller')
      .send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'L’email est déjà utilisé',
    });
  });

  it.each([
    {
      testKey: 'prenom',
      key: { prenom: undefined },
      error: 'Le prénom est requis',
    },
    {
      testKey: 'nom',
      key: { nom: undefined },
      error: 'Le nom est requis',
    },
    {
      testKey: 'email',
      key: { email: undefined },
      error: 'L’adresse e-mail est invalide',
    },
    {
      testKey: 'nomCommune',
      key: { nomCommune: undefined },
      error: 'La ville est requise',
    },
    {
      testKey: 'codePostal',
      key: { codePostal: undefined },
      error: 'Le code postal est invalide',
    },
    {
      testKey: 'codeCommune',
      key: { codeCommune: undefined },
      error: 'Le code commune est invalide',
    },
    {
      testKey: 'codeDepartement',
      key: { codeDepartement: undefined },
      error: 'Le code département est requis',
    },
    {
      testKey: 'codeRegion',
      key: { codeRegion: undefined },
      error: 'Le code région est requis',
    },
    {
      testKey: 'location',
      key: {
        location: undefined,
      },
      error: 'La localisation est requise',
    },
    {
      testKey: 'location.type',
      key: {
        location: { ...champsObligatoires.location, type: undefined },
      },
      error: 'Le type est invalide',
    },
    {
      testKey: 'location.coordinates',
      key: {
        location: { ...champsObligatoires.location, coordinates: undefined },
      },
      error: 'Les coordonées sont invalides',
    },
    {
      testKey: 'estDemandeurEmploi',
      key: { estDemandeurEmploi: undefined },
      error: 'L’experience médiateur numérique est requise',
    },
    {
      testKey: 'estEnEmploi',
      key: { estEnEmploi: undefined },
      error: '"estEnEmploi" is required',
    },
    {
      testKey: 'estEnFormation',
      key: { estEnFormation: undefined },
      error: '"estEnFormation" is required',
    },
    {
      testKey: 'estDiplomeMedNum',
      key: { estDiplomeMedNum: undefined },
      error: '"estDiplomeMedNum" is required',
    },
    {
      testKey: 'nomDiplomeMedNum',
      key: { estDiplomeMedNum: true, nomDiplomeMedNum: undefined },
      error: 'Le nom du diplôme est requis',
    },
    {
      testKey: 'aUneExperienceMedNum',
      key: { aUneExperienceMedNum: undefined },
      error: '"aUneExperienceMedNum" is required',
    },
    {
      testKey: 'dateDisponibilite',
      key: { dateDisponibilite: undefined },
      error: 'La date est requise',
    },
    {
      testKey: 'distanceMax',
      key: { distanceMax: undefined },
      error: 'La distance est invalide',
    },
    {
      testKey: 'motivation',
      key: { motivation: undefined },
      error: 'La motivation est requise',
    },
    {
      testKey: 'h-captcha-response',
      key: { 'h-captcha-response': undefined },
      error: 'Le captcha est obligatoire',
    },
  ])(
    'si j’envoie un formulaire avec la clé $testKey égale à undefined alors j’ai une erreur',
    async ({ key, error }) => {
      // GIVEN
      const envoiUtilisateur = {
        ...champsObligatoires,
        ...key,
      };

      // WHEN
      const response = await request(app)
        .post('/candidature-conseiller')
        .send(envoiUtilisateur);

      // THEN
      expect(response.headers['content-type']).toBe(
        'application/json; charset=utf-8',
      );
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        message: error,
      });
    },
  );

  it.each([
    {
      testKey: 'contact.telephone',
      key: { telephone: '' },
      result: '',
    },
    {
      testKey: 'contact.telephone',
      key: { telephone: null },
      result: null,
    },
  ])(
    'si j’envoie un formulaire avec la clé optionnel $testKey égale à $result alors j’ai pas d’erreur de validation',
    async ({ key, result }) => {
      // GIVEN
      const envoiUtilisateur = {
        ...champsObligatoires,
        ...key,
      };

      // WHEN
      const response = await request(app)
        .post('/candidature-conseiller')
        .send(envoiUtilisateur);

      // THEN
      expect(response.headers['content-type']).toBe(
        'application/json; charset=utf-8',
      );
      expect(response.status).toBe(200);
      expect(response.body.telephone).toBe(result);
    },
  );

  it('si j’envoie un formulaire avec une motivation à plus de 2500 caractères alors j’ai une erreur de validation', async () => {
    // GIVEN
    const lettreA = 'a';
    const envoiUtilisateur = {
      ...champsObligatoires,
      motivation: lettreA.repeat(2501),
    };

    // WHEN
    const response = await request(app)
      .post('/candidature-conseiller')
      .send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'La motivation ne doit pas dépasser 2500 caractères',
    });
  });

  it('si j’envoie un formulaire avec une motivation strictement égale à 2500 caractères alors alors il est validé', async () => {
    // GIVEN
    const lettreA = 'a';
    const motivation = lettreA.repeat(2500);
    const envoiUtilisateur = {
      ...champsObligatoires,
      motivation,
    };

    // WHEN
    const response = await request(app)
      .post('/candidature-conseiller')
      .send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.body.motivation).toBe(motivation);
  });

  it('si j’envoie un formulaire valide avec un captcha incorrect alors il y a une erreur de validation', async () => {
    // GIVEN
    mockedAxios.post.mockResolvedValue({
      data: { success: false },
    });
    const envoiUtilisateur = {
      ...champsObligatoires,
      'h-captcha-response': 'captcha-incorrect',
    };

    // WHEN
    const response = await request(app)
      .post('/candidature-conseiller')
      .send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
  });
});
