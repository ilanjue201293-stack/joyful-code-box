// Columns safe to select from the client. `source_code` is intentionally
// excluded — it is column-revoked at the database level and must be fetched
// via the get_script_source / get_source_source RPCs.

export const SCRIPT_PUBLIC_COLS =
  "id,name,slug,description,features,screenshots,youtube_url,discord_url,tags,status,is_premium,payment_method,sellauth_url,paypal_url,ltc_address,verified_by_nalyy,badges,views,developer,created_at,updated_at";

export const SOURCE_PUBLIC_COLS =
  "id,name,slug,description,screenshots,discord_url,tags,status,access_method,sellauth_url,paypal_url,ltc_address,discord_redirect_url,views,created_at,updated_at";
