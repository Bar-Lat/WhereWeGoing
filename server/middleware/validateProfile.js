const validateProfileUpdate = (req, res, next) => {
  const { firstName, lastName } = req.body;

  if (firstName !== undefined && typeof firstName !== 'string') {
    return res.status(400).json({ message: 'Imię musi być tekstem' });
  }

  if (lastName !== undefined && typeof lastName !== 'string') {
    return res.status(400).json({ message: 'Nazwisko musi być tekstem' });
  }

  if (typeof firstName === 'string' && firstName.trim().length > 80) {
    return res.status(400).json({ message: 'Imię jest za długie (maks. 80 znaków)' });
  }

  if (typeof lastName === 'string' && lastName.trim().length > 80) {
    return res.status(400).json({ message: 'Nazwisko jest za długie (maks. 80 znaków)' });
  }

  if (firstName === undefined && lastName === undefined) {
    return res.status(400).json({
      message: 'Podaj imię lub nazwisko do aktualizacji',
    });
  }

  return next();
};

const validateAvatarUpload = (req, res, next) => {
  const { base64Data, mimeType } = req.body;

  if (!base64Data || typeof base64Data !== 'string') {
    return res.status(400).json({ message: 'Brakuje danych avatara' });
  }

  if (!mimeType || typeof mimeType !== 'string') {
    return res.status(400).json({ message: 'Brakuje typu pliku avatara' });
  }

  return next();
};

module.exports = {
  validateProfileUpdate,
  validateAvatarUpload,
};

