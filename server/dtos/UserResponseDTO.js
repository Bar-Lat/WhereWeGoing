/**
 * UserResponseDTO - Format odpowiedzi API dla danych użytkownika
 */
class UserResponseDTO {
  constructor({
    id = null,
    email = null,
    firstName = '',
    lastName = '',
    avatar = null,
    createdAt = null,
    updatedAt = null,
  } = {}) {
    this.id = id;
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.avatar = avatar;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Konwertuje do JSON dla HTTP response
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
   * Tworzy response DTO z danych autentykacji
   * @param {Object} authData - Dane z supabaseAuthClient.auth.signUp
   * @param {string} email - Email użytkownika
   */
  static fromAuth(authData, email = null) {
    return new UserResponseDTO({
      id: authData?.user?.id || null,
      email: authData?.user?.email || email || null,
      firstName: '',
      lastName: '',
      avatar: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Tworzy response DTO z profilu użytkownika
   * @param {Object} user - Dane z Supabase Auth
   * @param {Object} profile - Dane profilu z bazy
   */
  static fromProfile(user, profile) {
    return new UserResponseDTO({
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
   * Sprawdza czy profil ma minimalne dane
   */
  isComplete() {
    return !!(this.id && this.email);
  }
}

module.exports = UserResponseDTO;

