function goTo(step) {
    for (var i = 1; i <= 3; i++) {
        var panel = document.getElementById('panel-' + i);
        var dot = document.getElementById('step-dot-' + i);
        panel.classList.remove('quote-panel--active');
        dot.classList.remove('quote-step--active', 'quote-step--done');
    }
    for (var i = 1; i <= 2; i++) {
        document.getElementById('connector-' + i).classList.remove('quote-step-connector--done');
    }
    for (var i = 1; i < step; i++) {
        document.getElementById('step-dot-' + i).classList.add('quote-step--done');
        if (i <= 2) document.getElementById('connector-' + i).classList.add('quote-step-connector--done');
    }
    document.getElementById('panel-' + step).classList.add('quote-panel--active');
    document.getElementById('step-dot-' + step).classList.add('quote-step--active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function submitQuote() {
    var required = ['fname', 'lname', 'email', 'phone'];
    var valid = true;
    required.forEach(function(id) {
        var el = document.getElementById(id);
        if (!el.value.trim()) {
            el.style.borderColor = '#b91c1c';
            valid = false;
        } else {
            el.style.borderColor = '';
        }
    });
    if (!valid) return;
    for (var i = 1; i <= 3; i++) {
        document.getElementById('panel-' + i).classList.remove('quote-panel--active');
    }
    document.getElementById('quote-success').classList.add('quote-success--active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
