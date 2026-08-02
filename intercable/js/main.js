document.addEventListener('DOMContentLoaded', () => {
    initHero();
    initMoviesRow();
    initNavbar();
});

let currentFeaturedIndex = 0;
let featuredInterval;

function initHero() {
    const hero = document.getElementById('hero');
    const heroImage = document.getElementById('heroImage');
    const heroLogo = document.getElementById('heroLogo');
    const heroIndicators = document.getElementById('heroIndicators');
    const heroDuration = document.getElementById('heroDuration');
    const heroYear = document.getElementById('heroYear');
    const heroRating = document.getElementById('heroRating');

    featuredContent.forEach((_, index) => {
        const indicator = document.createElement('div');
        indicator.className = `indicator ${index === 0 ? 'active' : ''}`;
        indicator.addEventListener('click', () => goToFeatured(index));
        heroIndicators.appendChild(indicator);
    });

    updateFeatured(0);

    setTimeout(() => {
        hero.classList.add('loaded');
        heroImage.classList.add('active');
    }, 100);

    featuredInterval = setInterval(() => {
        const nextIndex = (currentFeaturedIndex + 1) % featuredContent.length;
        goToFeatured(nextIndex);
    }, 8000);
}

function updateFeatured(index) {
    const content = featuredContent[index];
    const heroImage = document.getElementById('heroImage');
    const heroLogo = document.getElementById('heroLogo');
    const heroDuration = document.getElementById('heroDuration');
    const heroYear = document.getElementById('heroYear');
    const heroRating = document.getElementById('heroRating');

    heroImage.src = content.featured;
    heroImage.alt = content.title;
    heroLogo.src = content.logo;
    heroLogo.alt = content.title;
    heroDuration.textContent = content.duration;
    heroYear.textContent = content.year;
    heroRating.innerHTML = `<span class="badge rating">${content.rating}</span>`;

    document.querySelectorAll('.indicator').forEach((ind, i) => {
        ind.classList.toggle('active', i === index);
    });

    currentFeaturedIndex = index;
}

function goToFeatured(index) {
    const heroImage = document.getElementById('heroImage');
    const heroContent = document.getElementById('heroContent');

    heroImage.classList.remove('active');
    heroContent.style.opacity = '0';
    heroContent.style.transform = 'translateY(30px)';

    setTimeout(() => {
        updateFeatured(index);
        heroImage.classList.add('active');
        heroContent.style.opacity = '1';
        heroContent.style.transform = 'translateY(0)';
    }, 500);

    clearInterval(featuredInterval);
    featuredInterval = setInterval(() => {
        const nextIndex = (currentFeaturedIndex + 1) % featuredContent.length;
        goToFeatured(nextIndex);
    }, 8000);
}

function initMoviesRow() {
    const moviesRow = document.getElementById('moviesRow');
    const heroLoadDelay = 800;

    movies.forEach((movie, index) => {
        const card = createMovieCard(movie);
        moviesRow.appendChild(card);

        setTimeout(() => {
            card.classList.add('loaded');
        }, heroLoadDelay + (index * 90));
    });
}

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = `movie-card ${movie.expanded ? 'expanded' : 'standard'}`;

    const coverMarkup = `
        <div class="card-media">
            <img src="${movie.cover}" alt="${movie.title}" class="card-image">
            <div class="card-logo-wrap">
                <img src="${movie.logo}" alt="${movie.title}" class="card-logo">
            </div>
        </div>
    `;

    if (movie.expanded) {
        card.innerHTML = `
            <div class="card-left">
                ${coverMarkup}
            </div>
            <div class="card-right">
                <h3 class="card-title">${movie.title}</h3>
                <p class="card-description">${movie.description}</p>
                <div class="card-buttons">
                    <button class="card-btn play" aria-label="Play">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </button>
                    <button class="card-btn preview-btn">Preview</button>
                </div>
                <div class="card-meta">
                    <span class="badge new">New</span>
                    <span class="meta-text">${movie.duration}</span>
                    <span class="meta-text">${movie.year}</span>
                    <span class="badge quality">${movie.quality}</span>
                    ${movie.hasAD ? '<span class="badge ad">AD</span>' : ''}
                </div>
                <div class="card-tags">${movie.rating} | ${movie.tags}</div>
            </div>
        `;
    } else {
        card.innerHTML = coverMarkup;
    }

    return card;
}

function initNavbar() {
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}
