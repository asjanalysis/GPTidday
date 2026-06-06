const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('#nav-links');

if (toggle && links) {
  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  links.addEventListener('click', (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      links.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}
