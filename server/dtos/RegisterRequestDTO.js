/**
 * RegisterRequestDTO - Walidacja i transformacja danych rejestracji
 * Odpowiada za walidację email i hasła z requestu
 */
class RegisterRequestDTO {
  constructor({ email = '', password = '' } = {}) {
    this.email = typeof email === 'string' ? email.trim() : '';
    this.password = typeof password === 'string' ? password : '';
  }

  /**
   * Waliduje dane rejestracji
   * @returns {Object} { isValid: boolean, errors: {} }
   */
  validate() {
    const errors = {};

    // Walidacja emaila
    if (!this.email) {
      errors.email = 'Email jest wymagany';
    } else if (!this._isValidEmail(this.email)) {
      errors.email = 'Podaj poprawny adres e-mail';
    }

    // Walidacja hasła
    if (!this.password) {
      errors.password = 'Hasło jest wymagane';
    } else if (this.password.length < 6) {
      errors.password = 'Hasło musi mieć min. 6 znaków';
    } else if (this.password.length > 128) {
      errors.password = 'Hasło jest za długie (maks. 128 znaków)';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Waliduje email za pomocą regex
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
   * Bezpieczna reprezentacja (bez hasła)
   */
  toSafeObject() {
    return {
      email: this.email,
    };
  }
}

module.exports = RegisterRequestDTO;

