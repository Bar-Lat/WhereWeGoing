/**
 * ProfileUpdateRequestDTO - Walidacja i transformacja danych aktualizacji profilu
 */
class ProfileUpdateRequestDTO {
  constructor({ firstName = undefined, lastName = undefined, avatar = undefined } = {}) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.avatar = avatar;
  }

  /**
   * Waliduje dane aktualizacji profilu
   * @returns {Object} { isValid: boolean, errors: {} }
   */
  validate() {
    const errors = {};

    // Sprawdzenie czy podano przynajmniej jedno pole
    if (
      this.firstName === undefined &&
      this.lastName === undefined &&
      this.avatar === undefined
    ) {
      errors.general = 'Podaj imię, nazwisko lub avatar do aktualizacji';
    }

    // Walidacja imienia
    if (this.firstName !== undefined) {
      if (typeof this.firstName !== 'string') {
        errors.firstName = 'Imię musi być tekstem';
      } else if (this.firstName.trim().length > 80) {
        errors.firstName = 'Imię jest za długie (maks. 80 znaków)';
      }
    }

    // Walidacja nazwiska
    if (this.lastName !== undefined) {
      if (typeof this.lastName !== 'string') {
        errors.lastName = 'Nazwisko musi być tekstem';
      } else if (this.lastName.trim().length > 80) {
        errors.lastName = 'Nazwisko jest za długie (maks. 80 znaków)';
      }
    }

    // Walidacja avatara
    if (this.avatar !== undefined) {
      if (this.avatar !== null && typeof this.avatar !== 'string') {
        errors.avatar = 'Avatar musi być URL-em lub null';
      } else if (typeof this.avatar === 'string' && this.avatar.trim().length > 500) {
        errors.avatar = 'URL avatara jest za długi';
      } else if (typeof this.avatar === 'string' && !this._isValidUrl(this.avatar)) {
        errors.avatar = 'Avatar musi być poprawnym URL-em';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
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
   * Mapuje na format rekordu bazy danych
   * @param {string} userId - ID użytkownika
   */
  toProfileRow(userId) {
    const row = {
      id: userId,
      updated_at: new Date().toISOString(),
    };

    if (this.firstName !== undefined) {
      row.first_name = this.firstName;
    }

    if (this.lastName !== undefined) {
      row.last_name = this.lastName;
    }

    if (this.avatar !== undefined) {
      row.avatar = this.avatar;
    }

    return row;
  }

  /**
   * Sprawdza czy zmieniono cokolwiek
   */
  hasChanges() {
    return (
      this.firstName !== undefined ||
      this.lastName !== undefined ||
      this.avatar !== undefined
    );
  }

  /**
   * Waliduje URL
   */
  _isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Zwraca tylko pola które zostały zmienione
   */
  getChangedFields() {
    const fields = {};

    if (this.firstName !== undefined) {
      fields.firstName = this.firstName;
    }

    if (this.lastName !== undefined) {
      fields.lastName = this.lastName;
    }

    if (this.avatar !== undefined) {
      fields.avatar = this.avatar;
    }

    return fields;
  }
}

module.exports = ProfileUpdateRequestDTO;

