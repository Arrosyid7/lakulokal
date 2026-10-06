(function () {
  const hamburger = document.getElementById('hamburger-btn');
  const nav = document.querySelector('nav');

  if (!hamburger || !nav) return;

  const toggleMenu = () => {
    const expanded = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('open', !expanded);
  };

  hamburger.addEventListener('click', toggleMenu);

  const closeMenuOnResize = () => {
    if (window.innerWidth > 860) {
      nav.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  };

  window.addEventListener('resize', closeMenuOnResize);

  const currentPath = window.location.pathname.toLowerCase();
  document.querySelectorAll('.nav-link, .footer-link').forEach(link => {
    const href = (link.getAttribute('href') || '').toLowerCase();
    if (!href || href === '#') return;

    if (href.includes('coba.html') && currentPath.includes('coba')) {
      link.setAttribute('aria-current', 'page');
      link.classList.add('active');
    }

    if (href.includes('blog') && currentPath.includes('/blog')) {
      link.setAttribute('aria-current', 'page');
      link.classList.add('active');
    }

    if ((href === '/' || href === './') && (currentPath === '/' || currentPath.endsWith('/index.html'))) {
      link.setAttribute('aria-current', 'page');
      link.classList.add('active');
    }
  });
})();
