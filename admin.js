"use strict";

const config = window.SUNIL_SUPABASE_CONFIG;
const client = config && window.supabase?.createClient && !config.url.includes("YOUR_PROJECT") && !config.anonKey.includes("YOUR_")
  ? window.supabase.createClient(config.url, config.anonKey)
  : null;
const $ = (selector) => document.querySelector(selector);
let categories = [];
let products = [];
let currentImageUrl = null;

function safe(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function slug(value = "") {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function status(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("error", isError);
}
function showDashboard(session) {
  $("#login-panel").hidden = !!session;
  $("#dashboard").hidden = !session;
}
function populateCategories(selected = "") {
  const select = $("#category-select");
  if (!select) return;
  select.innerHTML = '<option value="">Uncategorised</option>' + categories.map((item) =>
    `<option value="${safe(item.id)}" ${item.id === selected ? "selected" : ""}>${safe(item.name)}</option>`
  ).join("");
  $("#category-list").innerHTML = categories.length
    ? categories.map((item) => `<span class="category-chip">${safe(item.name)}</span>`).join("")
    : '<span class="muted">No categories yet.</span>';
}
async function loadCategories() {
  const { data, error } = await client.from("categories").select("id,name,slug,display_order").order("display_order").order("name");
  if (error) throw error;
  categories = data || [];
  populateCategories();
}
async function loadProducts() {
  const target = $("#product-list");
  target.innerHTML = '<p class="muted">Loading products…</p>';
  const { data, error } = await client.from("products")
    .select("id,name,slug,description,image_url,alt_text,is_active,category_id,categories(name)")
    .order("display_order", { ascending: true }).order("created_at", { ascending: false });
  if (error) throw error;
  products = data || [];
  $("#product-count").textContent = String(products.length);
  target.innerHTML = products.length ? products.map((item) => `
    <article class="product-row">
      ${item.image_url ? `<img class="product-thumb" src="${safe(item.image_url)}" alt="">` : '<div class="product-thumb"></div>'}
      <div><div class="product-name">${safe(item.name)}</div><div class="product-description">${safe(item.categories?.name || "Uncategorised")} · ${safe(item.description)}</div><span class="product-state ${item.is_active ? "" : "inactive"}">${item.is_active ? "VISIBLE ON WEBSITE" : "HIDDEN"}</span></div>
      <div class="row-actions"><button type="button" data-edit="${safe(item.id)}">Edit</button><button type="button" class="delete-button" data-delete="${safe(item.id)}">Delete</button></div>
    </article>`).join("") : '<p class="muted">No products have been added yet. Use the form above to add the first product.</p>';
}
function resetProductForm() {
  $("#product-form").reset();
  $("#product-form").elements.id.value = "";
  $("#product-form-title").textContent = "Add a product";
  $("#save-product").textContent = "Save product";
  currentImageUrl = null;
  populateCategories();
}
async function uploadImage(file) {
  if (!file || !file.name) return currentImageUrl;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use a JPG, PNG or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be 5 MB or smaller.");
  const extension = file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from("product-images").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) throw error;
  return client.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}
async function saveProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const save = $("#save-product");
  const data = new FormData(form);
  const id = data.get("id");
  const name = String(data.get("name") || "").trim();
  const categoryId = String(data.get("category_id") || "") || null;
  status($("#product-status"), "Saving…");
  save.disabled = true;
  try {
    const imageUrl = await uploadImage(data.get("image"));
    const product = {
      name,
      slug: slug(name) + (id ? "" : "-" + crypto.randomUUID().slice(0, 6)),
      description: String(data.get("description") || "").trim(),
      category_id: categoryId,
      image_url: imageUrl || null,
      alt_text: String(data.get("alt_text") || name).trim(),
      is_active: data.get("is_active") === "on"
    };
    let result;
    if (id) {
      delete product.slug;
      result = await client.from("products").update(product).eq("id", id);
    } else {
      result = await client.from("products").insert(product);
    }
    if (result.error) throw result.error;
    status($("#product-status"), "Product saved.");
    resetProductForm();
    await loadProducts();
  } catch (error) {
    status($("#product-status"), error.message || "Could not save product.", true);
  } finally {
    save.disabled = false;
  }
}
async function addCategory(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const name = String(new FormData(form).get("name") || "").trim();
  if (!name) return;
  const categorySlug = slug(name);
  status($("#category-status"), "Adding…");
  const { error } = await client.from("categories").insert({ name, slug: categorySlug, display_order: categories.length + 1 });
  if (error) {
    status($("#category-status"), error.message, true);
    return;
  }
  form.reset();
  await loadCategories();
  status($("#category-status"), "Category added.");
}
async function handleProductAction(event) {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) {
    const product = products.find((item) => item.id === editButton.dataset.edit);
    if (!product) return;
    const form = $("#product-form");
    form.elements.id.value = product.id;
    form.elements.name.value = product.name || "";
    form.elements.description.value = product.description || "";
    form.elements.alt_text.value = product.alt_text || "";
    form.elements.is_active.checked = !!product.is_active;
    currentImageUrl = product.image_url;
    populateCategories(product.category_id || "");
    $("#product-form-title").textContent = "Edit product";
    $("#save-product").textContent = "Update product";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (deleteButton) {
    const product = products.find((item) => item.id === deleteButton.dataset.delete);
    if (!product || !window.confirm(`Delete "${product.name}" permanently?`)) return;
    const { error } = await client.from("products").delete().eq("id", product.id);
    if (error) {
      status($("#product-status"), error.message, true);
      return;
    }
    if ($("#product-form").elements.id.value === product.id) resetProductForm();
    await loadProducts();
  }
}
async function init() {
  if (!client) {
    status($("#login-status"), "Add your Supabase project URL and anon key to supabase-config.js first.", true);
    $("#login-form").querySelector("button").disabled = true;
    return;
  }
  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    status($("#login-status"), "Signing in…");
    const { error } = await client.auth.signInWithPassword({
      email: String(data.get("email") || "").trim(),
      password: String(data.get("password") || "")
    });
    if (error) status($("#login-status"), error.message, true);
  });
  $("#sign-out").addEventListener("click", async () => { await client.auth.signOut(); });
  $("#product-form").addEventListener("submit", saveProduct);
  $("#category-form").addEventListener("submit", addCategory);
  $("#product-list").addEventListener("click", handleProductAction);
  $("#reset-form").addEventListener("click", resetProductForm);
  $("#refresh-products").addEventListener("click", async () => {
    try { await Promise.all([loadCategories(), loadProducts()]); status($("#product-status"), "Catalogue refreshed."); }
    catch (error) { status($("#product-status"), error.message, true); }
  });
  client.auth.onAuthStateChange((_event, session) => {
    showDashboard(session);
    if (session) {
      Promise.all([loadCategories(), loadProducts()]).catch((error) => status($("#product-status"), error.message, true));
    }
  });
  const { data } = await client.auth.getSession();
  showDashboard(data.session);
  if (data.session) {
    try { await Promise.all([loadCategories(), loadProducts()]); }
    catch (error) { status($("#product-status"), error.message, true); }
  }
}
document.addEventListener("DOMContentLoaded", init);
