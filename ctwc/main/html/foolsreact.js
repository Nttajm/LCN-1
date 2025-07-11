
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
                <img src="images/logo-long-long.png" alt="CTWC">
                </a>
                <ul class="nav-links fadeIn">
                <li><a href="${fixLInkDesktop}about.html" class="cur uh">About us</a></li>
                <li><a href="${fixLInkDesktop}events.html" class="cur uh">Missions & Events</a></li>
                <li><a href="${fixLInkDesktop}events.html" class="cur uh">Ministries</a></li>
                <li><a href="${fixLInkDesktop}give.html" class="cur uh">Give</a></li>
                </ul>
        `;
    } else {
        console.log('Navigation elements not found');
    }
});