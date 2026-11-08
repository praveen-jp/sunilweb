"use strict";

const BUSINESS_PHONE = "+919949894891";
const BUSINESS_WHATSAPP = "919949894891";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function slugify(value = "") {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildProductCard(product, index) {
  const name = escapeHtml(product.name || "Product");
  const description = escapeHtml(product.description || "Contact us to discuss your requirement.");
  const image = product.image_url ? escapeHtml(product.image_url) : "";
  const alt = escapeHtml(product.alt_text || product.name || "Product photograph");
  const categoryName = escapeHtml(product.categories?.name || product.category_name || "CUSTOM WORKS");
  const categorySlug = escapeHtml(product.categories?.slug || product.category_slug || "custom");
  const message = encodeURIComponent("Hello, I would like to enquire about " + (product.name || "your products") + ".");
  const imageMarkup = image
    ? `<a class="product-image" href="${image}" target="_blank" rel="noopener"><img src="${image}" alt="${alt}" loading="lazy"></a>`
    : '<div class="product-image image-placeholder" role="img" aria-label="Photograph to be added"><span>PRODUCT<br>PHOTOGRAPH</span></div>';

  return `<article class="product-card" data-category="${categorySlug}">
    ${imageMarkup}
    <div class="product-meta"><span>${String(index + 1).padStart(2, "0")} / ${categoryName.toUpperCase()}</span><span>MADE TO ORDER</span></div>
    <h3>${name}</h3><p>${description}</p>
    <a class="product-contact" href="https://wa.me/${BUSINESS_WHATSAPP}?text=${message}" target="_blank" rel="noopener">Enquire about this <span>↗</span></a>
  </article>`;
}

function setupNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".site-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    nav.classList.toggle("open", !expanded);
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }));
}

function setupRevealMotion() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
  items.forEach((item) => observer.observe(item));
}

function setupFilters() {
  const container = document.getElementById("category-filters");
  if (!container) return;
  container.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category]");
    if (!button) return;
    const category = button.dataset.category;
    container.querySelectorAll("button").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("#product-grid .product-card").forEach((card) => {
      card.hidden = category !== "all" && card.dataset.category !== category;
    });
  });
}

function supabaseClient() {
  const config = window.SUNIL_SUPABASE_CONFIG;
  if (!config || !config.url || !config.anonKey || config.url.includes("YOUR_PROJECT") || config.anonKey.includes("YOUR_")) return null;
  if (!window.supabase?.createClient) return null;
  return window.supabase.createClient(config.url, config.anonKey);
}

async function loadCatalogue(client) {
  const grid = document.getElementById("product-grid");
  const filters = document.getElementById("category-filters");
  if (!client || !grid) return;
  const { data, error } = await client.from("products")
    .select("id,name,description,image_url,alt_text,display_order,categories(name,slug)")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("Product catalogue could not be loaded; showing starter catalogue.", error.message);
    return;
  }
  if (!Array.isArray(data)) return;
  if (!data.length) {
    grid.innerHTML = '<p class="catalogue-empty">Our catalogue is being updated. Please contact us for current product information.</p>';
    return;
  }
  grid.innerHTML = data.map(buildProductCard).join("");
  if (filters) {
    const categories = [...new Map(data.filter((item) => item.categories?.slug).map((item) => [item.categories.slug, item.categories])).values()];
    filters.innerHTML = '<button class="filter-button active" type="button" data-category="all" aria-pressed="true">All products</button>' +
      categories.map((category) => `<button class="filter-button" type="button" data-category="${escapeHtml(category.slug)}" aria-pressed="false">${escapeHtml(category.name)}</button>`).join("");
  }
}

function renderGoogleReviews(payload) {
  const target = document.getElementById("google-reviews");
  if (!target || !Array.isArray(payload?.reviews) || !payload.reviews.length) return;
  const ratingSummary = payload.rating != null
    ? `<div class="google-rating-summary"><strong>${Number(payload.rating).toFixed(1)}</strong><span aria-label="Google rating">${"★".repeat(Math.round(Number(payload.rating)))}</span><small>${Number(payload.userRatingCount || 0).toLocaleString("en-IN")} Google ratings</small></div>`
    : "";
  const source = document.querySelector("[data-google-source]");
  if (source && payload.googleMapsUri) source.href = payload.googleMapsUri;
  const providerAttributions = Array.isArray(payload.attributions) ? payload.attributions.map((item) => {
    const label = escapeHtml(item.provider || item.text || "");
    return item.providerUri ? `<a href="${escapeHtml(item.providerUri)}" target="_blank" rel="noopener">${label}</a>` : label;
  }).filter(Boolean).join(" · ") : "";
  target.innerHTML = ratingSummary + '<div class="review-list">' + payload.reviews.map((review) => {
    const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
    const stars = "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
    const author = escapeHtml(review.authorAttribution?.displayName || review.author_name || "Google reviewer");
    const text = escapeHtml(review.text?.text || review.text || "");
    const time = escapeHtml(review.relativePublishTimeDescription || "");
    const authorUri = review.authorAttribution?.uri;
    const photoUri = review.authorAttribution?.photoUri;
    const authorLabel = authorUri
      ? `<a class="review-author" href="${escapeHtml(authorUri)}" target="_blank" rel="noopener">${author}</a>`
      : `<span class="review-author">${author}</span>`;
    const avatar = photoUri ? `<img class="review-avatar" src="${escapeHtml(photoUri)}" alt="" loading="lazy">` : "";
    const reviewSource = review.googleMapsUri || payload.googleMapsUri;
    const sourceLink = reviewSource ? `<a class="review-source" href="${escapeHtml(reviewSource)}" target="_blank" rel="noopener">View on Google Maps ↗</a>` : "";
    const reportLink = review.flagContentUri ? `<a class="review-report" href="${escapeHtml(review.flagContentUri)}" target="_blank" rel="noopener">Report</a>` : "";
    return `<article class="review-item"><div class="review-top"><div class="review-byline">${avatar}${authorLabel}</div><span class="review-stars" aria-label="${rating} out of 5 stars">${stars}</span></div><div class="review-time">${time}</div><p class="review-text">${text || "This customer left a Google rating."}</p><div class="review-actions">${sourceLink}${reportLink}</div></article>`;
  }).join("") + `</div><p class="review-order-note">Reviews are shown in Google’s relevance order. Places API returns up to five reviews.${providerAttributions ? " " + providerAttributions : ""}</p><p class="review-policy-note">Google reviews are user-submitted. <a href="https://policies.google.com/terms" target="_blank" rel="noopener">Google Terms</a>.</p>`;
}

async function loadGoogleReviews(client) {
  if (!client) return;
  const target = document.getElementById("google-reviews");
  try {
    const { data, error } = await client.functions.invoke("google-reviews");
    if (error) throw error;
    if (data?.reviews?.length) renderGoogleReviews(data);
    else if (target && data?.message) target.innerHTML = '<p class="review-placeholder">' + escapeHtml(data.message) + '</p>';
  } catch (error) {
    console.info("Google reviews are not configured yet. The live Google profile link remains available.", error?.message || error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("year")?.replaceChildren(String(new Date().getFullYear()));
  setupNavigation();
  setupRevealMotion();
  setupFilters();
  const client = supabaseClient();
  await Promise.all([loadCatalogue(client), loadGoogleReviews(client)]);
});
