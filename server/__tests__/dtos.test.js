/**
 * TESTY JEDNOSTKOWE - DTOs
 * Testowanie klas Data Transfer Objects
 */

const UserDTO = require('../dtos/UserDTO');
const UserResponseDTO = require('../dtos/UserResponseDTO');
const RegisterRequestDTO = require('../dtos/RegisterRequestDTO');
const LoginRequestDTO = require('../dtos/LoginRequestDTO');
const ProfileUpdateRequestDTO = require('../dtos/ProfileUpdateRequestDTO');

// ========================================
// TESTY: UserDTO
// ========================================

describe('UserDTO', () => {
  describe('constructor', () => {
    it('should create UserDTO with default values', () => {
      const user = new UserDTO({});
      
      expect(user.id).toBeNull();
      expect(user.email).toBeNull();
      expect(user.firstName).toBe('');
      expect(user.lastName).toBe('');
      expect(user.avatar).toBeNull();
    });

    it('should create UserDTO with provided values', () => {
      const user = new UserDTO({
        id: '123',
        email: 'test@example.com',
        firstName: 'Jan',
        lastName: 'Kowalski',
        avatar: 'https://example.com/avatar.jpg',
      });

      expect(user.id).toBe('123');
      expect(user.email).toBe('test@example.com');
      expect(user.firstName).toBe('Jan');
      expect(user.lastName).toBe('Kowalski');
      expect(user.avatar).toBe('https://example.com/avatar.jpg');
    });
  });

  describe('toJSON()', () => {
    it('should convert to JSON', () => {
      const user = new UserDTO({
        id: '123',
        email: 'test@example.com',
        firstName: 'Jan',
      });

      const json = user.toJSON();

      expect(json).toEqual({
        id: '123',
        email: 'test@example.com',
        firstName: 'Jan',
        lastName: '',
        avatar: null,
        createdAt: null,
        updatedAt: null,
      });
    });
  });

  describe('toProfileRow()', () => {
    it('should map to profile row format', () => {
      const user = new UserDTO({
        id: '123',
        firstName: 'Jan',
        lastName: 'Kowalski',
        avatar: 'avatar.jpg',
      });

      const row = user.toProfileRow('user-id');

      expect(row).toEqual({
        id: 'user-id',
        first_name: 'Jan',
        last_name: 'Kowalski',
        avatar: 'avatar.jpg',
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      });
    });
  });

  describe('isNewUser()', () => {
    it('should return true for new user', () => {
      const user = new UserDTO({
        id: '123',
        email: 'test@example.com',
      });

      expect(user.isNewUser()).toBe(true);
    });

    it('should return false if user has firstName', () => {
      const user = new UserDTO({
        id: '123',
        email: 'test@example.com',
        firstName: 'Jan',
      });

      expect(user.isNewUser()).toBe(false);
    });

    it('should return false if user has avatar', () => {
      const user = new UserDTO({
        id: '123',
        email: 'test@example.com',
        avatar: 'avatar.jpg',
      });

      expect(user.isNewUser()).toBe(false);
    });
  });

  describe('isEmpty()', () => {
    it('should return true if missing id', () => {
      const user = new UserDTO({
        email: 'test@example.com',
      });

      expect(user.isEmpty()).toBe(true);
    });

    it('should return true if missing email', () => {
      const user = new UserDTO({
        id: '123',
      });

      expect(user.isEmpty()).toBe(true);
    });

    it('should return false if has both id and email', () => {
      const user = new UserDTO({
        id: '123',
        email: 'test@example.com',
      });

      expect(user.isEmpty()).toBe(false);
    });
  });

  describe('static methods', () => {
    it('fromAuthResponse should create from auth data', () => {
      const authData = {
        user: {
          id: 'auth-id',
          email: 'user@example.com',
        },
      };

      const user = UserDTO.fromAuthResponse(authData);

      expect(user.id).toBe('auth-id');
      expect(user.email).toBe('user@example.com');
      expect(user.firstName).toBe('');
    });

    it('fromAuthResponse should use fallback email', () => {
      const authData = {
        user: {
          id: 'auth-id',
        },
      };

      const user = UserDTO.fromAuthResponse(authData, 'fallback@example.com');

      expect(user.email).toBe('fallback@example.com');
    });
  });
});

// ========================================
// TESTY: RegisterRequestDTO
// ========================================

describe('RegisterRequestDTO', () => {
  describe('validate()', () => {
    it('should validate correct email and password', () => {
      const dto = new RegisterRequestDTO({
        email: 'test@example.com',
        password: 'password123',
      });

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(true);
      expect(Object.keys(errors).length).toBe(0);
    });

    it('should reject invalid email', () => {
      const dto = new RegisterRequestDTO({
        email: 'invalid',
        password: 'password123',
      });

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(false);
      expect(errors.email).toBeDefined();
    });

    it('should reject short password', () => {
      const dto = new RegisterRequestDTO({
        email: 'test@example.com',
        password: 'short',
      });

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(false);
      expect(errors.password).toBeDefined();
    });

    it('should reject missing email', () => {
      const dto = new RegisterRequestDTO({
        password: 'password123',
      });

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(false);
      expect(errors.email).toBeDefined();
    });

    it('should reject missing password', () => {
      const dto = new RegisterRequestDTO({
        email: 'test@example.com',
      });

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(false);
      expect(errors.password).toBeDefined();
    });

    it('should reject too long password (>128)', () => {
      const dto = new RegisterRequestDTO({
        email: 'test@example.com',
        password: 'a'.repeat(129),
      });

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(false);
      expect(errors.password).toBeDefined();
    });
  });

  describe('validateOrThrow()', () => {
    it('should throw on invalid data', () => {
      const dto = new RegisterRequestDTO({
        email: 'invalid',
        password: 'short',
      });

      expect(() => {
        dto.validateOrThrow();
      }).toThrow();
    });

    it('should not throw on valid data', () => {
      const dto = new RegisterRequestDTO({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(() => {
        dto.validateOrThrow();
      }).not.toThrow();
    });
  });

  describe('toSupabasePayload()', () => {
    it('should return email and password', () => {
      const dto = new RegisterRequestDTO({
        email: 'test@example.com',
        password: 'password123',
      });

      const payload = dto.toSupabasePayload();

      expect(payload).toEqual({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  describe('toSafeObject()', () => {
    it('should return only email (without password)', () => {
      const dto = new RegisterRequestDTO({
        email: 'test@example.com',
        password: 'password123',
      });

      const safe = dto.toSafeObject();

      expect(safe).toEqual({
        email: 'test@example.com',
      });
      expect(safe.password).toBeUndefined();
    });
  });

  describe('email trimming', () => {
    it('should trim email whitespace', () => {
      const dto = new RegisterRequestDTO({
        email: '  test@example.com  ',
        password: 'password123',
      });

      expect(dto.email).toBe('test@example.com');
    });
  });
});

// ========================================
// TESTY: LoginRequestDTO
// ========================================

describe('LoginRequestDTO', () => {
  describe('validate()', () => {
    it('should validate correct login credentials', () => {
      const dto = new LoginRequestDTO({
        email: 'test@example.com',
        password: 'password123',
      });

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(true);
      expect(Object.keys(errors).length).toBe(0);
    });

    it('should reject invalid email', () => {
      const dto = new LoginRequestDTO({
        email: 'invalid',
        password: 'password123',
      });

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(false);
      expect(errors.email).toBeDefined();
    });

    it('should reject missing password', () => {
      const dto = new LoginRequestDTO({
        email: 'test@example.com',
      });

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(false);
      expect(errors.password).toBeDefined();
    });

    it('should reject missing email', () => {
      const dto = new LoginRequestDTO({
        password: 'password123',
      });

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(false);
      expect(errors.email).toBeDefined();
    });
  });

  describe('toSupabasePayload()', () => {
    it('should return email and password', () => {
      const dto = new LoginRequestDTO({
        email: 'test@example.com',
        password: 'password123',
      });

      const payload = dto.toSupabasePayload();

      expect(payload).toEqual({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });
});

// ========================================
// TESTY: ProfileUpdateRequestDTO
// ========================================

describe('ProfileUpdateRequestDTO', () => {
  describe('validate()', () => {
    it('should validate firstName only', () => {
      const dto = new ProfileUpdateRequestDTO({
        firstName: 'Jan',
      });

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(true);
    });

    it('should validate lastName only', () => {
      const dto = new ProfileUpdateRequestDTO({
        lastName: 'Kowalski',
      });

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(true);
    });

    it('should validate both firstName and lastName', () => {
      const dto = new ProfileUpdateRequestDTO({
        firstName: 'Jan',
        lastName: 'Kowalski',
      });

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(true);
    });

    it('should reject empty object (no fields)', () => {
      const dto = new ProfileUpdateRequestDTO({});

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(false);
      expect(errors.general).toBeDefined();
    });

    it('should reject firstName with wrong type', () => {
      const dto = new ProfileUpdateRequestDTO({
        firstName: 123,
      });

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(false);
      expect(errors.firstName).toBeDefined();
    });

    it('should reject firstName > 80 chars', () => {
      const dto = new ProfileUpdateRequestDTO({
        firstName: 'a'.repeat(81),
      });

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(false);
      expect(errors.firstName).toBeDefined();
    });

    it('should accept firstName = 80 chars', () => {
      const dto = new ProfileUpdateRequestDTO({
        firstName: 'a'.repeat(80),
      });

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(true);
    });

    it('should reject invalid URL in avatar', () => {
      const dto = new ProfileUpdateRequestDTO({
        avatar: 'not-a-url',
      });

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(false);
      expect(errors.avatar).toBeDefined();
    });

    it('should accept valid URL in avatar', () => {
      const dto = new ProfileUpdateRequestDTO({
        avatar: 'https://example.com/avatar.jpg',
      });

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(true);
    });

    it('should accept null avatar', () => {
      const dto = new ProfileUpdateRequestDTO({
        avatar: null,
      });

      const { isValid, errors } = dto.validate();

      expect(isValid).toBe(true);
    });
  });

  describe('toProfileRow()', () => {
    it('should map to profile row', () => {
      const dto = new ProfileUpdateRequestDTO({
        firstName: 'Jan',
        lastName: 'Kowalski',
      });

      const row = dto.toProfileRow('user-123');

      expect(row.id).toBe('user-123');
      expect(row.first_name).toBe('Jan');
      expect(row.last_name).toBe('Kowalski');
      expect(row.updated_at).toBeDefined();
    });

    it('should only include changed fields', () => {
      const dto = new ProfileUpdateRequestDTO({
        firstName: 'Jan',
      });

      const row = dto.toProfileRow('user-123');

      expect(row.first_name).toBe('Jan');
      expect(row.last_name).toBeUndefined();
      expect(row.avatar).toBeUndefined();
    });
  });

  describe('hasChanges()', () => {
    it('should return true if firstName is defined', () => {
      const dto = new ProfileUpdateRequestDTO({
        firstName: 'Jan',
      });

      expect(dto.hasChanges()).toBe(true);
    });

    it('should return true if avatar is defined', () => {
      const dto = new ProfileUpdateRequestDTO({
        avatar: null,
      });

      expect(dto.hasChanges()).toBe(true);
    });

    it('should return false if no fields', () => {
      const dto = new ProfileUpdateRequestDTO({});

      expect(dto.hasChanges()).toBe(false);
    });
  });

  describe('getChangedFields()', () => {
    it('should return only changed fields', () => {
      const dto = new ProfileUpdateRequestDTO({
        firstName: 'Jan',
        lastName: 'Kowalski',
      });

      const changes = dto.getChangedFields();

      expect(changes).toEqual({
        firstName: 'Jan',
        lastName: 'Kowalski',
      });
      expect(changes.avatar).toBeUndefined();
    });
  });
});

// ========================================
// TESTY: UserResponseDTO
// ========================================

describe('UserResponseDTO', () => {
  describe('constructor', () => {
    it('should create with default values', () => {
      const dto = new UserResponseDTO({});

      expect(dto.id).toBeNull();
      expect(dto.email).toBeNull();
      expect(dto.firstName).toBe('');
      expect(dto.lastName).toBe('');
      expect(dto.avatar).toBeNull();
    });
  });

  describe('toJSON()', () => {
    it('should convert to JSON', () => {
      const dto = new UserResponseDTO({
        id: '123',
        email: 'test@example.com',
        firstName: 'Jan',
        lastName: 'Kowalski',
        avatar: 'https://example.com/avatar.jpg',
      });

      const json = dto.toJSON();

      expect(json).toHaveProperty('id', '123');
      expect(json).toHaveProperty('email', 'test@example.com');
      expect(json).toHaveProperty('firstName', 'Jan');
      expect(json).toHaveProperty('lastName', 'Kowalski');
      expect(json).toHaveProperty('avatar', 'https://example.com/avatar.jpg');
    });
  });

  describe('isComplete()', () => {
    it('should return true if has id and email', () => {
      const dto = new UserResponseDTO({
        id: '123',
        email: 'test@example.com',
      });

      expect(dto.isComplete()).toBe(true);
    });

    it('should return false if missing id', () => {
      const dto = new UserResponseDTO({
        email: 'test@example.com',
      });

      expect(dto.isComplete()).toBe(false);
    });

    it('should return false if missing email', () => {
      const dto = new UserResponseDTO({
        id: '123',
      });

      expect(dto.isComplete()).toBe(false);
    });
  });

  describe('static methods', () => {
    it('fromAuth should create from auth data', () => {
      const authData = {
        user: {
          id: 'auth-id',
          email: 'user@example.com',
        },
      };

      const dto = UserResponseDTO.fromAuth(authData, 'user@example.com');

      expect(dto.id).toBe('auth-id');
      expect(dto.email).toBe('user@example.com');
      expect(dto.firstName).toBe('');
      expect(dto.lastName).toBe('');
      expect(dto.avatar).toBeNull();
    });

    it('fromProfile should create from profile data', () => {
      const user = { id: 'user-id', email: 'test@example.com' };
      const profile = {
        first_name: 'Jan',
        last_name: 'Kowalski',
        avatar: 'avatar.jpg',
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T11:00:00Z',
      };

      const dto = UserResponseDTO.fromProfile(user, profile);

      expect(dto.id).toBe('user-id');
      expect(dto.email).toBe('test@example.com');
      expect(dto.firstName).toBe('Jan');
      expect(dto.lastName).toBe('Kowalski');
      expect(dto.avatar).toBe('avatar.jpg');
    });
  });
});

