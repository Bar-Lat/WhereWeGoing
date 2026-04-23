class User {
  constructor({
    id = null,
    email,
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

  // Tworzy model użytkownika na podstawie danych z etapu rejestracji.
  static fromRegistration({ email }) {
    const now = new Date().toISOString();

    return new User({
      email,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Mapuje model domenowy na strukturę kolumn tabeli profilu.
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
}

module.exports = User;

