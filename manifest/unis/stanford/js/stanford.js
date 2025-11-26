const loader  = document.querySelector('.load');
const letter  = document.querySelector('.letter');

setTimeout(() => {
  loader.classList.add('dn');
  letter.classList.remove('dn');
}, 4000);