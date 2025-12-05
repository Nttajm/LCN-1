document.addEventListener('DOMContentLoaded', function() {
    const menu_button = document.querySelector('.menu-btn');
    menu_button.addEventListener('click', function(event) {
        event.preventDefault();
        const menu_items = document.querySelector('.menu-items');
        if (menu_items.classList.contains('active')) {
            menu_items.classList.remove('active');
            menu_items.classList.add('unactive');
        } else {
            menu_items.classList.remove('unactive');
            menu_items.classList.add('active');
        }
    });
});
