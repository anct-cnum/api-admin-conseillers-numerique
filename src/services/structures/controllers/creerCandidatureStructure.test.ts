import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { viderLesCollections, requetePost } from '../../../tests/utils';

import app from '../../../app';

const champsObligatoires = {
  type: 'PRIVATE',
  nom: 'MAIRIE',
  siret: '12345678910',
  ridet: null,
  aIdentifieCandidat: false,
  dateDebutMission: '2024-01-01T00:00:00.000Z',
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
  nombreConseillersSouhaites: 1,
  motivation: 'Je suis motivé.',
  confirmationEngagement: true,
};

describe('recevoir et valider une candidature structure', () => {
  beforeEach(async () => {
    await viderLesCollections(app);
  });

  it('si j’envoie un formulaire avec tous les champs obligatoires alors il est validé', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
    };

    // WHEN
    const response = await requetePost(
      '/candidature-structure',
      envoiUtilisateur,
    );

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.data.nom).toBe('MAIRIE');
    expect(response.data.siret).toBe('12345678910');
    expect(response.data.ridet).toBe(null);
    expect(response.data.aIdentifieCandidat).toBe(false);
    expect(response.data.dateDebutMission).toBe('2024-01-01T00:00:00.000Z');
    expect(response.data.contact.prenom).toBe('camélien');
    expect(response.data.contact.nom).toBe('rousseau');
    expect(response.data.contact.fonction).toBe('PRESIDENTE');
    expect(response.data.contact.email).toBe('camlien_rousseau74@example.net');
    expect(response.data.contact.telephone).toBe('+33751756469');
    expect(response.data.codeCommune).toBe('75000');
    expect(response.data.codeDepartement).toBe('75');
    expect(response.data.codePostal).toBe('75001');
    expect(response.data.codeRegion).toBe('75');
    expect(response.data.codeCom).toBe('');
    expect(response.data.location).toStrictEqual({
      coordinates: [0, 0],
      type: 'Point',
    });
    expect(response.data.nombreConseillersSouhaites).toBe(1);
    expect(response.data.motivation).toBe('Je suis motivé.');
    expect(response.data.confirmationEngagement).toBe(true);
  });

  it('si j’envoie la totalité des champs possibles avec les champs ajouté par default alors il est validé', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
    };

    // WHEN
    const response = await requetePost(
      '/candidature-structure',
      envoiUtilisateur,
    );

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.data.nom).toBe('MAIRIE');
    expect(response.data.siret).toBe('12345678910');
    expect(response.data.ridet).toBe(null);
    expect(response.data.aIdentifieCandidat).toBe(false);
    expect(response.data.dateDebutMission).toBe('2024-01-01T00:00:00.000Z');
    expect(response.data.contact.prenom).toBe('camélien');
    expect(response.data.contact.nom).toBe('rousseau');
    expect(response.data.contact.fonction).toBe('PRESIDENTE');
    expect(response.data.contact.email).toBe('camlien_rousseau74@example.net');
    expect(response.data.contact.telephone).toBe('+33751756469');
    expect(response.data.codeCommune).toBe('75000');
    expect(response.data.codeDepartement).toBe('75');
    expect(response.data.codePostal).toBe('75001');
    expect(response.data.codeRegion).toBe('75');
    expect(response.data.codeCom).toBe('');
    expect(response.data.location).toStrictEqual({
      coordinates: [0, 0],
      type: 'Point',
    });
    expect(response.data.nombreConseillersSouhaites).toBe(1);
    expect(response.data.motivation).toBe('Je suis motivé.');
    expect(response.data.confirmationEngagement).toBe(true);
    expect(response.data.idPG).toBe(1);
    expect(response.data.userCreated).toBe(false);
    expect(response.data.statut).toBe('CREEE');
    expect(response.data.estLabelliseFranceServices).toBe('NON');
    expect(response.data.estZRR).toBe(null);
    expect(response.data.prefet).toStrictEqual([]);
    expect(response.data.coselec).toStrictEqual([]);
    expect(response.data.coordinateurCandidature).toStrictEqual(false);
    expect(response.data.coordinateurTypeContrat).toStrictEqual(null);
  });

  it('si j’envoie un formulaire sans SIRET mais avec un RIDET alors il n’y a pas d’erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      siret: null,
      ridet: '1234567',
    };

    // WHEN
    const response = await requetePost(
      '/candidature-structure',
      envoiUtilisateur,
    );

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.data.siret).toBe(null);
    expect(response.data.ridet).toBe('1234567');
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
    'si j’envoie un formulaire avec une structure de type égale à %s alors il est validé',
    async (type) => {
      // GIVEN
      const envoiUtilisateur = {
        ...champsObligatoires,
        type,
      };

      // WHEN
      const response = await requetePost(
        '/candidature-structure',
        envoiUtilisateur,
      );

      // THEN
      expect(response.headers['content-type']).toBe(
        'application/json; charset=utf-8',
      );
      expect(response.status).toBe(200);
      expect(response.data.type).toBe(type);
    },
  );

  it('si j’envoie un formulaire avec une structure de type invalide alors j’ai une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      type: 'TEST',
    };

    // WHEN
    const response = await requetePost(
      '/candidature-structure',
      envoiUtilisateur,
    );
   
    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
      message: 'Le type est invalide',
    });
  });

  it('si j’envoie un formulaire avec 0 conseiller souhaité alors j’ai une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      nombreConseillersSouhaites: 0,
    };

    // WHEN
    const response = await requetePost(
      '/candidature-structure',
      envoiUtilisateur,
    );

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
      message: 'Le nombre de conseillers souhaités est invalide',
    });
  });

  it('si j’envoie un formulaire avec confirmation des engagements à false alors j’ai une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      confirmationEngagement: false,
    };

    // WHEN
    const response = await requetePost(
      '/candidature-structure',
      envoiUtilisateur,
    );

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
      message: 'La confirmation d’engagement est requis',
    });
  });

  it('si j’envoie un formulaire avec un SIRET déjà existant alors j’ai une erreur', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
    };
    await requetePost('/candidature-structure', envoiUtilisateur);

    // WHEN
    const response = await requetePost(
      '/candidature-structure',
      envoiUtilisateur,
    );

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
      message: 'Vous êtes déjà inscrite',
    });
  });

  it('si j’envoie un formulaire avec un RIDET déjà existant alors j’ai une erreur', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      siret: null,
      ridet: '123',
    };
    await requetePost('/candidature-structure', envoiUtilisateur);

    // WHEN
    const response = await requetePost(
      '/candidature-structure',
      envoiUtilisateur,
    );

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
      message: 'Vous êtes déjà inscrite',
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
      const response = await requetePost(
        '/candidature-structure',
        envoiUtilisateur,
      );

      // THEN
      expect(response.headers['content-type']).toBe(
        'application/json; charset=utf-8',
      );
      expect(response.status).toBe(200);
      expect(response.data.contact.telephone).toBe(
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
      error: 'Le SIRET est requis',
    },
    {
      testKey: 'ridet',
      key: { siret: null, ridet: undefined },
      error: 'Le SIRET ou le RIDET est requis',
    },
    {
      testKey: 'aIdentifieCandidat',
      key: { aIdentifieCandidat: undefined },
      error: 'L’identification du candidat est requise',
    },
    {
      testKey: 'dateDebutMission',
      key: { dateDebutMission: undefined },
      error: 'La date de début de mission est invalide',
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
      error: 'La location est requis',
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
      testKey: 'nombreConseillersSouhaites',
      key: {
        nombreConseillersSouhaites: undefined,
      },
      error: 'Le nombre de conseillers souhaités est invalide',
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
      error: 'La confirmation d’engagement est requis',
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
      const response = await requetePost(
        '/candidature-structure',
        envoiUtilisateur,
      );

      // THEN
      expect(response.headers['content-type']).toBe(
        'application/json; charset=utf-8',
      );
      expect(response.status).toBe(400);
      expect(response.data).toStrictEqual({
        message: error,
      });
    },
  );

  it('si j’envoie un formulaire avec un numéro téléphone incorrect alors il y a une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      contact: { ...champsObligatoires.contact, telephone: '01555' },
    };

    // WHEN
    const response = await requetePost(
      '/candidature-structure',
      envoiUtilisateur,
    );

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
      message: 'Le numéro de téléphone est invalide',
    });
  });

  it('si j’envoie un formulaire avec une motivation à plus de 2500 caractères alors j’ai une erreur de validation', async () => {
    // GIVEN
    const lettreA = 'a';
    const envoiUtilisateur = {
      ...champsObligatoires,
      motivation: lettreA.repeat(2501),
    };

    // WHEN
    const response = await requetePost(
      '/candidature-structure',
      envoiUtilisateur,
    );

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
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
    const response = await requetePost(
      '/candidature-structure',
      envoiUtilisateur,
    );

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.data.motivation).toBe(motivation);
  });
});
