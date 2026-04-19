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

## Endpointy
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

