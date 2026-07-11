const STORAGE_KEY = "rfaa-editor-mode";

export function isEditorMode() {
    return localStorage.getItem(STORAGE_KEY) === "true";
}

export function setEditorMode(on) {
    localStorage.setItem(STORAGE_KEY, on ? "true" : "false");
    document.body.classList.toggle("editor-mode", on);
    if (!on) {
        document.querySelector(".notifEd")?.classList.add("dn");
    }
    document.dispatchEvent(new CustomEvent("rfaa-editor-mode-change", { detail: { enabled: on } }));
}

export function toggleEditorMode() {
    setEditorMode(!isEditorMode());
}

export function initEditorMode() {
    setEditorMode(isEditorMode());
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "x") {
            e.preventDefault();
            toggleEditorMode();
        }
    });
}
