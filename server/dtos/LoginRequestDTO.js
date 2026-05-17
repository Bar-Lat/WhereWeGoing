/**
 * LoginRequestDTO - Walidacja i transformacja danych logowania
 */
class LoginRequestDTO {
  constructor({ email = '', password = '' } = {}) {
    this.email = typeof email === 'string' ? email.trim() : '';
    this.password = typeof password === 'string' ? password : '';
  }

  /**
   * Waliduje dane logowania
   * @returns {Object} { isValid: boolean, errors: {} }
   */
  validate() {
    const errors = {};

    if (!this.email || !this._isValidEmail(this.email)) {
      errors.email = 'Podaj poprawny e-mail';
    }

    if (!this.password || typeof this.password !== 'string') {
      errors.password = 'Podaj hasło';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Waliduje email
   */
  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Rzuca błąd jeśli dane są niepoprawne
   */
  validateOrThrow() {
    const validation = this.validate();
    if (!validation.isValid) {
      const errorMessages = Object.values(validation.errors).join(', ');
      throw new Error(errorMessages);
    }
  }

  /**
   * Konwertuje na obiekt do wysłania do Supabase
   */
  toSupabasePayload() {
    return {
      email: this.email,
      password: this.password,
    };
  }

  /**
   * Bezpieczna reprezentacja
   */
  toSafeObject() {
    return {
      email: this.email,
    };
  }
}

module.exports = LoginRequestDTO;

