function ch(div, content1, content2) {
    const div = document.getElementsByClassName(div);
    if (div.innerHTML === content1) {
        div.innerHTML = content2;
    } else {
        div.innerHTML = content1;
    }
}