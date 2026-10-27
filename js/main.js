// Mobile menu
const toggle = document.querySelector('.menu-toggle');
const links = document.getElementById('nav-links');
if (toggle && links) {
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
}

// Animal category tabs
const tabs = [...document.querySelectorAll('.tab')];
function selectTab(tab) {
  tabs.forEach(t => {
    const on = t === tab;
    t.setAttribute('aria-selected', on);
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  });
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', e => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    const next = tabs[(i + dir + tabs.length) % tabs.length];
    selectTab(next);
    next.focus();
  });
});

// Gallery show more
const grid = document.getElementById('gallery-grid');
const more = document.getElementById('gallery-toggle');
if (grid && more) {
  more.addEventListener('click', () => {
    const collapsed = grid.classList.toggle('collapsed');
    more.textContent = collapsed ? 'See more photos' : 'Show fewer photos';
    more.setAttribute('aria-expanded', !collapsed);
    if (collapsed) grid.scrollIntoView({ behavior: 'smooth' });
  });
}

// Lightbox
const lb = document.getElementById('lightbox');
if (lb && grid) {
  const lbImg = lb.querySelector('img');
  const photos = [...grid.querySelectorAll('img')];
  let current = 0;
  const show = i => {
    current = (i + photos.length) % photos.length;
    lbImg.src = photos[current].src;
    lbImg.alt = photos[current].alt;
  };
  const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; };
  grid.querySelectorAll('button').forEach((btn, i) => btn.addEventListener('click', () => {
    show(i);
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    lb.querySelector('.lb-close').focus();
  }));
  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', () => show(current - 1));
  lb.querySelector('.lb-next').addEventListener('click', () => show(current + 1));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
}

// Reveal on scroll
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('in'));
}

// Footer year
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

// Don't allow booking dates in the past
const dateInput = document.getElementById('b-date');
if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

// Booking request form: 2-hour minimum for Packages 3 & 4, email via FormSubmit
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
  const pkg = document.getElementById('b-package');
  const hours = document.getElementById('b-hours');
  const oneHour = hours.querySelector('option[value="1 hour"]');

  pkg.addEventListener('change', () => {
    const twoHourMin = /^Package [34]/.test(pkg.value);
    oneHour.disabled = twoHourMin;
    oneHour.textContent = twoHourMin ? '1 hour (2-hour minimum for this package)' : '1 hour';
    if (twoHourMin && hours.value === '1 hour') hours.value = '';
  });

  bookingForm.addEventListener('submit', () => {
    bookingForm.querySelector('[name="_next"]').value = new URL('thank-you.html', location.href).href;
  });
}
