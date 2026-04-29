const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const SIZE = 1080;

canvas.width = SIZE;
canvas.height = SIZE;

let currentImg = null;
let logoImg = null;
let strength = 85;
let activeStyle = 'overlay';

const logo = new Image();
logo.crossOrigin = 'anonymous';
logo.src = 'assets/logo.png';
logo.onload = () => {
    logoImg = logo;
    draw();
};
logo.onerror = () => draw();

document.fonts.load(`700 68px 'Lato'`).then(() => draw());

function draw() {
    if (activeStyle === 'card') {
        drawCard();
    } else {
        drawOverlay();
    }
}

function drawOverlay() {
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SIZE, SIZE);

    if (currentImg) {
        const w = currentImg.naturalWidth;
        const h = currentImg.naturalHeight;
        const dim = Math.min(w, h);
        const sx = (w - dim) / 2;
        const sy = (h - dim) / 2;
        ctx.drawImage(currentImg, sx, sy, dim, dim, 0, 0, SIZE, SIZE);

        const alpha = strength / 100;
        const bottomGrad = ctx.createLinearGradient(0, SIZE, 0, SIZE * 0.35);
        bottomGrad.addColorStop(0, `rgba(0,0,0,${alpha})`);
        bottomGrad.addColorStop(0.5, `rgba(0,0,0,${alpha * 0.45})`);
        bottomGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bottomGrad;
        ctx.fillRect(0, 0, SIZE, SIZE);

        const topGrad = ctx.createLinearGradient(0, 0, 0, SIZE * 0.28);
        topGrad.addColorStop(0, 'rgba(0,0,0,0.55)');
        topGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, SIZE, SIZE * 0.28);
    }

    if (logoImg) {
        const lh = 64;
        const lw = (logoImg.naturalWidth / logoImg.naturalHeight) * lh;
        ctx.drawImage(logoImg, 46, 46, lw, lh);
    }

    const caption = document.getElementById('caption-input').value.trim();
    if (caption) {
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = `700 68px 'Lato', sans-serif`;
        ctx.textBaseline = 'bottom';
        const pad = 52;
        const maxW = SIZE - pad * 2;
        const lines = wrapText(caption, maxW);
        const lineH = 80;
        let y = SIZE - pad;
        for (let i = lines.length - 1; i >= 0; i--) {
            ctx.fillText(lines[i], pad, y);
            y -= lineH;
        }
        ctx.restore();
    }
}

function drawCard() {
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SIZE, SIZE);

    const pad = 40;
    const cardX = pad;
    const cardY = 140;
    const cardW = SIZE - pad * 2;
    const cardH = 600;
    const radius = 28;

    if (currentImg) {
        ctx.save();
        roundRect(ctx, cardX, cardY, cardW, cardH, radius);
        ctx.clip();
        const w = currentImg.naturalWidth;
        const h = currentImg.naturalHeight;
        const srcAspect = w / h;
        const dstAspect = cardW / cardH;
        let sx, sy, sw, sh;
        if (srcAspect > dstAspect) {
            sh = h;
            sw = h * dstAspect;
            sx = (w - sw) / 2;
            sy = 0;
        } else {
            sw = w;
            sh = w / dstAspect;
            sx = 0;
            sy = (h - sh) / 2;
        }
        ctx.drawImage(currentImg, sx, sy, sw, sh, cardX, cardY, cardW, cardH);
        ctx.restore();
    } else {
        ctx.save();
        ctx.fillStyle = '#111';
        roundRect(ctx, cardX, cardY, cardW, cardH, radius);
        ctx.fill();
        ctx.restore();
    }

    if (logoImg) {
        const lh = 64;
        const lw = (logoImg.naturalWidth / logoImg.naturalHeight) * lh;
        ctx.drawImage(logoImg, pad, 46, lw, lh);
    }

    const caption = document.getElementById('caption-input').value.trim();
    if (caption) {
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = `700 72px 'Barlow Condensed', 'Arial Narrow', sans-serif`;
        ctx.textBaseline = 'top';
        const txtX = pad;
        const maxW = SIZE - pad * 2;
        const lines = wrapText(caption, maxW);
        const lineH = 88;
        let y = cardY + cardH + 52;
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], txtX, y);
            y += lineH;
        }
        ctx.restore();
    }
}

function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + h - r);
    c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h);
    c.arcTo(x, y + h, x, y + h - r, r);
    c.lineTo(x, y + r);
    c.arcTo(x, y, x + r, y, r);
    c.closePath();
}

function wrapText(text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxW && line) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);
    return lines;
}

function loadPhoto(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ({ target }) => {
        const img = new Image();
        img.onload = () => {
            currentImg = img;
            document.getElementById('drop-zone').classList.add('hidden');
            draw();
        };
        img.src = target.result;
    };
    reader.readAsDataURL(file);
}

document.getElementById('file-input').addEventListener('change', (e) => {
    loadPhoto(e.target.files[0]);
    e.target.value = '';
});

document.getElementById('upload-btn').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

const dropZone = document.getElementById('drop-zone');

dropZone.addEventListener('click', () => document.getElementById('file-input').click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    loadPhoto(e.dataTransfer.files[0]);
});

document.getElementById('caption-input').addEventListener('input', draw);

document.getElementById('gradient-strength').addEventListener('input', (e) => {
    strength = parseInt(e.target.value);
    document.getElementById('gradient-val').textContent = `${strength}%`;
    draw();
});

document.querySelectorAll('.style-picker__btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.style-picker__btn').forEach(b => b.classList.remove('style-picker__btn--active'));
        btn.classList.add('style-picker__btn--active');
        activeStyle = btn.dataset.style;
        const gradGroup = document.getElementById('gradient-group');
        if (activeStyle === 'card') {
            gradGroup.classList.add('controls__group--hidden');
        } else {
            gradGroup.classList.remove('controls__group--hidden');
        }
        draw();
    });
});

document.getElementById('download-btn').addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = 'pressderno-post.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
});
