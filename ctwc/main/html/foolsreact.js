const navOther = document.querySelector('.other-links');
const desktopNav = document.querySelector('.desktop-nav.nav-cont');


if (navOther && desktopNav) {
    navOther.innerHTML = `
        <li><a href="index.html">Home</a></li>
        <li><a href="about.html">About us</a></li>
        <li><a href="projects.html">Missions & Events</a></li>
        <li><a href="give.html">Give</a></li>
    `

    desktopNav.innerHTML = `
        <a href="index.html" class="logo">
                    <img src="../images/logo-long-long.png" alt="CTWC">
                </a>
                <ul class="nav-links">
                    <li><a href="index.html" class="cur uh">Home</a></li>
                    <li><a href="about.html" class="cur uh">About us</a></li>
                    <li><a href="projects.html" class="cur uh">Missions & Events</a></li>
                    <li><a href="give.html" class="cur uh">Give</a></li>
                </ul>
    `
}