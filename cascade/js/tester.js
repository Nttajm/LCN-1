import { shareNote, loadBoard } from "./backend.js";

document.addEventListener("DOMContentLoaded", async () => {
    await loadBoard();
});

document.addEventListener("board-loaded", () => {

    const input = document.getElementById("collab-input");
    const emailArray = [];
    const container = document.querySelector(".people-added");

    document.body.addEventListener("click", e => {

        if (e.target.closest(".add-collab-btn")) {
            const email = input.value.trim();
            if (!email || !validateEmail(email)) return;
            const elem = createPersonElem(email);
            container.appendChild(elem);
            input.value = "";
        }

        if (e.target.closest(".btn-action-cancel")) {
            input.value = "";
            container.innerHTML = "";
            container.classList.add("dn");
            shareNote(emailArray);
        }

        if (e.target.closest(".delete-icon")) {
            const person = e.target.closest(".person-added");
            const email = person.querySelector(".email-text").textContent;
            const i = emailArray.findIndex(x => x.email === email);
            if (i !== -1) emailArray.splice(i, 1);
            person.remove();
        }
    });

    document.body.addEventListener("change", e => {
        if (e.target.matches(".role-selector")) {
            const person = e.target.closest(".person-added");
            const email = person.querySelector(".email-text").textContent;
            const obj = emailArray.find(x => x.email === email);
            if (obj) obj.role = e.target.value;
        }
    });

    function createPersonElem(email) {
        const div = document.createElement("div");
        div.className = "person-added bg-notion-orange";
        div.innerHTML = `
            <div class="mini-pfp"><img src="images/pfpex.png"></div>
            <span class="email-text">${email}</span>
            <div class="aswhat">
                <select class="role-selector">
                    <option value="view">View only</option>
                    <option value="edit">Can edit</option>
                </select>
            </div>
            <div class="delete-icon"><img src="icons/delete.png" class="icono gray small"></div>
        `;
        emailArray.push({ email, role: "view" });
        return div;
    }

    function validateEmail(email) {
        return /\S+@\S+\.\S+/.test(email);
    }
});
