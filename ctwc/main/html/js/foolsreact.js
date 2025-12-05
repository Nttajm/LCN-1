
document.addEventListener('DOMContentLoaded', () => {
    const navOther = document.querySelector('.other-links');
    const desktopNav = document.querySelector('.desktop-nav.nav-cont');
        
    if (navOther && desktopNav) {
    const fixLink = navOther.dataset.LinkFix || '';
    const fixLInkDesktop = desktopNav.dataset.LinkFix || '';

    const logoImg = document.querySelector('.logo')
    logoImg.classList.add('fadeIn')
    
    navOther.innerHTML = `
            <li><a href="${fixLink}about.html">About us</a></li>
            <li><a href="${fixLink}events.html">Missions & Events</a></li>
            <li>
                <div class="extras">
                    <div class='title'>
                     <span>Missions</span>
                    </div>
                    
                </div>
            </li>
            <li><a href="${fixLink}give.html">Give</a></li>
        `;

        desktopNav.innerHTML = `
                    <a href="${fixLInkDesktop}index.html" class="logo fadeIn">
                        CTWC
                    </a>
                    <ul class="nav-links fadeIn">
                        <li><a href="${fixLInkDesktop}about.html" class="cur uh">About us</a></li>
                        <li><a href="${fixLInkDesktop}events.html" class="cur uh">Missions & Events</a></li>
                        <li><a href="${fixLInkDesktop}events.html" class="cur uh">Contact</a></li>
                <li><a href="${fixLInkDesktop}give.html" class="cur uh">Give</a></li>
                </ul>
        `;
    } else {
        console.log('Navigation elements not found');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('site-maintenance-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'site-maintenance-banner';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'polite');
    banner.textContent = 'This website is under maintenance and is still being created.';
    Object.assign(banner.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        background: '#d32f2f',
        color: '#fff',
        padding: '12px 48px 12px 16px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        fontSize: '14px',
        lineHeight: '1.4',
        zIndex: '2147483647',
        textAlign: 'center'
    });

    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss maintenance notice');
    close.textContent = '×';
    Object.assign(close.style, {
        position: 'absolute',
        top: '50%',
        right: '12px',
        transform: 'translateY(-50%)',
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        border: 'none',
        background: 'rgba(0,0,0,0.35)',
        color: '#fff',
        fontSize: '18px',
        lineHeight: '28px',
        cursor: 'pointer'
    });

    banner.appendChild(close);
    document.body.appendChild(banner);

    const originalPadding = getComputedStyle(document.body).paddingTop;
    const updatePadding = () => {
        document.body.style.paddingTop = banner.offsetHeight + 'px';
    };
    updatePadding();
    window.addEventListener('resize', updatePadding);

    close.addEventListener('click', () => {
        document.body.style.paddingTop = originalPadding;
        banner.remove();
        window.removeEventListener('resize', updatePadding);
    });
});