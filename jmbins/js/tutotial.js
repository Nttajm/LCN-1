let tut_store = JSON.parse(localStorage.getItem("tut_store")) || {};

function tutorial(steps, id) {
  if (tut_store[id]) return; // Already done

  let stepIndex = 0;

  // Overlay
  const overlay = document.createElement("div");
  overlay.className = "tutorial-overlay";

  // Box
  const box = document.createElement("div");
  box.className = "tutorial-box";

  const header = document.createElement("div");
  header.className = "tutorial-header";

  const media = document.createElement("div");
  media.className = "tutorial-media";

  const content = document.createElement("div");
  content.className = "tutorial-content";

  const button = document.createElement("button");
  button.className = "tutorial-button";

  const dots = document.createElement("div");
  dots.className = "tutorial-dots";
  steps.forEach((_, i) => {
    const dot = document.createElement("div");
    dot.className = "tutorial-dot";
    if (i === 0) dot.classList.add("active");
    dots.appendChild(dot);
  });

  box.appendChild(header);
  box.appendChild(media);
  box.appendChild(content);
  box.appendChild(button);
  box.appendChild(dots);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function renderStep() {
    let step = steps[stepIndex];

    header.textContent = step.title;

    media.innerHTML = "";
    if (step.img) {
      const img = document.createElement("img");
      img.src = step.img;
      media.appendChild(img);
    } else if (step.icon) {
      const span = document.createElement("span");
      span.textContent = step.icon;
      media.appendChild(span);
    }

    content.classList.remove("active");
    setTimeout(() => {
      content.innerHTML = step.text;
      content.classList.add("active");
    }, 200);

    button.textContent = (stepIndex === steps.length - 1) ? "Continue" : "Next";

    [...dots.children].forEach((dot, i) => {
      dot.classList.toggle("active", i === stepIndex);
    });
  }

  button.addEventListener("click", () => {
    if (stepIndex < steps.length - 1) {
      stepIndex++;
      renderStep();
    } else {
      tut_store[id] = true;
      localStorage.setItem("tut_store", JSON.stringify(tut_store));
      overlay.remove();
    }
  });

  renderStep();
}