function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'secret' || secret.length < 32) {
    throw new Error('JWT_SECRET no configurado o demasiado debil. Defina un secreto aleatorio de al menos 32 caracteres en .env');
  }
  return secret;
}

module.exports = { getJwtSecret };
