const nav = document.querySelector('.nav');
nav.classList.add('p2-group');
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