/**
 * UserDTO - Reprezentacja użytkownika w aplikacji
 * Zawiera dane profilu i autentykacji użytkownika
 */
class UserDTO {
  constructor({
    id = null,
    email = null,
    firstName = '',
    lastName = '',
    avatar = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.avatar = avatar;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Konwertuje DTO na JSON do zwrotu w odpowiedzi API
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      avatar: this.avatar,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Tworzy UserDTO z odpowiedzi autentykacji Supabase
   * @param {Object} data - Odpowiedź z supabaseAuthClient.auth.signUp/signInWithPassword
   * @param {string} fallbackEmail - Email do użycia jeśli brakuje w data
   */
  static fromAuthResponse(data, fallbackEmail = null) {
    return new UserDTO({
      id: data?.user?.id || null,
      email: data?.user?.email || fallbackEmail || null,
      firstName: '',
      lastName: '',
      avatar: null,
      createdAt: null,
      updatedAt: null,
    });
  }

  /**
   * Tworzy UserDTO z danych użytkownika i profilu
   * @param {Object} user - Dane użytkownika z auth
   * @param {Object} profile - Dane profilu z bazy danych
   */
  static fromProfile(user, profile) {
    return new UserDTO({
      id: user?.id || null,
      email: user?.email || null,
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      avatar: profile?.avatar || null,
      createdAt: profile?.created_at || null,
      updatedAt: profile?.updated_at || null,
    });
  }

  /**
   * Tworzy UserDTO z modelu domenowego User
   * @param {Object} user - Instancja klasy User
   * @param {string} userId - ID użytkownika
   */
  static fromUserModel(user, userId) {
    return new UserDTO({
      id: userId,
      email: user?.email || null,
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      avatar: user?.avatar || null,
      createdAt: user?.createdAt || null,
      updatedAt: user?.updatedAt || null,
    });
  }

  /**
   * Mapuje DTO na format rekordu profilu do bazy danych
   * @param {string} userId - ID użytkownika
   */
  toProfileRow(userId) {
    return {
      id: userId,
      first_name: this.firstName,
      last_name: this.lastName,
      avatar: this.avatar,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }

  /**
   * Sprawdza czy dane są puste (nowo zarejestrowany użytkownik)
   */
  isNewUser() {
    return !this.firstName && !this.lastName && !this.avatar;
  }

  /**
   * Sprawdza czy DTO zawiera istotne dane
   */
  isEmpty() {
    return !this.id || !this.email;
  }
}

module.exports = UserDTO;

