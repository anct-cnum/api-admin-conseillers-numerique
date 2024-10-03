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
    redirect_uri: app.get('pro_connect').redirect_uris[0],
    code,
  };

  const tokenResponse = await axios.post(
    app.get('pro_connect').tokenEndpoint,
    querystring.stringify(tokenParams),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
  if (tokenResponse.status !== 200) {
    throw new Error('Access denied');
  }
  return tokenResponse.data.access_token;
}

async function getProConnectUserInfo(app: Application, accessToken: string) {
  const response = await axios.get(app.get('pro_connect').userInfoEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.status !== 200) {
    throw new Error('Access denied');
  }
  return jwt.decode(response.data) as any;
}

async function createProConnectClient(app: Application): Promise<Client> {
  const mcpIssuer = await Issuer.discover(app.get('pro_connect').issuer_url);
  return new mcpIssuer.Client({
    client_id: app.get('pro_connect').client_id,
    client_secret: app.get('pro_connect').client_secret,
    redirect_uris: [app.get('pro_connect').redirect_uri],
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

export {
  ALLOWED_ROLES,
  getProConnectAccessToken,
  getProConnectUserInfo,
  createProConnectClient,
  generateAuthorizationUrl,
};
