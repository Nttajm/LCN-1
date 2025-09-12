export function createCarousel(containerId, imageUrls) {
  if (!imageUrls || imageUrls.length === 0) {
    console.log("No images provided for carousel.");
    return;
  }
  const root = document.getElementById(containerId);
  root.innerHTML = `
    <div class="carousel">
      <div class="carousel-track"></div>
      <button class="carousel-arrow left">&#10094;</button>
      <button class="carousel-arrow right">&#10095;</button>
      <div class="carousel-dots"></div>
      <div class="carousel-counter"></div>
    </div>
  `;

  const track = root.querySelector(".carousel-track");
  const leftBtn = root.querySelector(".carousel-arrow.left");
  const rightBtn = root.querySelector(".carousel-arrow.right");
  const dotsContainer = root.querySelector(".carousel-dots");
  const counter = root.querySelector(".carousel-counter");

  // Add blank slide first
  const blankSlide = document.createElement("div");
  blankSlide.className = "blank-slide";
  track.appendChild(blankSlide);

  // Add all image slides
  imageUrls.forEach(url => {
    const img = document.createElement("img");
    img.src = url;
    track.appendChild(img);
  });

  let totalSlides = imageUrls.length + 1; // count blank
  let currentIndex = 0; // start at blank

  const updateCarousel = () => {
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    counter.textContent = `${currentIndex + 1} / ${totalSlides}`;
    dotsContainer.querySelectorAll(".dot").forEach((dot, idx) => {
      dot.classList.toggle("active", idx === currentIndex);
    });
  };

  for (let i = 0; i < totalSlides; i++) {
    const dot = document.createElement("div");
    dot.className = "dot";
    dot.addEventListener("click", () => {
      currentIndex = i;
      updateCarousel();
    });
    dotsContainer.appendChild(dot);
  }

  leftBtn.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
    updateCarousel();
  });

  rightBtn.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % totalSlides;
    updateCarousel();
  });

  // Start already on blank slide but translated to show it
  updateCarousel();
}