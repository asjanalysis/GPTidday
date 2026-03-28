import { DEFAULT_FILTERS, applyFilters } from './model.js';

const app = document.querySelector('#app');
let filters = { ...DEFAULT_FILTERS };
let favorites = new Set(JSON.parse(localStorage.getItem('ttt-favorites') || '[]'));
let data = { generated_at: '', product_count: 0, products: [] };

function trackOutbound(product) {
  window.dispatchEvent(new CustomEvent('outbound_product_click', { detail: { id: product.id, retailer: product.retailer_name, url: product.source_product_url } }));
}

function saveFavorites() {
  localStorage.setItem('ttt-favorites', JSON.stringify([...favorites]));
}

function nav() {
  return `
    <header>
      <a class="logo" href="#/">Tiny Thrash Threads</a>
      <nav>
        <a href="#/browse">Browse</a>
        <a href="#/favorites">Favorites</a>
        <a href="#/about">About</a>
      </nav>
    </header>
  `;
}

function productCard(p) {
  const saved = favorites.has(p.id);
  return `<article class="card">
    <div class="img-wrap"><img src="${p.image_url}" alt="${p.title} from ${p.retailer_name}"/><span class="pill">${p.retailer_name}</span>${p.original_price ? '<span class="sale">Sale</span>' : ''}</div>
    <div class="body">
      <p class="brand">${p.brand}</p>
      <h3><a href="#/product/${p.slug}">${p.title}</a></h3>
      <p class="meta">${p.category} • ${p.age_range}</p>
      <div class="tags">${p.style_tags.slice(0,4).map((t)=>`<span>${t}</span>`).join('')}</div>
      <p class="price"><strong>$${p.current_price.toFixed(2)}</strong>${p.original_price ? `<s>$${p.original_price.toFixed(2)}</s>` : ''}</p>
      <div class="actions">
      <button data-fav="${p.id}">${saved ? '★ Saved' : '☆ Save'}</button>
      <a data-out="${p.id}" target="_blank" rel="noreferrer" href="${p.source_product_url}">View on retailer site</a>
      </div>
    </div>
  </article>`;
}

function homePage() {
  const collections = ['Tiny Groms', 'Mini Punk', 'Surf Baby', 'Toddler Streetwear', 'Checkerboard Classics'];
  return `${nav()}<main>
    <section class="hero"><p class="kicker">Curated aggregator • live retailer pricing</p><h1>Tiny Thrash Threads</h1><p>Infant + toddler punk/surf/skate essentials sourced from official retailer pages.</p><a class="cta" href="#/browse">Browse catalog</a></section>
    <section><h2>Curated collections</h2><div class="collections">${collections.map((c) => `<div class="collection">${c}</div>`).join('')}</div></section>
    <section><h2>Trending now</h2><div class="grid">${data.products.slice(0, 8).map(productCard).join('')}</div></section>
  </main>${footer()}`;
}

function filterControls(options) {
  const sel = (k, vals, label) => `<label>${label}<select data-filter="${k}"><option value="all">All ${label.toLowerCase()}</option>${vals.map((v) => `<option value="${v}" ${filters[k]===v?'selected':''}>${v}</option>`).join('')}</select></label>`;
  return `<section class="filters">
    <label>Search<input data-filter="query" value="${filters.query}" placeholder="checkerboard hoodie beach"/></label>
    ${sel('category', options.categories, 'Category')}
    ${sel('ageRange', options.ages, 'Age')}
    ${sel('brand', options.brands, 'Brand')}
    ${sel('retailer', options.retailers, 'Retailer')}
    ${sel('styleTag', options.styleTags, 'Style')}
    <label>Gender<select data-filter="gender"><option value="all">All fits</option><option value="neutral" ${filters.gender==='neutral'?'selected':''}>Gender-neutral</option><option value="boy" ${filters.gender==='boy'?'selected':''}>Boy</option><option value="girl" ${filters.gender==='girl'?'selected':''}>Girl</option></select></label>
    <label>Sort<select data-filter="sort"><option value="featured">Featured / Curated</option><option value="newest">Newest</option><option value="price_asc">Price low to high</option><option value="price_desc">Price high to low</option><option value="updated">Recently updated</option></select></label>
  </section>`;
}

function browsePage() {
  const options = {
    ages: [...new Set(data.products.map((p) => p.age_range))],
    categories: [...new Set(data.products.map((p) => p.category))],
    brands: [...new Set(data.products.map((p) => p.brand))],
    retailers: [...new Set(data.products.map((p) => p.retailer_name))],
    styleTags: [...new Set(data.products.flatMap((p) => p.style_tags))]
  };
  const filtered = applyFilters(data.products, filters);
  return `${nav()}<main><h1>Browse catalog</h1>${filterControls(options)}<p class="small">${filtered.length} products</p><div class="grid">${filtered.map(productCard).join('')}</div>${filtered.length ? '' : '<p>No matching items found.</p>'}</main>${footer()}`;
}

function productPage(slug) {
  const p = data.products.find((x) => x.slug === slug);
  if (!p) return `${nav()}<main><p>Product not found.</p></main>${footer()}`;
  const related = data.products.filter((x) => x.id !== p.id && x.style_tags.some((t) => p.style_tags.includes(t))).slice(0, 4);
  return `${nav()}<main class="detail"><img class="detail-img" src="${p.image_url}" alt="${p.title}"/><section><p class="kicker">${p.retailer_name} • ${p.brand}</p><h1>${p.title}</h1><p>${p.description_short || ''}</p><p class="price"><strong>$${p.current_price.toFixed(2)}</strong></p><p>Sizes: ${p.sizes.length ? p.sizes.join(', ') : 'See retailer page'}</p><a class="cta" data-out="${p.id}" target="_blank" rel="noreferrer" href="${p.source_product_url}">View on retailer site</a></section><section><h2>Related items</h2><ul>${related.map((r)=>`<li><a href="#/product/${r.slug}">${r.title}</a></li>`).join('')}</ul></section></main>${footer()}`;
}

function favoritesPage() {
  const favs = data.products.filter((p) => favorites.has(p.id));
  return `${nav()}<main><h1>Saved favorites</h1>${favs.length ? `<div class="grid">${favs.map(productCard).join('')}</div>` : '<p>You have no saved favorites yet.</p>'}</main>${footer()}`;
}

function aboutPage() {
  return `${nav()}<main><h1>About & methodology</h1><p>Tiny Thrash Threads is a curated aggregator for infant and toddler punk/surf/skate fashion. We do not sell products directly.</p><p>Prices and availability are sourced from external retailers and can change without notice.</p><p>Last refresh: <strong>${new Date(data.generated_at).toLocaleString()}</strong>.</p><p>Curation includes include/exclude keyword controls, style-tag inference, category normalization, age targeting, and dedupe keys.</p></main>${footer()}`;
}

function footer() {
  return `<footer><small>Aggregator only • External retailers own checkout • ${data.product_count} products indexed</small></footer>`;
}

function render() {
  const hash = window.location.hash || '#/';
  const [, route, slug] = hash.match(/^#\/(\w+)?\/?(.*)?$/) || [];
  if (!route) app.innerHTML = homePage();
  else if (route === 'browse') app.innerHTML = browsePage();
  else if (route === 'product') app.innerHTML = productPage(slug);
  else if (route === 'favorites') app.innerHTML = favoritesPage();
  else if (route === 'about') app.innerHTML = aboutPage();
  else app.innerHTML = `${nav()}<main><p>Page not found.</p></main>${footer()}`;

  app.querySelectorAll('[data-fav]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-fav');
      if (!id) return;
      favorites.has(id) ? favorites.delete(id) : favorites.add(id);
      saveFavorites();
      render();
    });
  });

  app.querySelectorAll('[data-out]').forEach((link) => {
    link.addEventListener('click', () => {
      const id = link.getAttribute('data-out');
      const product = data.products.find((p) => p.id === id);
      if (product) trackOutbound(product);
    });
  });

  app.querySelectorAll('[data-filter]').forEach((el) => {
    el.addEventListener('change', () => {
      filters[el.getAttribute('data-filter')] = el.value;
      render();
    });
    if (el.tagName === 'INPUT') {
      el.addEventListener('input', () => {
        filters[el.getAttribute('data-filter')] = el.value;
        render();
      });
    }
  });
}

async function init() {
  const res = await fetch('data/products.generated.json');
  data = await res.json();
  render();
  window.addEventListener('hashchange', render);
}

init();
