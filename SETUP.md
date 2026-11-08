# Sunil Stickering & Digitals — setup guide

The public website is a lightweight static site. Supabase is optional for local preview and becomes the data source for the unlimited product catalogue and the Google reviews integration after configuration.

## 1. Supabase project

1. Create a Supabase project.
2. Open **SQL Editor** and run the complete contents of `supabase/schema.sql`.
3. Open **Project Settings → API** and copy the Project URL and anon/public key.
4. Replace the placeholders in `supabase-config.js`:

   ```js
   window.SUNIL_SUPABASE_CONFIG = {
     url: "https://YOUR_PROJECT_REF.supabase.co",
     anonKey: "YOUR_SUPABASE_ANON_KEY"
   };
   ```

   The anon key is designed for browser use. **Never put the service_role key in this file or any frontend code.** The database and Storage Row Level Security policies are the access control.

5. In **Authentication → Providers**, enable Email. Keep public sign-ups disabled.
6. In **Authentication → Users**, create the first admin user with a strong password.
7. Copy that user's UUID and run this in the SQL Editor:

   ```sql
   insert into public.admin_users (user_id)
   values ('PASTE-AUTH-USER-UUID-HERE');
   ```

Only UUIDs explicitly added to `public.admin_users` can make catalogue changes. Create further admin users in the Auth dashboard and explicitly allow-list each UUID.

## 2. Admin dashboard

After deployment, open:

`https://YOUR-WEBSITE/admin.html`

Sign in with the approved Supabase Auth email and password. The admin can:

- Add as many products as needed.
- Edit product details and category.
- Upload JPG, PNG or WebP images up to 5 MB.
- Publish or hide products.
- Delete products.
- Create additional categories.

There is deliberately no price field. Product pages show enquiry actions only. Product image files are stored in the public `product-images` bucket. Keep passwords private and use unique credentials.

## 3. Genuine Google reviews

The website does not contain fabricated testimonials. The Edge Function at `supabase/functions/google-reviews/index.ts` requests the Place Details (New) API when the homepage loads.

1. In Google Cloud, enable **Places API (New)** and configure billing.
2. Identify the exact Google Business Profile listing and obtain its Google Place ID. Do not use a similarly named business.
3. Restrict the API key to Places API (New), set usage quotas and billing alerts.
4. Install and link the Supabase CLI, then set server-only secrets:

   ```sh
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase secrets set GOOGLE_MAPS_API_KEY=YOUR_RESTRICTED_KEY GOOGLE_PLACE_ID=YOUR_EXACT_PLACE_ID
   supabase functions deploy google-reviews
   ```

The API key and Place ID are Edge Function secrets; they are not exposed in website JavaScript. The function returns the available review data, rating, review count and Google Maps URL. Google Places API Place Details returns a limited set (up to five) of reviews; the website links visitors to Google for the full/current review view. Review availability, order and freshness are determined by Google. Google attribution and author links are retained.

Until the correct Place ID and secrets are configured and the function is deployed, the page shows a direct Google Maps search link rather than pretend reviews.

## 4. Deploy

The repository is connected to Vercel (if the existing project integration remains active). Review the branch preview first, then merge the pull request to `main) to trigger production deployment. Add and verify a custom domain in Vercel when ready; then update the canonical URL, Open Graph URL, JSON-LD URL, robots sitemap URL and sitemap location to that domain.

## 5. Search indexing checklist

- The existing Google Search Console verification HTML file is retained.
- Confirm the production page loads over HTTPS and returns HTTP 200.
- Verify the final canonical URL in Search Console.
- Submit `https://YOUR-WEBSITE/sitemap.xml` in Search Console.
- Use URL Inspection → Request indexing for the homepage after the final production deploy.
- Verify the business details in JSON-LD with Google's Rich Results Test and Schema Markup Validator.
- Maintain consistent name, address and phone details on the Google Business Profile and website.
- Use genuine, compressed photographs with descriptive alt text.
- Measure Core Web Vitals and Search Console queries over time.

A sitemap and good technical SEO make crawling easier; they do not guarantee indexing, ranking, or first position. Local search ranking also depends on the accuracy and prominence of the Business Profile, relevance and distance. Do not add fake reviews, artificial ratings, fabricated experience claims or keyword stuffing.

## 6. Current limitations / items to confirm

- The initial visible catalogue includes sample product descriptions and currently available repository photographs; replace text-only photo placeholders with actual product photographs before promoting those products.
- Google reviews are not live until the exact Place ID and Google Cloud API key are configured.
- Supabase products/admin are not active until the project URL, anon key, SQL schema and first approved admin are configured.
- The current public canonical URL is the Vercel deployment. Replace it after a custom domain is added.
- Phone numbers, email, shop address and working hours are carried over from the supplied existing website. Confirm they are still correct before production.
