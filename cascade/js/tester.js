const input = document.getElementById("collab-input");
const addBtn = document.querySelector(".btn-action-1");
const doneBtn = document.querySelector(".btn-action-cancel");
const Collabcontainer = document.querySelector(".people-share");
const container = document.querySelector(".people-added");
const emailArray = [];

addBtn.addEventListener("click", () => {
    const email = input.value.trim();
    if (!email || !validateEmail(email)) return;

    const elem = createPersonElem(email);
    container.appendChild(elem);
    input.value = "";
    
});

doneBtn.addEventListener("click", () => {
    input.value = "";
    container.innerHTML = "";
    container.classList.add("dn");

});

container.addEventListener("click", (e) => {
    if (e.target.closest(".delete-icon")) {
        e.target.closest(".person-added").remove();
    }
});

function createPersonElem(email) {
    const div = document.createElement("div");
    div.className = "person-added bg-notion-orange";
    div.innerHTML = `
        <div class="mini-pfp">
            <img src="images/pfpex.png" alt="">
        </div>
        <span>${email}</span>
        <div class="aswhat">
            <select name="roles" class="role-selector">
                <option value="view">View only</option>
                <option value="edit">Can edit</option>
            </select>
        </div>
        <div class="delete-icon">
            <img src="icons/delete.png" alt="delete" class="icono gray small">
        </div>
    `;
    emailArray.push({
        email: email,
        role: "view"
    });
    return div;
}

function validateEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
}
