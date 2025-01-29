export function oo_ese(b, c) {
    if (/[a-zA-Z]/.test(b)) {
        const d = b.charCodeAt(0);
        const e = d >= 65 && d <= 90 ? 65 : 97;
        return String.fromCharCode((d - e - c + 26) % 26 + e);
    }
    return b;
}