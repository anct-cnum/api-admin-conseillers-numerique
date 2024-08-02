import axios from 'axios';
import { describe, expect, it } from 'vitest';
import viderLesCollections from '../../../../tests/utils';

import app from '../../../app';

describe('recevoir et valider une candidature conseiller', () => {
  const host = 'http://localhost:8181';

  it('si j’envoie un formulaire sans prénom alors j’ai une erreur de validation', async () => {
    // GIVEN
    await viderLesCollections(app);
    const envoiUtilisateur = {
      nom : "Martin"
    }

    // WHEN
    const response = await axios({
      method: "POST",
      url: `${host}/candidature-conseiller`,
      data: envoiUtilisateur,
      validateStatus: (status) => status < 500,
    }    );

    // THEN
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.status).toBe(400);
    expect(response.data).toStrictEqual({
      message: 'Le prénom est requis',
    });
  });
});
