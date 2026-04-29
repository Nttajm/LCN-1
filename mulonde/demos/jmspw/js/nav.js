document.addEventListener('DOMContentLoaded', () => {
(() => {
  // ─── Config ────────────────────────────────────────────────────────────────
  const PHONE_DISPLAY  = '(707) 856-2423';
  const PHONE_TEL      = '7078562423';
  const EMAIL          = 'info@jmspressurewashing.com';
  const QUOTE_PAGE     = 'qoute.html';

  const NAV_LINKS = [
    { label: 'Home',                href: 'index.html' },
    { label: 'Our Team',            href: '#' },
    { label: 'Commercial Services', href: 'commercial.html' },
  ];

  // ─── Active-link detection ─────────────────────────────────────────────────
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  function isActive(href) {
    if (href === '#') return false;
    return href === currentFile;
  }
  function activeClass(href) {
    return isActive(href) ? ' nav__link--active' : '';
  }

  // ─── Nav HTML ──────────────────────────────────────────────────────────────
  function buildNav() {
    const desktopLinks = NAV_LINKS.map(l =>
      `<a href="${l.href}" class="nav__link${activeClass(l.href)}">${l.label}</a>`
    ).join('\n            ');

    const mobileLinks = NAV_LINKS.map(l =>
      `<a href="${l.href}" class="nav__link${activeClass(l.href)}">${l.label}</a>`
    ).join('\n        ');

    return `<nav class="nav">
        <div class="nav__container">
            <a href="index.html" class="nav__logo">
                <img src="assets/logo.png" alt="JmsPW">
            </a>
            <div class="nav__links">
                ${desktopLinks}
            </div>
            <div class="nav__actions">
                <a href="tel:${PHONE_TEL}" class="nav__phone">${PHONE_DISPLAY}</a>
                <a href="${QUOTE_PAGE}" class="nav__cta${isActive(QUOTE_PAGE) ? ' nav__link--active' : ''}">Free Quote</a>
            </div>
            <button class="nav__toggle" aria-label="Toggle menu">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>
    </nav>
    <div class="nav__mobile">
        ${mobileLinks}
        <a href="tel:${PHONE_TEL}" class="nav__phone">${PHONE_DISPLAY}</a>
        <a href="${QUOTE_PAGE}" class="nav__cta">Free Quote</a>
    </div>`;
  }

  // ─── Footer HTML ───────────────────────────────────────────────────────────
  function buildFooter() {
    return `<footer class="footer">
        <div class="footer__top">
            <div class="footer__brand">
                <img src="assets/logo.png" alt="JmsPW" class="footer__brand-logo">
                <p class="footer__brand-tagline">JM&rsquo;s Pressure Washing &mdash; built on hard work, honest pricing, and results that speak for themselves. Serving the Bay Area with pride.</p>
                <ul class="footer__contact-list">
                    <li class="footer__contact-item">
                        <i class="footer__contact-icon">&#9742;</i>
                        <a href="tel:${PHONE_TEL}" class="footer__contact-link">${PHONE_DISPLAY}</a>
                    </li>
                    <li class="footer__contact-item">
                        <i class="footer__contact-icon">&#9993;</i>
                        <a href="mailto:${EMAIL}" class="footer__contact-link">${EMAIL}</a>
                    </li>
                    <li class="footer__contact-item">
                        <i class="footer__contact-icon">&#9201;</i>
                        <span>Mon&ndash;Fri &nbsp;8am &ndash; 5pm</span>
                    </li>
                    <li class="footer__contact-item">
                        <i class="footer__contact-icon">&#9679;</i>
                        <span>Serving the Greater Bay Area<br>California</span>
                    </li>
                </ul>
            </div>

            <div class="footer__col">
                <span class="footer__col-heading">Quick Links</span>
                <ul class="footer__links">
                    <li><a href="index.html" class="footer__link">Home</a></li>
                    <li><a href="#" class="footer__link">Our Team</a></li>
                    <li><a href="commercial.html" class="footer__link">Commercial Services</a></li>
                    <li><a href="#" class="footer__link">Areas We Serve</a></li>
                    <li><a href="${QUOTE_PAGE}" class="footer__link">Get a Quote</a></li>
                </ul>
            </div>

            <div class="footer__col">
                <span class="footer__col-heading">Services</span>
                <ul class="footer__links">
                    <li><a href="#" class="footer__link">Driveway Washing</a></li>
                    <li><a href="#" class="footer__link">Roof Cleaning</a></li>
                    <li><a href="#" class="footer__link">Storefront Washing</a></li>
                    <li><a href="#" class="footer__link">Parking Lot Cleaning</a></li>
                    <li><a href="#" class="footer__link">Sidewalk Cleaning</a></li>
                    <li><a href="#" class="footer__link">Fleet Washing</a></li>
                </ul>
            </div>

            <div class="footer__col">
                <span class="footer__col-heading">About Us</span>
                <p class="footer__about-text">At JM&rsquo;s Pressure Washing, we take pride in every job &mdash; big or small. Founded on a simple belief that quality work and honest service go hand in hand, we&rsquo;ve built a reputation across the Bay Area for reliable results, fair prices, and a crew that shows up ready to work.</p>
                <div class="footer__cta-row">
                    <a href="${QUOTE_PAGE}" class="footer__cta-btn footer__cta-btn--primary">&#128196; Get a Free Quote</a>
                    <a href="tel:${PHONE_TEL}" class="footer__cta-btn footer__cta-btn--outline">&#128222; Call Us</a>
                    <a href="sms:${PHONE_TEL}" class="footer__cta-btn footer__cta-btn--outline">&#128172; Text Us</a>
                    <a href="mailto:${EMAIL}" class="footer__cta-btn footer__cta-btn--outline">&#9993; Email Us</a>
                </div>
            </div>
        </div>

        <div class="footer__areas">
            <div class="footer__areas-inner">
                <div class="footer__areas-divider"></div>
                <p class="footer__areas-heading">Areas We Serve</p>
                <div class="footer__areas-grid">
                    <div class="footer__county">
                        <p class="footer__county-name">Sonoma County</p>
                        <ul class="footer__county-cities">
                            <li class="footer__county-city">Cloverdale</li>
                            <li class="footer__county-city">Cotati</li>
                            <li class="footer__county-city">Healdsburg</li>
                            <li class="footer__county-city">Petaluma</li>
                            <li class="footer__county-city">Rohnert Park</li>
                            <li class="footer__county-city">Santa Rosa</li>
                            <li class="footer__county-city">Sebastopol</li>
                            <li class="footer__county-city">Sonoma</li>
                            <li class="footer__county-city">Windsor</li>
                        </ul>
                        <p class="footer__county-name" style="margin-top:1.25rem">Mendocino County</p>
                        <ul class="footer__county-cities">
                            <li class="footer__county-city">Fort Bragg</li>
                            <li class="footer__county-city">Point Arena</li>
                            <li class="footer__county-city">Ukiah</li>
                        </ul>
                    </div>
                    <div class="footer__county">
                        <p class="footer__county-name">Marin County</p>
                        <ul class="footer__county-cities">
                            <li class="footer__county-city">Belvedere</li>
                            <li class="footer__county-city">Corte Madera</li>
                            <li class="footer__county-city">Fairfax</li>
                            <li class="footer__county-city">Larkspur</li>
                            <li class="footer__county-city">Mill Valley</li>
                            <li class="footer__county-city">Novato</li>
                            <li class="footer__county-city">Ross</li>
                            <li class="footer__county-city">San Anselmo</li>
                            <li class="footer__county-city">San Rafael</li>
                            <li class="footer__county-city">Sausalito</li>
                            <li class="footer__county-city">Tiburon</li>
                            <li class="footer__county-city">Willits</li>
                        </ul>
                        <p class="footer__county-name" style="margin-top:1.25rem">Lake County</p>
                    </div>
                    <div class="footer__county">
                        <p class="footer__county-name">Napa County</p>
                        <ul class="footer__county-cities">
                            <li class="footer__county-city">American Canyon</li>
                            <li class="footer__county-city">Calistoga</li>
                            <li class="footer__county-city">Napa</li>
                            <li class="footer__county-city">St Helena</li>
                            <li class="footer__county-city">Yountville</li>
                        </ul>
                        <p class="footer__county-name" style="margin-top:1.25rem">Solano County</p>
                        <ul class="footer__county-cities">
                            <li class="footer__county-city">Benicia</li>
                            <li class="footer__county-city">Dixon</li>
                            <li class="footer__county-city">Fairfield</li>
                            <li class="footer__county-city">Rio Vista</li>
                            <li class="footer__county-city">Suisun City</li>
                            <li class="footer__county-city">Vacaville</li>
                            <li class="footer__county-city">Vallejo</li>
                        </ul>
                    </div>
                    <div class="footer__county">
                        <p class="footer__county-name">Alameda County</p>
                        <ul class="footer__county-cities">
                            <li class="footer__county-city">Alameda</li>
                            <li class="footer__county-city">Albany</li>
                            <li class="footer__county-city">Berkeley</li>
                            <li class="footer__county-city">Dublin</li>
                            <li class="footer__county-city">Emeryville</li>
                            <li class="footer__county-city">Fremont</li>
                            <li class="footer__county-city">Hayward</li>
                            <li class="footer__county-city">Newark</li>
                            <li class="footer__county-city">Oakland</li>
                            <li class="footer__county-city">Piedmont</li>
                            <li class="footer__county-city">Pleasanton</li>
                            <li class="footer__county-city">San Leandro</li>
                            <li class="footer__county-city">Union City</li>
                        </ul>
                    </div>
                    <div class="footer__county">
                        <p class="footer__county-name">Contra Costa County</p>
                        <ul class="footer__county-cities">
                            <li class="footer__county-city">Antioch</li>
                            <li class="footer__county-city">Brentwood</li>
                            <li class="footer__county-city">Clayton</li>
                            <li class="footer__county-city">Concord</li>
                            <li class="footer__county-city">Danville</li>
                            <li class="footer__county-city">El Cerrito</li>
                            <li class="footer__county-city">Hercules</li>
                            <li class="footer__county-city">Lafayette</li>
                            <li class="footer__county-city">Martinez</li>
                            <li class="footer__county-city">Moraga</li>
                            <li class="footer__county-city">Oakley</li>
                            <li class="footer__county-city">Orinda</li>
                            <li class="footer__county-city">Pinole</li>
                            <li class="footer__county-city">Pittsburg</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer__bottom">
            <div class="footer__bottom-inner">
                <span class="footer__copy">&copy; 2026 JM&rsquo;s Pressure Washing. All rights reserved.</span>
                <div class="footer__bottom-links">
                    <a href="#" class="footer__bottom-link">Privacy Policy</a>
                    <a href="#" class="footer__bottom-link">Terms of Service</a>
                    <a href="#" class="footer__bottom-link">Sitemap</a>
                </div>
            </div>
        </div>
    </footer>`;
  }

  // ─── Inject ────────────────────────────────────────────────────────────────
  const navTarget    = document.getElementById('nav-placeholder');
  const footerTarget = document.getElementById('footer-placeholder');

  if (navTarget)    navTarget.outerHTML    = buildNav();
  if (footerTarget) footerTarget.outerHTML = buildFooter();

  // ─── Behaviour ────────────────────────────────────────────────────────────
  const toggle    = document.querySelector('.nav__toggle');
  const mobileNav = document.querySelector('.nav__mobile');
  const navEl     = document.querySelector('.nav');

  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      mobileNav.classList.toggle('active');
      document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
    });

    mobileNav.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('active');
        mobileNav.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  if (navEl) {
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const currentScroll = window.pageYOffset;
      navEl.style.transform = (currentScroll > lastScroll && currentScroll > 100)
        ? 'translateY(-100%)' : 'translateY(0)';
      lastScroll = currentScroll;
    });
  }
})();
});