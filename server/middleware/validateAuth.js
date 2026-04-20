const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Walidacja danych wejściowych przy rejestracji.
const validateRegister = (req, res, next) => {
  const { email, password } = req.body;
  const errors = {};

  if (!email || !emailRegex.test(email)) {
    errors.email = 'Podaj poprawny adres e-mail';
  }

  if (!password || password.length < 6) {
    errors.password = 'Hasło musi mieć min. 6 znaków';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      message: 'Niepoprawne dane rejestracji',
      errors,
    });
  }

  return next();
};

// Walidacja danych wejściowych przy logowaniu.
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !emailRegex.test(email) || !password || typeof password !== 'string') {
    return res.status(400).json({
      message: 'Podaj poprawny e-mail i hasło',
    });
  }

  return next();
};

// Walidacja refresh tokena przy przywracaniu sesji.
const validateRefresh = (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({
      message: 'Brak poprawnego refresh tokena',
    });
  }

  return next();
};

// Walidacja access tokena przy wylogowaniu.
const validateLogout = (req, res, next) => {
  const { accessToken } = req.body;

  if (!accessToken || typeof accessToken !== 'string') {
    return res.status(400).json({
      message: 'Brak poprawnego access tokena',
    });
  }

  return next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateRefresh,
  validateLogout,
};

