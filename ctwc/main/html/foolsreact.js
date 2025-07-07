const navOther = document.querySelector('.other-links');
const desktopNav = document.querySelector('.desktop-nav.nav-cont');

document.addEventListener('DOMContentLoaded', () => {
        
    if (navOther && desktopNav) {
    const fixLink = navOther.dataset.LinkFix || '';
    const fixLInkDesktop = desktopNav.dataset.LinkFix || '';
        navOther.innerHTML = `
            <li><a href="${fixLink}index.html">Home</a></li>
            <li><a href="${fixLink}about.html">About us</a></li>
            <li><a href="${fixLink}events.html">Missions & Events</a></li>
            <li><a href="${fixLink}give.html">Give</a></li>
        `;

        desktopNav.innerHTML = `
            <a href="${fixLInkDesktop}index.html" class="logo">
                <img src="images/logo-long-long.png" alt="CTWC">
                </a>
                <ul class="nav-links">
                <li><a href="${fixLInkDesktop}index.html" class="cur uh">Home</a></li>
                <li><a href="${fixLInkDesktop}about.html" class="cur uh">About us</a></li>
                <li><a href="${fixLInkDesktop}events.html" class="cur uh">Missions & Events</a></li>
                <li><a href="${fixLInkDesktop}give.html" class="cur uh">give</a></li>
                </ul>
        `;
    } else {
        console.log('Navigation elements not found');
    }
});