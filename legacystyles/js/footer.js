(function () {
    const config = {
        name: 'Legacy Styles',
        tagline: 'Santa Rosa\u2019s local barbershop for clean cuts & good vibes.',
        phone: '+17075550100',
        phoneDisplay: '(707) 555-0100',
        email: 'legacystyles@email.com',
        address: '490 Mendocino Ave Ste 109<br>Santa Rosa, CA 95401',
        mapsHref: 'https://www.google.com/maps/dir/?api=1&destination=490+Mendocino+Ave+Ste+109+Santa+Rosa+CA+95401',
        hours: [
            { days: 'Mon \u2013 Sat', time: '9:00 AM \u2013 5:00 PM' },
            { days: 'Sunday',       time: '9:00 AM \u2013 7:00 PM' },
        ],
        services: [
            { label: 'Fade',          href: '#services' },
            { label: 'Drop Fade',     href: '#services' },
            { label: 'Taper',         href: '#services' },
            { label: 'Hot Towel Shave', href: '#services' },
            { label: 'Eyebrow Trim',  href: '#services' },
        ],
        socials: [
            { label: 'Instagram', href: '#' },
            { label: 'Facebook',  href: '#' },
        ],
        year: new Date().getFullYear(),
    };

    function render() {
        const hoursHTML = config.hours.map(h =>
            `<li class="footer-list-item"><span>${h.days}</span><span>${h.time}</span></li>`
        ).join('');

        const servicesHTML = config.services.map(s =>
            `<li><a href="${s.href}">${s.label}</a></li>`
        ).join('');

        const socialsHTML = config.socials.map(s =>
            `<a href="${s.href}" class="footer-social-link">${s.label}</a>`
        ).join('');

        return `
        <div class="footer-top">
            <div class="footer-brand">
                <span class="footer-brand-name">Legacy <em>Styles</em></span>
                <p class="footer-tagline">${config.tagline}</p>
                <a href="tel:${config.phone}" class="footer-cta">&#128222; Call to Book</a>
            </div>
            <div class="footer-col">
                <h4 class="footer-col-title">Hours</h4>
                <ul class="footer-list">${hoursHTML}</ul>
            </div>
            <div class="footer-col">
                <h4 class="footer-col-title">Services</h4>
                <ul class="footer-list footer-list--links">${servicesHTML}</ul>
            </div>
            <div class="footer-col">
                <h4 class="footer-col-title">Contact</h4>
                <ul class="footer-list footer-list--links">
                    <li><a href="tel:${config.phone}">${config.phoneDisplay}</a></li>
                    <li><a href="mailto:${config.email}">${config.email}</a></li>
                    <li><a href="${config.mapsHref}" target="_blank" rel="noopener">${config.address}</a></li>
                </ul>
                <div class="footer-socials">${socialsHTML}</div>
            </div>
        </div>
        <div class="footer-bottom">
            <span class="footer-copy">&copy; ${config.year} Legacy Styles. All rights reserved.</span>
            <span class="footer-credit">Santa Rosa, CA</span>
        </div>`;
    }

    const placeholder = document.getElementById('footer-placeholder');
    if (!placeholder) return;

    placeholder.classList.add('footer');
    placeholder.setAttribute('id', 'contact');
    placeholder.innerHTML = render();
})();
