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

  console.log('[PROFILE_UPSERT_PAYLOAD]', {
    profileTarget: `${profileSchema}.${profileTable}`,
    payload: profileRow,
  });

  const { error: profileError } = await upsertUserProfile(profileRow);

  if (profileError) {
    console.error('[PROFILE_UPSERT_ERROR]', {
      profileTarget: `${profileSchema}.${profileTable}`,
      payload: profileRow,
      message: profileError.message,
      details: profileError.details,
      hint: profileError.hint,
      code: profileError.code,
    });

    console.error('[PROFILE_UPSERT_HINTS]', {
      note: 'Sprawdz, czy tabela i kolumny istnieja oraz czy id jest uuid primary key i FK do auth.users(id).',
    });

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
      statusCode: 400,
      message: 'Niepoprawne dane logowania lub rejestracji',
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

// Rejestruje konto w auth.users i tworzy rekord profilu 1:1.
const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const userModel = User.fromRegistration({ email });

    console.log('[REGISTER_REQUEST]', {
      email,
      profileTarget: `${profileSchema}.${profileTable}`,
    });

    const signUpOptions = {};

    if (process.env.SUPABASE_EMAIL_REDIRECT_URL) {
      signUpOptions.emailRedirectTo = process.env.SUPABASE_EMAIL_REDIRECT_URL;
    }

    const { data, error } = await supabaseAuthClient.auth.signUp({
      email: userModel.email,
      password,
      options: signUpOptions,
    });

    console.log('[REGISTER_SIGNUP_RESULT]', {
      hasUser: Boolean(data?.user),
      userId: data?.user?.id || null,
      userEmail: data?.user?.email || null,
    });

    if (error) {
      console.error('[REGISTER_SIGNUP_ERROR]', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status: error.status,
      });
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

module.exports = {
  register,
};

