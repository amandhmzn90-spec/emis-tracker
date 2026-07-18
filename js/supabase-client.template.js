/* ==========================================================
   supabase-client.js  (GENERATED FILE — do not edit directly)
   This is generated at build time (scripts/build.js) from the
   template js/supabase-client.template.js, substituting the
   SUPABASE_URL / SUPABASE_ANON_KEY environment variables so the
   real credentials never have to be hardcoded in source control.
   The anon key is safe to expose in client-side code by design —
   it only works within the permissions granted by the Row Level
   Security policies set up in supabase-schema.sql (see the
   project root). Anyone with this URL + key can read/write the
   data those policies allow, which is the intended behavior for
   a small internal tool shared with coworkers.
   ========================================================== */

const SUPABASE_URL = "__SUPABASE_URL__";
const SUPABASE_ANON_KEY = "__SUPABASE_ANON_KEY__";

// `supabase` here is the global from the CDN script (@supabase/supabase-js).
const SB = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
