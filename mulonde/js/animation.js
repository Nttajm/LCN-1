function initDailUp() {
  document.querySelectorAll('[data-dailup="true"]').forEach(el => {
    const text = el.textContent.trim();
    el.innerHTML = "";  // clear

    const wrapper = document.createElement("div");
    wrapper.className = "dail-up";

    [...text].forEach((char, index) => {
      const col = document.createElement("div");
      col.className = "column";
      col.id = `column-${index + 1}`;

      const top = document.createElement("span");
      top.className = "top";
      top.textContent = char;

      const bottom = document.createElement("span");
      bottom.className = "bottom";
      bottom.textContent = char;

      // animation delay: 0.125 * index
      bottom.style.animationDelay = `${0.057 * index}s`;

      col.appendChild(top);
      col.appendChild(bottom);
      wrapper.appendChild(col);
    });

    el.removeAttribute("data-dailup");
    el.appendChild(wrapper);
  });
}

setTimeout(initDailUp, 800);



function transformSingleWords() {
  const targets = document.querySelectorAll('[data-transform-single="true"]');

  targets.forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    const parent = el.parentNode;
    const className = el.className;

    // Insert new spans before removing original
    words.forEach(word => {
      const span = document.createElement('span');
      span.className = className;
      span.textContent = word;
      parent.insertBefore(span, el);
    });

    // Remove original element
    parent.removeChild(el);
  });
}

transformSingleWords();
