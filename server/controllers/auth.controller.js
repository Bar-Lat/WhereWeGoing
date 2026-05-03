const { supabaseAuthClient } = require('../configs/supabaseClient');
const User = require('../models/User');
const {
  upsertUserProfile,
  profileSchema,
  profileTable,
} = require('../repositories/profile.repository');

const ensureProfile = async ({ userId, email }) => {
  const userModel = User.fromRegistration({ email });
  const profileRow = userModel.toProfileRow(userId);

  const { error: profileError } = await upsertUserProfile(profileRow);

  if (profileError) {
    return {
      ok: false,
      statusCode: 500,
      body: {
        message: `Konto utworzone, ale nie udało się zapisać profilu w ${profileSchema}.${profileTable}`,
        reason: profileError.message,
      },
    };
  }

  return { ok: true };
};

// Mapuje techniczne błędy Supabase na czytelne komunikaty API.
const mapSupabaseError = (error) => {
  const message = error?.message || '';

  if (/already registered|user already registered/i.test(message)) {
    return {
      statusCode: 409,
      message: 'Ten adres e-mail jest już zarejestrowany',
    };
  }

  if (/invalid login credentials|invalid email|password/i.test(message)) {
    return {
      statusCode: 401,
      message: 'Niepoprawny e-mail lub hasło',
    };
  }

  if (/refresh token|jwt|token is invalid|invalid token|session not found/i.test(message)) {
    return {
      statusCode: 401,
      message: 'Sesja wygasła. Zaloguj się ponownie.',
    };
  }

  if (/rate limit|over_email_send_rate_limit|too many requests/i.test(message)) {
    return {
      statusCode: 429,
      message: 'Za dużo prób w krótkim czasie. Spróbuj ponownie za chwilę.',
    };
  }

  return {
    statusCode: 500,
    message: 'Błąd komunikacji z Supabase',
  };
};

const formatAuthResponse = (data, fallbackEmail = null) => ({
  user: {
    id: data?.user?.id || null,
    email: data?.user?.email || fallbackEmail,
  },
  session: data?.session || null,
});

// Rejestruje konto w auth.users i tworzy rekord profilu 1:1.
const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const userModel = User.fromRegistration({ email });

    const signUpOptions = {};

    if (process.env.SUPABASE_EMAIL_REDIRECT_URL) {
      signUpOptions.emailRedirectTo = process.env.SUPABASE_EMAIL_REDIRECT_URL;
    }

    const { data, error } = await supabaseAuthClient.auth.signUp({
      email: userModel.email,
      password,
      options: signUpOptions,
    });

    if (error) {
      const mapped = mapSupabaseError(error);
      return res.status(mapped.statusCode).json({ message: mapped.message });
    }

    if (data?.user?.id) {
      const profileResult = await ensureProfile({
        userId: data.user.id,
        email: data?.user?.email || email,
      });
      if (!profileResult.ok) {
        return res.status(profileResult.statusCode).json(profileResult.body);
      }
    }

    return res.status(201).json({
      message: 'Konto utworzone poprawnie.',
      user: {
        id: data?.user?.id || null,
        email: data?.user?.email || email,
      },
    });
  } catch (err) {
    return next(err);
  }
};

// Logowanie e-mail + hasło i zwrot sesji do klienta mobilnego.
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabaseAuthClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const mapped = mapSupabaseError(error);
      return res.status(mapped.statusCode).json({ message: mapped.message });
    }

    return res.status(200).json({
      message: 'Logowanie zakończone poprawnie.',
      ...formatAuthResponse(data, email),
    });
  } catch (err) {
    return next(err);
  }
};

// Odświeżenie sesji na podstawie refresh tokena zapisnego w aplikacji.
const refreshSession = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const { data, error } = await supabaseAuthClient.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      const mapped = mapSupabaseError(error);
      return res.status(mapped.statusCode).json({ message: mapped.message });
    }

    return res.status(200).json({
      message: 'Sesja odświeżona poprawnie.',
      ...formatAuthResponse(data),
    });
  } catch (err) {
    return next(err);
  }
};

// Wylogowanie: ustawia sesję użytkownika i unieważnia wszystkie sesje (w tym refresh tokeny).
const logout = async (req, res, next) => {
  try {
    const { accessToken, refreshToken } = req.body;

    const { error: sessionError } = await supabaseAuthClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (!sessionError) {
      await supabaseAuthClient.auth.signOut({ scope: 'global' });
    }

    return res.status(200).json({ message: 'Wylogowano poprawnie.' });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  register,
  login,
  refreshSession,
  logout,
};
