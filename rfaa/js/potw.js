import { getThisSeason, getTeamById } from './acl-index.js';
import { rankPlayers } from './ratings.js';

function getLatestMatchday(season) {
    if (!season || !season.matchdays) return null;
    const played = season.matchdays.filter(md => md.games && md.games.some(g => g.score1 != null && g.score2 != null));
    if (!played.length) return null;
    return played[played.length - 1];
}

function renderPOTW() {
    const section = document.getElementById('potw-section');
    if (!section) return;

    const season = getThisSeason();
    const matchday = getLatestMatchday(season);

    if (!matchday) {
        section.style.display = 'none';
        return;
    }

    const ranked = rankPlayers(matchday.games || []);
    if (!ranked.length) { section.style.display = 'none'; return; }

    const winner = ranked[0];
    const teamObj = getTeamById(winner.teamId);

    document.getElementById('potw-md-num').textContent  = matchday.details || matchday.id || '—';
    document.getElementById('potw-name').textContent     = winner.name;
    document.getElementById('potw-team').textContent     = teamObj.name;
    document.getElementById('potw-goals').textContent    = winner.goals;
    document.getElementById('potw-assists').textContent  = winner.assists;
    document.getElementById('potw-cs').textContent       = '—';
    document.getElementById('potw-yc').textContent       = '0';
    document.getElementById('potw-score').textContent    = winner.rating;

    const badge = document.getElementById('potw-badge');
    badge.src = teamObj.img;
    badge.alt = teamObj.name;

    const potmChip = document.getElementById('potw-potm-chip');
    potmChip.classList.toggle('hidden', winner.potm === 0);
}

document.addEventListener('DOMContentLoaded', renderPOTW);

