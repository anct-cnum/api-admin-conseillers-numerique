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
  dateDisponibilite: "2025-01-01T00:00:00.000Z",
  distanceMax: 5,
  motivation: "Ma motivation",
}

describe('recevoir et valider une candidature conseiller', () => {
  beforeEach(async () => {
    await viderLesCollections(app);
  })

  it('si j’envoie un formulaire avec tous les champs obligatoires alors il est validé', async () => {
    // GIVEN
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
    expect(response.data.aUneExperienceMedNum).toBe(false);
    expect(response.data.codeCommune).toBe("75000");
    expect(response.data.codeDepartement).toBe("75");
    expect(response.data.codePostal).toBe("75001");
    expect(response.data.codeRegion).toBe("75");
    expect(response.data.dateDisponibilite).toBe("2025-01-01T00:00:00.000Z");
    expect(response.data.distanceMax).toBe(5);
    expect(response.data.email).toBe("jean.martin@example.com");
    expect(response.data.idPG).toBe(1);
    expect(response.data.location).toStrictEqual({
      coordinates: [0, 0],
      type: "Point",
    });
    expect(response.data.motivation).toBe("Ma motivation");
    expect(response.data.nom).toBe("Martin");
    expect(response.data.nomCommune).toBe("Paris");
    expect(response.data.prenom).toBe("Jean");
    expect(response.data.userCreated).toBe(false);
    expect(response.data.disponible).toBe(true);
  });

  it('si j’envoie un formulaire avec tous les champs possibles alors il est validé', async () => {
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
    expect(response.data.aUneExperienceMedNum).toBe(false);
    expect(response.data.codeCommune).toBe("75000");
    expect(response.data.codeDepartement).toBe("75");
    expect(response.data.codePostal).toBe("75001");
    expect(response.data.codeRegion).toBe("75");
    expect(response.data.dateDisponibilite).toBe("2025-01-01T00:00:00.000Z");
    expect(response.data.distanceMax).toBe(5);
    expect(response.data.email).toBe("jean.martin@example.com");
    expect(response.data.idPG).toBe(1);
    expect(response.data.location).toStrictEqual({
      coordinates: [0, 0],
      type: "Point",
    });
    expect(response.data.motivation).toBe("Ma motivation");
    expect(response.data.nom).toBe("Martin");
    expect(response.data.nomCommune).toBe("Paris");
    expect(response.data.prenom).toBe("Jean");
    expect(response.data.userCreated).toBe(false);
    expect(response.data.telephone).toBe("+33123456789");
    expect(response.data.codeCom).toBe("75");
    expect(response.data.estDemandeurEmploi).toBe(true);
    expect(response.data.estEnEmploi).toBe(true);
    expect(response.data.estEnFormation).toBe(true);
    expect(response.data.estDiplomeMedNum).toBe(true);
    expect(response.data.nomDiplomeMedNum).toBe("Diplome");
    expect(response.data.disponible).toBe(true);
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

  it('si j’envoie un formulaire avec un localisation invalide alors j’ai une erreur de validation', async () => {
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
      message: 'La localisation est invalide',
    });
  });
  it('si j’envoie un formulaire avec une date disponibilité inférieur à la date du jour alors j’ai une erreur de validation', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
      dateDisponibilite: "2024-01-01T00:00:00.000Z",
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
      message: 'La date doit être supérieur à la date du jour',
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

  it('si j’envoie un formulaire avec un email déjà existant alors j’ai une erreur', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
    }
    await axios({
      method: "POST",
      url: `${host}/candidature-conseiller`,
      data: envoiUtilisateur,
      validateStatus: (status) => status < 500,
    });

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
      message: 'L’email est déjà utilisé',
    });
  });
});
