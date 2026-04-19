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

module.exports = {
  validateRegister,
};

