import request from "supertest";
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { viderLesCollections } from '../../../tests/utils';
import axios from "axios"
import nodemailer from 'nodemailer';

import app from '../../../app';
const champsObligatoires = {
  type: 'PRIVATE',
  nom: 'MAIRIE',
  siret: '12345678910',
  ridet: null,
  contact: {
    prenom: 'camélien',
    nom: 'rousseau',
    fonction: 'PRESIDENTE',
    email: 'camlien_rousseau74@example.net',
    telephone: '+33751756469',
  },
  nomCommune: 'Paris',
  codePostal: '75001',
  codeCommune: '75000',
  codeDepartement: '75',
  codeRegion: '75',
  codeCom: '',
  location: {
    type: 'Point',
    coordinates: [0, 0],
  },
  dateDebutMission: new Date(3024, 8, 1, 13),
  aIdentifieCoordinateur: true,
  coordinateurTypeContrat: 'PT',
  motivation: 'Je suis motivé.',
  confirmationEngagement: true,
  "h-captcha-response": "captcha"
};

vi.mock("axios")
const mockedAxios = vi.mocked(axios, true);
const mockSendMail = vi.fn();

describe('recevoir et valider une candidature structure coordinateur', () => {
  beforeEach(async () => {
    await viderLesCollections(app);
    mockedAxios.post.mockResolvedValue({
      data: { success: true },
    });
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail: mockSendMail, use: vi.fn() });
  });

  it('si j’envoie un formulaire avec tous les champs obligatoires alors il est validé', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
    };
    // WHEN
    const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.body.nom).toBe('MAIRIE');
    expect(response.body.siret).toBe('12345678910');
    expect(response.body.ridet).toBe(null);
    expect(response.body.dateDebutMission).toBe('3024-09-01T11:00:00.000Z');
    expect(response.body.contact.prenom).toBe('camélien');
    expect(response.body.contact.nom).toBe('rousseau');
    expect(response.body.contact.fonction).toBe('PRESIDENTE');
    expect(response.body.contact.email).toBe('camlien_rousseau74@example.net');
    expect(response.body.contact.telephone).toBe('+33751756469');
    expect(response.body.codeCommune).toBe('75000');
    expect(response.body.codeDepartement).toBe('75');
    expect(response.body.codePostal).toBe('75001');
    expect(response.body.codeRegion).toBe('75');
    expect(response.body.codeCom).toBe('');
    expect(response.body.location).toStrictEqual({
      coordinates: [0, 0],
      type: 'Point',
    });
    expect(response.body.aIdentifieCoordinateur).toBe(true);
    expect(response.body.coordinateurTypeContrat).toBe('PT');
    expect(response.body.motivation).toBe('Je suis motivé.');
    expect(response.body.confirmationEngagement).toBe(true);
  });

  it('si j’envoie la totalité des champs possibles avec les champs ajouté par default alors il est validé', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
    };

    // WHEN
    const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.body.nom).toBe('MAIRIE');
    expect(response.body.siret).toBe('12345678910');
    expect(response.body.ridet).toBe(null);
    expect(response.body.dateDebutMission).toBe('3024-09-01T11:00:00.000Z');
    expect(response.body.contact.prenom).toBe('camélien');
    expect(response.body.contact.nom).toBe('rousseau');
    expect(response.body.contact.fonction).toBe('PRESIDENTE');
    expect(response.body.contact.email).toBe('camlien_rousseau74@example.net');
    expect(response.body.contact.telephone).toBe('+33751756469');
    expect(response.body.codeCommune).toBe('75000');
    expect(response.body.codeDepartement).toBe('75');
    expect(response.body.codePostal).toBe('75001');
    expect(response.body.codeRegion).toBe('75');
    expect(response.body.codeCom).toBe('');
    expect(response.body.location).toStrictEqual({
      coordinates: [0, 0],
      type: 'Point',
    });
    expect(response.body.aIdentifieCoordinateur).toBe(true);
    expect(response.body.coordinateurTypeContrat).toBe('PT');
    expect(response.body.motivation).toBe('Je suis motivé.');
    expect(response.body.confirmationEngagement).toBe(true);
    expect(response.body.idPG).toBe(1);
    expect(response.body.userCreated).toBe(false);
    expect(response.body.statut).toBe('CREEE');
    expect(response.body.estLabelliseFranceServices).toBe('NON');
    expect(response.body.estZRR).toBe(null);
    expect(response.body.prefet).toStrictEqual([]);
    expect(response.body.coselec).toStrictEqual([]);
    expect(response.body.coordinateurCandidature).toStrictEqual(true);
    expect(response.body.coordinateurTypeContrat).toStrictEqual('PT');
    expect(response.body.nombreConseillersSouhaites).toBe(1);
    expect(response.body.aIdentifieCandidat).toBe(false);
    expect(response.body.emailConfirmationKey).toBe(undefined);
  });

  it('si j’envoie un formulaire alors je reçois un mail de confirmation en tant que structure coordinateur', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
    };

    // WHEN
    await request(app)
      .post('/candidature-structure-coordinateur')
      .send(envoiUtilisateur);

    // THEN
    expect(mockSendMail).toHaveBeenCalledWith({
      from: expect.anything(),
      html: expect.anything(),
      list: expect.anything(),
      replyTo: expect.anything(),
      subject: "Candidature pour un poste de coordinateur",
      to: "camlien_rousseau74@example.net"
    });
  });

  it('si j’envoie un formulaire sans SIRET mais avec un RIDET alors il n’y a pas d’erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      siret: null,
      ridet: '1234567',
    };

    // WHEN
    const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.body.siret).toBe(null);
    expect(response.body.ridet).toBe('1234567');
  });

  it('si j’envoie un formulaire sans SIRET mais avec un RIDET contenant des espaces, enregistrement en BDD sans espace et aucune erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      siret: null,
      ridet: '12 345 67',
    };

    // WHEN
    const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.body.siret).toBe(null);
    expect(response.body.ridet).toBe('1234567');
  });

  it('si j’envoie un formulaire sans RIDET mais avec un SIRET contenant des espaces, enregistrement en BDD sans espace et aucune erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      siret: '12 345 67',
      ridet: null,
    };

    // WHEN
    const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.body.ridet).toBe(null);
    expect(response.body.siret).toBe('1234567');
  });

  it('si j’envoie un formulaire avec confirmation des engagements à false alors il y a une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      confirmationEngagement: false,
    };

    // WHEN
    const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'La confirmation d’engagement est requise',
    });
  });

  it('si j’envoie un formulaire avec un siret déjà existant alors il y a une erreur', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
    };

    // WHEN
    await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);
    const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'Vous êtes déjà inscrit : SIRET/RIDET déjà utilisé',
    });
  });

  it('si j’envoie un formulaire avec un ridet déjà existant alors il y a une erreur', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      siret: null,
      ridet: '123',
    };
    await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

    // WHEN
    const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'Vous êtes déjà inscrit : SIRET/RIDET déjà utilisé',
    });
  });

  it.each([33, 590, 596, 594, 262, 269, 687])(
    'si j’envoie un formulaire avec un numéro de téléphone qui commence par +%d alors il est validé',
    async (debutTelephone) => {
      // GIVEN
      const envoiUtilisateur = {
        ...champsObligatoires,
        contact: {
          ...champsObligatoires.contact,
          telephone: '+' + debutTelephone + '611223344',
        },
      };

      // WHEN
      const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

      // THEN
      expect(response.headers['content-type']).toBe(
        'application/json; charset=utf-8',
      );
      expect(response.status).toBe(200);
      expect(response.body.contact.telephone).toBe(
        '+' + debutTelephone + '611223344',
      );
    },
  );

  it.each([
    {
      testKey: 'type',
      key: { type: undefined },
      error: 'Le type est invalide',
      ignored: true,
    },
    {
      testKey: 'nom',
      key: { nom: undefined },
      error: 'Le nom est requis',
    },
    {
      testKey: 'siret',
      key: { siret: undefined },
      error: 'Le siret est requis',
    },
    {
      testKey: 'ridet',
      key: { siret: null, ridet: undefined },
      error: 'Le siret ou le ridet est requis',
    },
    {
      testKey: 'dateDebutMission',
      key: { dateDebutMission: undefined },
      error: 'La date de début mission est requise',
    },
    {
      testKey: 'contact',
      key: { contact: undefined },
      error: 'Le contact est requis',
    },
    {
      testKey: 'contact.prenom',
      key: { contact: { ...champsObligatoires.contact, prenom: undefined } },
      error: 'Le prénom est requis',
    },
    {
      testKey: 'contact.nom',
      key: { contact: { ...champsObligatoires.contact, nom: undefined } },
      error: 'Le nom est requis',
    },
    {
      testKey: 'contact.fonction',
      key: { contact: { ...champsObligatoires.contact, fonction: undefined } },
      error: 'La fonction est requise',
    },
    {
      testKey: 'contact.email',
      key: { contact: { ...champsObligatoires.contact, email: undefined } },
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
      testKey: 'codeCom',
      key: { codeCom: undefined },
      error: 'Le codeCom est invalide',
    },
    {
      testKey: 'location',
      key: { location: undefined },
      error: 'La localisation est requise',
    },
    {
      testKey: 'location.type',
      key: {
        location: { ...champsObligatoires.location, type: undefined },
      },
      error: 'Le type est invalide',
      ignored: true,
    },
    {
      testKey: 'location.coordinates',
      key: {
        location: { ...champsObligatoires.location, coordinates: undefined },
      },
      error: 'Les coordonées sont invalide',
    },
    {
      testKey: 'motivation',
      key: {
        motivation: undefined,
      },
      error: 'La motivation est requise',
    },
    {
      testKey: 'confirmationEngagement',
      key: {
        confirmationEngagement: undefined,
      },
      error: 'La confirmation d’engagement est requise',
    },
    {
      testKey: 'aIdentifieCoordinateur',
      key: {
        aIdentifieCoordinateur: undefined,
      },
      error: 'L’identification du coordinateur est requise',
    },
    {
      testKey: 'coordinateurTypeContrat',
      key: {
        coordinateurTypeContrat: undefined,
      },
      error: 'L’identification de la mission du coordinateur est requise',
    },
    {
      testKey: 'h-captcha-response',
      key: {
        'h-captcha-response': undefined
      },
      error: 'Le captcha est obligatoire',
    },
  ])(
    'si j’envoie un formulaire avec la clé $testKey égale à undefined alors il y a une erreur',
    async ({ key, error }) => {
      // GIVEN
      const envoiUtilisateur = {
        ...champsObligatoires,
        ...key,
      };

      // WHEN
      const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

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
  it('si j’envoie un formulaire avec un numéro téléphone incorrecte alors il y a une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      contact: { ...champsObligatoires.contact, telephone: '01555' },
    };

    // WHEN
    const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'Le numéro de téléphone est invalide',
    });
  });

  it('si j’envoie un formulaire avec une motivation à plus de 2500 caractères alors il y a une erreur de validation', async () => {
    // GIVEN
    const lettreA = 'a';
    const envoiUtilisateur = {
      ...champsObligatoires,
      motivation: lettreA.repeat(2501),
    };

    // WHEN
    const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'La motivation ne doit pas dépasser 2500 caractères',
    });
  });

  it('si j’envoie un formulaire avec une motivation strictement égale à 2500 caractères alors il est validé', async () => {
    // GIVEN
    const lettreA = 'a';
    const motivation = lettreA.repeat(2500);
    const envoiUtilisateur = {
      ...champsObligatoires,
      motivation,
    };

    // WHEN
    const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.body.motivation).toBe(motivation);
  });

  it('si j’envoie un formulaire avec une date disponibilité inférieur à la date du jour alors il y a une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      dateDebutMission: '2024-01-01T00:00:00.000Z',
    };

    // WHEN
    const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'La date doit être supérieur à la date du jour',
    });
  });

  it.each(['PT', 'FT'])(
    'si j’envoie un formulaire avec une coordinateurTypeContrat égale à +%d alors il est validé',
    async (coordinateurTypeContrat) => {
      // GIVEN
      const envoiUtilisateur = {
        ...champsObligatoires,
        coordinateurTypeContrat,
      };

      // WHEN
      const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

      // THEN
      expect(response.headers['content-type']).toBe(
        'application/json; charset=utf-8',
      );
      expect(response.status).toBe(200);
      expect(response.body.coordinateurTypeContrat).toBe(coordinateurTypeContrat);
    },
  );

  it('si j’envoie un formulaire avec une coordinateurTypeContrat incorrecte alors il y a une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      coordinateurTypeContrat: 'TEST',
    };

    // WHEN
    const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'L’identification de la mission du coordinateur est requise',
    });
  });

  it.each([
    'COMMUNE',
    'DEPARTEMENT',
    'REGION',
    'EPCI',
    'COLLECTIVITE',
    'GIP',
    'PRIVATE',
  ])(
    'si j’envoie un formulaire avec une structure de type égale à +%d alors il est validé',
    async (type) => {
      // GIVEN
      const envoiUtilisateur = {
        ...champsObligatoires,
        type,
      };

      // WHEN
      const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

      // THEN
      expect(response.headers['content-type']).toBe(
        'application/json; charset=utf-8',
      );
      expect(response.status).toBe(200);
      expect(response.body.type).toBe(type);
    },
  );

  it('si j’envoie un formulaire avec une structure de type invalide alors il y a une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      type: 'TEST',
    };

    // WHEN
    const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'Le type est invalide',
    });
  });

  it.each(['PT', 'FT'])(
    'si j’envoie un formulaire avec une coordinateurTypeContrat égale à +%d alors il est validé',
    async (coordinateurTypeContrat) => {
      // GIVEN
      const envoiUtilisateur = {
        ...champsObligatoires,
        coordinateurTypeContrat,
      };

      // WHEN
      const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

      // THEN
      expect(response.headers['content-type']).toBe(
        'application/json; charset=utf-8',
      );
      expect(response.status).toBe(200);
      expect(response.body.coordinateurTypeContrat).toBe(coordinateurTypeContrat);
    },
  );

  it('si j’envoie un formulaire avec une coordinateurTypeContrat incorrecte alors il y a une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      coordinateurTypeContrat: 'TEST',
    };

    // WHEN
    const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'L’identification de la mission du coordinateur est requise',
    });
  });

  it.each([
    'COMMUNE',
    'DEPARTEMENT',
    'REGION',
    'EPCI',
    'COLLECTIVITE',
    'GIP',
    'PRIVATE',
  ])(
    'si j’envoie un formulaire avec une structure de type égale à +%d alors il est validé',
    async (type) => {
      // GIVEN
      const envoiUtilisateur = {
        ...champsObligatoires,
        type,
      };

      // WHEN
      const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

      // THEN
      expect(response.headers['content-type']).toBe(
        'application/json; charset=utf-8',
      );
      expect(response.status).toBe(200);
      expect(response.body.type).toBe(type);
    },
  );

  it('si j’envoie un formulaire avec une structure de type invalide alors il y a une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      type: 'TEST',
    };

    // WHEN
    const response = await request(app).post('/candidature-structure-coordinateur').send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      message: 'Le type est invalide',
    });
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
      .post('/candidature-structure-coordinateur')
      .send(envoiUtilisateur);

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
  });
});
