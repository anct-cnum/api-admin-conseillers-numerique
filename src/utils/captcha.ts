import axios from 'axios';

export default async function verifyCaptcha(app, token) {
  const response = await axios.post(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      secret: app.get('captcha_secret'),
      response: token,
    },
  );

  if (!response.data.success) {
    throw new Error('Le captcha est invalide');
  }
}
