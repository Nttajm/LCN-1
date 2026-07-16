const pageName = window.location.pathname.split("/").pop() || "index.html";
const isMatchesPage = pageName === "matches.html" || pageName === "match-info.html";

function getRfaaBase() {
    const path = window.location.pathname.replace(/\\/g, "/");
    const marker = "/rfaa/";
    const idx = path.toLowerCase().indexOf(marker);
    if (idx === -1) return "";
    const rest = path.slice(idx + marker.length);
    const lastSlash = rest.lastIndexOf("/");
    const dir = lastSlash === -1 ? "" : rest.slice(0, lastSlash);
    const depth = dir ? dir.split("/").filter(Boolean).length : 0;
    return depth > 0 ? "../".repeat(depth) : "";
}

const rfaaBase = getRfaaBase();

const nav = document.querySelector(".nav");
if (nav) {
    nav.classList.add("p2-group");

    nav.innerHTML = `
<a href="${rfaaBase}index.html" class="nav-logo">
            <div class="imgel">
                <img src="${rfaaBase}images/leagues/acl.png" alt="tx">
            </div>
        </a>
        <a href="${rfaaBase}matches.html" class="nav-mobile-matches${isMatchesPage ? " selected" : ""}"${isMatchesPage ? ' aria-current="page"' : ""}>Matches</a>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-label="Open menu">
            <span class="nav-toggle-bar"></span>
            <span class="nav-toggle-bar"></span>
            <span class="nav-toggle-bar"></span>
        </button>
        <div class="options">
            <div class="option-elem">
                <span><a href="${rfaaBase}matches.html">Matches</a></span>
            </div>
            <div class="option-elem">
                <span><a href="${rfaaBase}table.html">Table</a></span>
            </div>
            <div class="option-elem" id="histab-parent">
                <button type="button" class="nav-history-toggle" aria-expanded="false">
                    History <span class="nav-history-caret">▼</span>
                </button>
                <div class="more-info" id="histab">
                    <ul>
                        <li><a href="${rfaaBase}seasons.html">Seasons</a></li>
                        <li><a href="${rfaaBase}aot-stats.html">AOT</a></li>
                    </ul>
                </div>
            </div>
            <div class="option-elem">
                <span><a href="${rfaaBase}acl/stats/alltime.html">Stats</a></span>
            </div>
            <div class="option-elem">
                <span><a href="#compare">Compare</a></span>
            </div>
        </div>
`;

    const toggle = nav.querySelector(".nav-toggle");
    const histabParent = nav.querySelector("#histab-parent");
    const historyToggle = nav.querySelector(".nav-history-toggle");
    let backdrop = document.querySelector(".nav-backdrop");

    if (!backdrop) {
        backdrop = document.createElement("div");
        backdrop.className = "nav-backdrop";
        nav.after(backdrop);
    }

    const closeNav = () => {
        nav.classList.remove("nav-open");
        if (toggle) {
            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-label", "Open menu");
        }
        histabParent?.classList.remove("history-open");
        historyToggle?.setAttribute("aria-expanded", "false");
        backdrop.classList.remove("visible");
    };

    if (toggle) {
        toggle.addEventListener("click", (e) => {
            e.stopPropagation();
            const open = nav.classList.toggle("nav-open");
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
            toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
            backdrop.classList.toggle("visible", open);
            if (!open) {
                histabParent?.classList.remove("history-open");
                historyToggle?.setAttribute("aria-expanded", "false");
            }
        });

        backdrop.addEventListener("click", closeNav);

        nav.querySelectorAll(".options a").forEach((link) => {
            link.addEventListener("click", closeNav);
        });
    }

    if (historyToggle && histabParent) {
        historyToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            const open = histabParent.classList.toggle("history-open");
            historyToggle.setAttribute("aria-expanded", open ? "true" : "false");
        });
    }

    const setNavHeight = () => {
        if (window.innerWidth > 768) {
            document.documentElement.style.removeProperty("--nav-h");
            document.body.style.paddingTop = "";
            return;
        }
        const h = nav.offsetHeight;
        document.documentElement.style.setProperty("--nav-h", `${h}px`);
        document.body.style.paddingTop = `${h}px`;
    };

    setNavHeight();
    window.addEventListener("resize", setNavHeight);

    const mobileMatchesLink = nav.querySelector(".nav-mobile-matches");

    const syncMobileMatchesSelected = () => {
        if (!mobileMatchesLink) return;

        const matchesTab = document.querySelector("#show-matches-btn");
        const onMatchesPage = pageName === "matches.html";
        const matchesTabActive = onMatchesPage && (!matchesTab || matchesTab.classList.contains("selected"));
        const selected = matchesTabActive || pageName === "match-info.html";

        mobileMatchesLink.classList.toggle("selected", selected);
        if (selected) {
            mobileMatchesLink.setAttribute("aria-current", "page");
        } else {
            mobileMatchesLink.removeAttribute("aria-current");
        }
    };

    if (pageName === "matches.html") {
        document.querySelectorAll("#show-matches-btn, #show-table-btn, #show-bracket-btn").forEach((btn) => {
            btn?.addEventListener("click", () => requestAnimationFrame(syncMobileMatchesSelected));
        });
    }

    syncMobileMatchesSelected();
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
                    window.location.href = `${rfaaBase}team-info.html?team=${teamId}`;
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
                    window.location.href = `${rfaaBase}team-info.html?team=${teamId}`;
                }
            });
        });
    }
}
