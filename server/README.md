# Server auth + profiles

Ten backend trzyma logikę Supabase tylko po stronie Express:
- `auth.users` -> e-mail, hasło (hash), stan autoryzacji
- `public.profiles` -> dane aplikacyjne użytkownika (1:1 po `id`)

## Wymagane env
Skopiuj `server/.env.example` do `server/.env` i uzupełnij wartości:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_EMAIL_REDIRECT_URL` (opcjonalne)
- `PROFILE_SCHEMA` (domyślnie `public`)
- `PROFILE_TABLE` (domyślnie `profiles`)
- `PROFILE_AVATAR_BUCKET` (domyślnie `avatars`)
- `PROFILE_AVATAR_BUCKET_PUBLIC` (`true` dla public bucket, domyślnie `false`)
- `PROFILE_AVATAR_SIGNED_URL_TTL` (sekundy dla signed URL, domyślnie `3600`)

## Endpointy
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/profile/me`
- `PATCH /api/profile/me`
- `POST /api/profile/avatar`

