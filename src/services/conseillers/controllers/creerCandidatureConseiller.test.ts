import axios from 'axios';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { viderLesCollections, host } from '../../../tests/utils';

import app from '../../../app';

const champsObligatoires = {
  prenom: "Jean",
  nom: "Martin",
  email: "jean.martin@example.com",
  nomCommune: "Paris",
  codePostal: "75001",
  codeCommune: "75000",
  codeDepartement: "75",
  codeRegion: "75",
  location: {
    type: "Point",
    coordinates: [0, 0],
  },
  aUneExperienceMedNum: false,
  dateDisponibilite: "2024-01-01T00:00:00.000Z",
  distanceMax: 5,
  motivation: "Ma motivation",
}

describe('recevoir et valider une candidature conseiller', () => {
  beforeEach(async () => {
    await viderLesCollections(app);
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('si j’envoie un formulaire avec tous les champs obligatoires alors il est validé', async () => {
    // GIVEN
    vi.setSystemTime(new Date(2024, 1, 1));
    const envoiUtilisateur = {
      ...champsObligatoires,
    }

    // WHEN
    const response = await axios({
      method: "POST",
      url: `${host}/candidature-conseiller`,
      data: envoiUtilisateur,
      validateStatus: (status) => status < 500,
    });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.data).toStrictEqual({
      aUneExperienceMedNum: false,
      codeCommune: "75000",
      codeDepartement: "75",
      codePostal: "75001",
      codeRegion: "75",
      dateDisponibilite: "2024-01-01T00:00:00.000Z",
      distanceMax: 5,
      email: "jean.martin@example.com",
      idPG: 1,
      importedAt: "2024-01-01T00:00:00.000Z",
      location:  {
        coordinates: [
          0,
          0,
        ],
        type: "Point",
      },
      motivation: "Ma motivation",
      nom: "Martin",
      nomCommune: "Paris",
      prenom: "Jean",
      userCreated: false,
    });
  });

  it.skip('si j’envoie un formulaire avec tous les champs possibles alors il est validé', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      telephone: "+33123456789",
      codeCom: "75",
      estDemandeurEmploi: true,
      estEnEmploi: true,
      estEnFormation: true,
      estDiplomeMedNum: true,
      nomDiplomeMedNum: "Diplome",
    }

    // WHEN
    const response = await axios({
      method: "POST",
      url: `${host}/candidature-conseiller`,
      data: envoiUtilisateur,
      validateStatus: (status) => status < 500,
    });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.data).toStrictEqual({});
  });

  it('si j’envoie un formulaire avec un email invalide alors j’ai une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      email: "abc"
    }

    // WHEN
    const response = await axios({
      method: "POST",
      url: `${host}/candidature-conseiller`,
      data: envoiUtilisateur,
      validateStatus: (status) => status < 500,
    });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
      message: 'L’adresse e-mail est invalide',
    });
  });

  it('si j’envoie un formulaire avec un numéro de téléphone invalide alors j’ai une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      telephone: "abc"
    }

    // WHEN
    const response = await axios({
      method: "POST",
      url: `${host}/candidature-conseiller`,
      data: envoiUtilisateur,
      validateStatus: (status) => status < 500,
    });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
      message: 'Le numéro de téléphone est invalide',
    });
  });

  it('si j’envoie un formulaire avec un code postal invalide alors j’ai une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      codePostal: "123"
    }

    // WHEN
    const response = await axios({
      method: "POST",
      url: `${host}/candidature-conseiller`,
      data: envoiUtilisateur,
      validateStatus: (status) => status < 500,
    });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
      message: 'Le code postal est invalide',
    });
  });

  it('si j’envoie un formulaire avec un code commune invalide alors j’ai une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      codeCommune: "123"
    }

    // WHEN
    const response = await axios({
      method: "POST",
      url: `${host}/candidature-conseiller`,
      data: envoiUtilisateur,
      validateStatus: (status) => status < 500,
    });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
      message: 'Le code commune est invalide',
    });
  });

  // TODO
  it.todo('si j’envoie un formulaire avec un localisation invalide alors j’ai une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      location: 1
    }

    // WHEN
    const response = await axios({
      method: "POST",
      url: `${host}/candidature-conseiller`,
      data: envoiUtilisateur,
      validateStatus: (status) => status < 500,
    });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
      message: 'Le code postal est invalide',
    });
  });

  // TODO
  it('si j’envoie un formulaire avec aucune situation renseignée alors j’ai une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      estDemandeurEmploi: false,
      estEnEmploi: false,
      estEnFormation: false,
      estDiplomeMedNum: false,
      nomDiplomeMedNum: '',
      aUneExperienceMedNum: false
    }

    // WHEN
    const response = await axios({
      method: "POST",
      url: `${host}/candidature-conseiller`,
      data: envoiUtilisateur,
      validateStatus: (status) => status < 500,
    });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
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
      aUneExperienceMedNum: false
    }

    // WHEN
    const response = await axios({
      method: "POST",
      url: `${host}/candidature-conseiller`,
      data: envoiUtilisateur,
      validateStatus: (status) => status < 500,
    });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
      message: 'Le nom du diplôme est requis',
    });
  });

  it('si j’envoie un formulaire avec une distance max invalide alors j’ai une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      distanceMax: 3
    }

    // WHEN
    const response = await axios({
      method: "POST",
      url: `${host}/candidature-conseiller`,
      data: envoiUtilisateur,
      validateStatus: (status) => status < 500,
    });

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
      message: 'La distance est invalide',
    });
  });
});
