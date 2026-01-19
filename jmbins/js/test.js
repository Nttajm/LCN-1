
const button = document.querySelector(".buy-now")
button.addEventListener("click", () => {
  fetch("http://localhost:3001/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        { id: 1, quantity: 3 },
        { id: 2, quantity: 1 },
      ],
    }),
  })
    .then(res => {
      if (res.ok) return res.json()
      return res.json().then(json => Promise.reject(json))
    })
    .then(({ url }) => {
      window.location = url
    })
    .catch(e => {
      console.error(e.error)
    })
})

    const columnsData = [
      [
        "hoodies/fog-essentials-hoodie-v0-koqz2g505nib1.png",
        "hoodies/ralph-lauren-sweater-and-hoodie-pandabuy-v0-pb37o61tmhmb1.png",
        "shirts/shirt.png",
        "hoodies/fog-essentials-hoodie-v0-koqz2g505nib1.png",
        "hoodies/ralph-lauren-sweater-and-hoodie-pandabuy-v0-pb37o61tmhmb1.png",
        "shirts/shirt.png"
      ],
      [
        "shirts/shirt.png",
        "hoodies/fog-essentials-hoodie-v0-koqz2g505nib1.png",
        "hoodies/ralph-lauren-sweater-and-hoodie-pandabuy-v0-pb37o61tmhmb1.png",
        "shirts/shirt.png",
        "hoodies/fog-essentials-hoodie-v0-koqz2g505nib1.png",
        "hoodies/ralph-lauren-sweater-and-hoodie-pandabuy-v0-pb37o61tmhmb1.png",
        "shirts/shirt.png",
        "hoodies/fog-essentials-hoodie-v0-koqz2g505nib1.png",
        "hoodies/ralph-lauren-sweater-and-hoodie-pandabuy-v0-pb37o61tmhmb1.png",
        "shirts/shirt.png",
        "hoodies/fog-essentials-hoodie-v0-koqz2g505nib1.png",
        "hoodies/ralph-lauren-sweater-and-hoodie-pandabuy-v0-pb37o61tmhmb1.png"
      ],
      [
        "hoodies/ralph-lauren-sweater-and-hoodie-pandabuy-v0-pb37o61tmhmb1.png",
        "shirts/shirt.png",
        "hoodies/fog-essentials-hoodie-v0-koqz2g505nib1.png",
        "hoodies/ralph-lauren-sweater-and-hoodie-pandabuy-v0-pb37o61tmhmb1.png",
        "shirts/shirt.png",
        "hoodies/fog-essentials-hoodie-v0-koqz2g505nib1.png",
        "shirts/shirt.png",
        "hoodies/fog-essentials-hoodie-v0-koqz2g505nib1.png",
        "hoodies/ralph-lauren-sweater-and-hoodie-pandabuy-v0-pb37o61tmhmb1.png",
        "shirts/shirt.png",
        "hoodies/fog-essentials-hoodie-v0-koqz2g505nib1.png",
        "hoodies/ralph-lauren-sweater-and-hoodie-pandabuy-v0-pb37o61tmhmb1.png"
      ],
      [
        "shirts/shirt.png",
        "hoodies/ralph-lauren-sweater-and-hoodie-pandabuy-v0-pb37o61tmhmb1.png",
        "hoodies/fog-essentials-hoodie-v0-koqz2g505nib1.png",
        "shirts/shirt.png",
        "hoodies/ralph-lauren-sweater-and-hoodie-pandabuy-v0-pb37o61tmhmb1.png",
        "hoodies/fog-essentials-hoodie-v0-koqz2g505nib1.png"
      ]
    ];

    const container = document.getElementById("item-section");

    columnsData.forEach((images) => {
      const column = document.createElement("div");
      column.classList.add("column");

      images.forEach((src) => {
        const item = document.createElement("div");
        item.classList.add("item");

        const img = document.createElement("img");
        img.src = src;
        item.appendChild(img);

        column.appendChild(item);
      });

      container.appendChild(column);
    });

    document.querySelectorAll('.item img').forEach(img => {
  img.addEventListener('click', () => {

    // preview

    const discriptors = document.querySelector('.discriptors');
    discriptors.classList.toggle('dn');

    //


    if (document.querySelector('.zoom-wrapper')) return;

    const rect = img.getBoundingClientRect();

    // wrapper div
    const wrapper = document.createElement('div');
    wrapper.className = 'zoom-wrapper';
    wrapper.style.position = 'fixed';
    wrapper.style.top = rect.top + (-30) + 'px';
    wrapper.style.left = rect.left + 'px';
    wrapper.style.width = rect.width + 'px';
    wrapper.style.height = rect.height + 'px';
    wrapper.style.margin = '0';
    wrapper.style.zIndex = '1000';
    wrapper.style.transition = 'transform 0.8s var(--smooth-dept), opacity 2s var(--smooth-dept)';
    wrapper.style.cursor = 'pointer';


    // clone image
    const clone = img.cloneNode();
    clone.style.width = '100%';
    clone.style.height = '100%';
    clone.style.objectFit = 'contain';

    wrapper.appendChild(clone);

    // close button
    const btn = document.createElement('button');
    btn.className = 'zoom-close';
    btn.textContent = 'Close';

    document.body.append(wrapper, btn);

    img.style.opacity = 0;

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const wrapperCx = rect.left + rect.width / 2;
    const wrapperCy = rect.top + rect.height / 2;
    const translateX = cx - wrapperCx;
    const translateY = cy - wrapperCy;
    const scale = 1.5;

    requestAnimationFrame(() => {
      wrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      btn.style.opacity = '1';
    });

    btn.onclick = () => {
      wrapper.style.transform = 'translate(0, 0) scale(1)';
      btn.style.opacity = '0';
        discriptors.classList.toggle('dn');

      wrapper.addEventListener('transitionend', () => {
        wrapper.classList.remove('js-zmed');
        wrapper.remove();
        btn.remove();
        img.style.opacity = 1;
      }, { once: true });
    };
  });
});

