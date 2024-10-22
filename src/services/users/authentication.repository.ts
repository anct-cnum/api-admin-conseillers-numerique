import querystring from 'querystring';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { Issuer, Client } from 'openid-client';
import { Application } from '../../declarations';

const ALLOWED_ROLES = [
  'admin',
  'structure',
  'prefet',
  'hub',
  'grandReseau',
  'coordinateur',
];

async function getProConnectAccessToken(app: Application, code: string) {
  const tokenParams = {
    grant_type: 'authorization_code',
    client_id: app.get('pro_connect').client_id,
    client_secret: app.get('pro_connect').client_secret,
    redirect_uri: [app.get('pro_connect').redirect_uri],
    code,
  };
  try {
    const tokenResponse = await axios.post(
      app.get('pro_connect').token_endpoint,
      querystring.stringify(tokenParams),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );
    return {
      proConnectAccessToken: tokenResponse.data.access_token,
      idToken: tokenResponse.data.id_token,
    };
  } catch (error) {
    throw new Error('Une erreur est survenue lors de la récupération du token');
  }
}

async function getProConnectUserInfo(app: Application, accessToken: string) {
  const response = await axios.get(app.get('pro_connect').userinfo_endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.status !== 200) {
    throw new Error('Accès refusé');
  }
  return jwt.decode(response.data) as any;
}

async function createProConnectClient(app: Application): Promise<Client> {
  const proConnectConfig = app.get('pro_connect');
  const monCompteProIssuer = await Issuer.discover(proConnectConfig.issuer_url);
  return new monCompteProIssuer.Client({
    client_id: proConnectConfig.client_id,
    client_secret: proConnectConfig.client_secret,
    redirect_uris: [proConnectConfig.redirect_uri],
    response_types: ['code'],
  });
}

function generateAuthorizationUrl(
  client: Client,
  verificationToken: string,
  nonce: string,
  state: string,
): {
  authorizationUrl: string;
} {
  const stateWithToken = Buffer.from(
    JSON.stringify({ state, nonce, verificationToken }),
  ).toString('base64');

  const authorizationUrl = client.authorizationUrl({
    scope: 'openid email profile organization',
    state: stateWithToken,
    nonce,
  });

  return { authorizationUrl };
}

async function disconnectProConnectUser(
  app: Application,
  idToken: string,
  state: string,
) {
  const proConnectConfig = app.get('pro_connect');
  const params = new URLSearchParams({
    id_token_hint: idToken,
    state,
    post_logout_redirect_uri: proConnectConfig.post_logout_redirect_uri,
  });

  const logoutConfiguration = `${proConnectConfig.logout_endpoint}?${params.toString()}`;

  try {
    const response = await axios.get(logoutConfiguration, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    });
    return response.config.url;
  } catch (error) {
    throw new Error('Une erreur est survenue lors de la déconnexion');
  }
}

export {
  ALLOWED_ROLES,
  getProConnectAccessToken,
  getProConnectUserInfo,
  createProConnectClient,
  generateAuthorizationUrl,
  disconnectProConnectUser,
};
