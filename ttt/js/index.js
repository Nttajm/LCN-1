const enter_site = document.getElementById('js-enter-site');
enter_site.addEventListener('click', () => {
    const openerElem =  document.querySelector('.opener');
    openerElem.classList.toggle('open-site');
}
);