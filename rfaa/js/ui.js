const nav = document.querySelector(".nav");
if (nav) {
    nav.classList.add("p2-group");

    nav.innerHTML = `
<a href="index.html">
            <div class="imgel">
                <img src="images/leagues/acl.png" alt="tx">
            </div>
        </a>
        <div class="options">
            <div class="option-elem">
                <span><a href="matches.html">Matches</a></span>
            </div>
            <div class="option-elem">
                <span><a href="table.html">Table</a></span>
            </div>
            <div class="option-elem" id="histab-parent">
                <span><a href="#history">History ▼</a></span>
                <div class="more-info" id="histab">
                    <ul>
                        <li><a href="seasons.html">Seasons</a></li>
                        <li><a href="aot-stats.html">AOT</a></li>
                    </ul>
                </div>
            </div>
            <div class="option-elem">
                <span><a href="acl/stats/alltime.html">Stats</a></span>
            </div>
            <div class="option-elem">
                <span><a href="#compare">Compare</a></span>
            </div>
        </div>
`;
}



// Make sure this runs after .js-team-link elements are present in the DOM
document.addEventListener("DOMContentLoaded", () => {
    const teamLinks = document.querySelectorAll(".js-team-link");
    if (teamLinks.length > 0) {
        teamLinks.forEach(link => {
            console.log(link);
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const teamId = link.getAttribute("data-team-id");
                if (teamId) {
                    window.location.href = `team-info.html?team=${teamId}`;
                }
            });
        });
    }
});

export function reapplyTeamLinkListeners() {
    const teamLinks = document.querySelectorAll(".js-team-link");
    if (teamLinks.length > 0) {
        teamLinks.forEach(link => {
            // Remove any existing click listeners to avoid duplicates
            link.replaceWith(link.cloneNode(true));
        });
        // Re-select after cloning
        const newTeamLinks = document.querySelectorAll(".js-team-link");
        newTeamLinks.forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const teamId = link.getAttribute("data-team-id");
                if (teamId) {
                    window.location.href = `team-info.html?team=${teamId}`;
                }
            });
        });
    }
}
