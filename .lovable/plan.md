# Plan — major feature pass

This is a large set of changes. I'll group them into 6 chunks and ship in order.

## 1. Fix reviews visibility
- Investigate why posted reviews don't show up. Check `scripts.$slug.tsx` mutation + `reviews.tsx` list query.
- Ensure cache invalidation refetches the list everywhere reviews show (per-script + global `/reviews` page).
- Make sure `profiles` join still works after recent FK changes.

## 2. Notifications system
**Database (migration):**
- `notifications`: id, recipient_id, title, body, link, kind (enum: `free_script`, `paid_script`, `free_source`, `paid_source`, `new_store`, `store_approved`, `admin_broadcast`, `admin_only`), read (bool), created_at
- `notification_preferences`: user_id PK, free_script bool, paid_script bool, free_source bool, paid_source bool, new_store bool (defaults true). Admin-only + store_approved are always sent regardless.
- RLS: user sees/updates own notifications + prefs; admins insert via server fn.

**Server functions:**
- `sendNotification({ scope: "all" | "admins" | "users", user_ids?, title, body, link, kind })` — admin only, expands recipients & inserts rows (respecting prefs unless kind is forced).
- Auto-trigger on script/source create (existing `notifyContentChange` extended) and on store creation/approval.

**UI:**
- Navbar bell with unread count + dropdown list.
- Profile page: notification preference checkboxes (toggleable kinds only).
- Admin dashboard: "Notifications" panel — pick scope, pick users (multi-select with search), title/body/link.

## 3. Store request flow — products are scripts or sources
- In `CreateStoreDialog` (store.tsx), each product gets a "Type: script | source" radio.
- If "script": same fields as admin Script editor (name, description, features, tags, screenshots up to 5, cover via thumbnail click, youtube, discord, payment fields, status, premium, source_code optional).
- If "source": same fields as admin Source editor (name, description, screenshots, tags, status, access_method, payment fields, discord_redirect_url).
- Store `type` and full payload in `store_requests.products[]` JSONB and `store_products` row.
- Add `kind` column to `store_products` (script|source) + relevant nullable columns to mirror script/source fields.

## 4. Admin store request review — granular accept
- Replace single "Approve" with per-product checkboxes; admin can accept all, some, or reject.
- Show full request details (all product fields, screenshots).
- Store delete: in admin Store panel, button to delete entire store OR individual product.

## 5. Ratings on products
- Add `product_reviews` table (product_id, user_id, rating, text, created_at) + RLS so only users marked `verified_buyer` for that product (via admin) can post.
- Add `product_buyers` table (product_id, user_id, approved_by, approved_at) — admin marks via Users panel.
- Remove default ⭐ on product cards. Replace with: average rating in stars if reviews exist, else "No ratings" with grey stars.

## 6. Profile avatar = image upload only
- Replace avatar URL text input on `/profile` with `MediaUploader` (max=1, accept="image/*").

---

## Technical details
- All migrations include GRANTs + RLS as required.
- Reuse `MediaUploader` everywhere for screenshots & avatar.
- Notification bell uses a polling `useQuery` (30s refetch) — keeps it simple; realtime can come later.
- Storage bucket `media` already exists and is used.

## Order of execution
1. DB migration (notifications, prefs, product reviews, buyers, store_products kind column + extra fields)
2. Server functions (notifications + updated store request approval)
3. UI: reviews fix, navbar bell, profile prefs + avatar upload
4. UI: store request dialog rebuild, admin store panel, ratings on cards
