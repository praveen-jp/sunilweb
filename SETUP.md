# Sunil Stickering & Digitals — setup guide

The public website is a lightweight static site. Supabase is optional for local preview and becomes the data source for the unlimited product catalogue and the Google reviews integration after configuration.

## 1. Create and configure Supabase (step by step)

Do this when you are ready to activate the catalogue. The website can still be previewed with the sample catalogue while Supabase is not configured.

1. Open [Supabase](https://supabase.com/) and sign in. Choose **New project**.
2. Select the organisation, enter a project name such as `sunil-digitals`, set a strong database password and choose a region close to your users (for this business, an India region if available). Save the database password somewhere secure.
3. Wait until the project status is ready. Open **SQL Editor → New query**.
4. Open `supabase/schema.sql` in this repository, copy the entire file, paste it into the SQL Editor and click **Run**. Confirm the query completes successfully. This creates the catalogue tables, admin allow-list and Row Level Security policies, plus the product image Storage bucket and its policies.
5. Open **Project Settings → API** (in some dashboard layouts this appears as **Project Settings → API Keys**). Copy:
   - Project URL
   - Publishable/anon key (the browser-safe public key)
6. Open `supabase-config.js` and replace the two placeholders with those values. This file is intentionally the public browser configuration. **Never paste a secret key or the legacy `service_role` key into it, GitHub, HTML or JavaScript.** RLS is the security boundary.
7. In **Authentication → Sign In / Providers**, enable Email/password sign-in. Keep public sign-ups disabled; admins should be created deliberately by the project owner.
8. Open **Authentication → Users → Add user**, create the first admin using an email you control and a strong unique password. Confirm the user is created.
9. Copy that user's UUID from the Users table. Return to **SQL Editor** and run the following, replacing the sample UUID with the real one:

   ```sql
   insert into public.admin_users (user_id)
   values ('PASTE-AUTH-USER-UUID-HERE');
   ```

10. Deploy the branch preview and visit `/admin.html`. Sign in with the user you just created. Test adding a draft product, uploading a small image, editing it, hiding it, publishing it and deleting a test record. Confirm the public catalogue only shows published products. Do not add real catalogue entries until the workflow is tested.

If the insert reports a duplicate key, that UUID is already allow-listed. To remove an admin later, delete only that user's row from `public.admin_users`; do not delete unrelated Auth users.

### 1A. Connect the website to your Supabase project

The repository currently contains placeholder values in `supabase-config.js`. For this static Vercel site, update that file on the redesign branch with the Project URL and publishable/anon key from your own Supabase project, then push a commit so the Vercel preview rebuilds. The public key is expected to be visible in the browser; security must come from the schema's Row Level Security policies and the admin UUID allow-list, not from hiding the public key.

After the preview works, configure the same values for the production deployment only when you later decide to launch. Never add the database password, Google API key, Supabase secret key or `service_role` key to frontend environment variables or source files.

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

## 3. Genuine Google reviews (can be connected later)

You do not need access to manage the Google Business Profile just to request public Place Details. When you are able to open the correct public listing, we will need its exact Place ID. The short Google share link currently on the site is retained as the visitor link, but it is not yet confirmed as the Place ID. Do not guess the ID or connect a similarly named listing.



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

The API key and Place ID are Edge Function secrets; they are not exposed in website JavaScript. The function returns the available review data, rating, review count and Google Maps URL. Google Places API Place Details returns a limited set (up to five) of reviews in relevance order; the website links visitors to Google for the complete/current review view. Review availability, order and freshness are determined by Google. Google attribution, reviewer profile links/photos, individual review source links and reporting links are retained. The Places API policy prohibits pre-fetching, caching or storing Places content beyond specific exceptions, so this implementation does not cache review content. Requesting the `reviews` field triggers the Place Details Enterprise + Atmosphere billing tier; check current Google Maps Platform pricing and set quotas/budget alerts before enabling it.

Until the exact Place ID and secrets are available, the page shows a clear “Reviews connection pending” message and a direct link to the Google listing. No star rating, review count, testimonial or review card is invented. This does not block the website launch. You can send the public listing link now; we can connect the API later once the exact Place ID is identified.

## 4. Preview and production deployment

The current redesign is intentionally kept on `redesign/business-intro-catalogue` in pull request #1. Vercel creates a preview for this branch. Review that preview and test the mobile layout, navigation, catalogue filters, contact links and (after setup) admin login. **Do not merge this pull request until you explicitly decide to publish.** The production website remains unchanged while the PR is open.

When you later approve a production launch, merge the PR to `main` yourself. Add and verify a custom domain in Vercel when ready; then update the canonical URL, Open Graph URL, JSON-LD URL, robots sitemap URL and sitemap location to that domain.

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
