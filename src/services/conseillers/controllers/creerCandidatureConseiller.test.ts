import axios from 'axios';
import { describe, expect, it } from 'vitest';
import { viderLesCollections, host } from '../../../tests/utils';

import app from '../../../app';

const champsObligatoires = {
  prenom: "Jean",
  nom: "Martin",
  email: "jean.martin@example.com",
  nomCommune: "Paris",
  codePostal: "75001",
  codeCommune: "75000",
  location: {
    type: "Point",
    coordinates: [0, 0],
  },
  aUneExperienceMedNum: false,
  dateDisponibilite: new Date(),
  distanceMax: 5,
  motivation: "Ma motivation",
}

describe('recevoir et valider une candidature conseiller', () => {
  it('si j’envoie un formulaire avec tous les champs obligatoires alors il est validé', async () => {
    // GIVEN
    await viderLesCollections(app);
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
    expect(response.data).toStrictEqual({});
  });

  it('si j’envoie un formulaire avec tous les champs possibles alors il est validé', async () => {
    // GIVEN
    await viderLesCollections(app);
    const envoiUtilisateur = {
      ...champsObligatoires,
      telephone: "+33123456789",
      codeDepartement: "75",
      codeRegion: "75",
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
    await viderLesCollections(app);
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
    await viderLesCollections(app);
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
});
