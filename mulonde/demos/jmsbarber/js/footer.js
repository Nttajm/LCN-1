(function () {
    const config = {
        logo: 'Assets/jmsbslogo-white.png',
        logoAlt: "JM's Barber",
        tagline: 'Sharp cuts. No appointments.<br>Santa Rosa, CA.',
        phone: '+17075550192',
        phoneDisplay: '(707) 555-0192',
        email: 'jm@jmsbarber.com',
        address: '1450 Mendocino Ave<br>Santa Rosa, CA 95401',
        hours: [
            { days: 'Mon \u2013 Fri', time: '9:00 AM \u2013 7:00 PM' },
            { days: 'Saturday',      time: '8:00 AM \u2013 6:00 PM' },
            { days: 'Sunday',        time: '10:00 AM \u2013 4:00 PM' },
        ],
        services: [
            { label: 'Haircut',    price: '$25' },
            { label: 'Fade',       price: '$30' },
            { label: 'Line-Up',    price: '$15' },
            { label: 'Beard Trim', price: '$20' },
            { label: 'Cut + Beard',price: '$45' },
            { label: 'Kids Cut',   price: '$20' },
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
            `<li><a href="#services">${s.label} &mdash; ${s.price}</a></li>`
        ).join('');

        const socialsHTML = config.socials.map(s =>
            `<a href="${s.href}" class="footer-social-link">${s.label}</a>`
        ).join('');

        return `
        <div class="footer-top">
            <div class="footer-brand">
                <img src="${config.logo}" alt="${config.logoAlt}" class="footer-logo">
                <p class="footer-tagline">${config.tagline}</p>
                <a href="tel:${config.phone}" class="footer-cta">&#128222; Book a Call</a>
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
                    <li><a href="#">${config.address}</a></li>
                </ul>
                <div class="footer-socials">${socialsHTML}</div>
            </div>
        </div>
        <div class="footer-bottom">
            <span class="footer-copy">&copy; ${config.year} JM's Barber. All rights reserved.</span>
            <span class="footer-credit">Santa Rosa, CA</span>
        </div>`;
    }

    const placeholder = document.getElementById('footer-placeholder');
    if (!placeholder) return;

    placeholder.classList.add('footer');
    placeholder.setAttribute('id', 'contact');
    placeholder.innerHTML = render();
})();
