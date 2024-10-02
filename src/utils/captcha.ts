import axios from 'axios';

export default async function verifyCaptcha(app, token) {
  const response = await axios.post(
    'https://hcaptcha.com/siteverify',
    new URLSearchParams({
      secret: app.get('hcaptcha_secret'),
      response: token,
    }),
  );

  if (!response.data.success) {
    throw new Error('Le captcha est invalide');
  }
}
