export function addCover(imgUrl) {
  const coverElem = document.querySelector('.cover');

  const covers = [
    'images/cover1.jpg',
  ];
  imgUrl = imgUrl || covers[Math.floor(Math.random() * covers.length)];

  if (coverElem) {
    coverElem.style.backgroundImage = `url('${imgUrl}')`;
  }
}
