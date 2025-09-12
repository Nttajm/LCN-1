import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { toggleClass } from "./service.js";
import { retriggerShuffleOnShow } from "./shuffle.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { createCarousel } from "./carousel.js";

const firebaseConfig = {
  apiKey: "AIzaSyDkPsE0uD-1_V5_QfM-RhtaIviQlINW2DA",
  authDomain: "lcntests.firebaseapp.com",
  projectId: "lcntests",
  storageBucket: "jmblanks.appspot.com",
  messagingSenderId: "665856876392",
  appId: "1:665856876392:web:c6274b52a9e90c3d6400dd"
}; 

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export let userid;
export let userName;
const pctcBtn = document.querySelector(".proceed-to-checkout-btn");
if (pctcBtn) {
  pctcBtn.addEventListener("click", async () => {
    if (!pctcBtn) return;
    const user = auth.currentUser;

    if (user) {
      // Save user to Firestore "users" collection
      try {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL
        });
      } catch (err) {
        console.error("Error saving user:", err);
      }
      // Already logged in → redirect to checkout
      window.location.href = "/checkout.html";
    } else {
      try {
        const result = await signInWithPopup(auth, provider);
        const newUser = result.user;
        // Save user to Firestore "users" collection
        try {
          await setDoc(doc(db, "users", newUser.uid), {
            uid: newUser.uid,
            name: newUser.displayName,
            email: newUser.email,
            photoURL: newUser.photoURL
          });
        } catch (err) {
          console.error("Error saving user:", err);
        }
        console.log("Signed in as:", newUser.displayName);
        // Redirect after successful login
        window.location.href = "/checkout.html";
      } catch (error) {
        console.error("Google login failed:", error);
        alert("Login failed. Please try again.");
      }
    }
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    const userElem = document.querySelector(".user");
    if (!userElem) return;
    userElem.classList.remove("dn");
    userElem.querySelector("img").src = user.photoURL;

    userid = user.uid;
    userName = user.displayName;

    updateOrderSummary(userid);

  } else {
    console.log("No user is signed in.");
  }
});

let productId;
export async function reloadProducts() {
  products.length = 0;
  const querySnapshot = await getDocs(collection(db, "products"));
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    products.push({
  id: doc.id,
  price: data.price,
  name: data.name,
  company: data.company,
  img: data.mainPhoto,
  size: data.size,
  sold: data.sold ? data.sold : false,
  clothingPhotos: Array.isArray(data.clothingPhotos) ? data.clothingPhotos : [] // ✅ add this
});

  });
}



// Firebase config
const container = document?.getElementById("item-section");

  export const products = [];
  console.log(products)

export async function loadProducts() {
  const querySnapshot = await getDocs(collection(db, "products"));

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    // Only take mainPhoto and price
    products.push({
      id: doc.id,
      price: data.price,
      name: data.name,
      company: data.company,
      img: data.mainPhoto,
      size: data.size,
      sold: data.sold ? data.sold : false,
      clothingPhotos: Array.isArray(data.clothingPhotos) ? data.clothingPhotos : [] // ✅ add this
    });
  });

//   const products = [
//     {
//         "id": "1gCh6bkVNuFFGFEH8Jul",
//         "price": 400,
//         "name": "Regular Shirt",
//         "company": "GoodFellow",
//         "img": "https://res.cloudinary.com/ddxfj8knl/image/upload/v1755648808/isr8xyk3faxzksk7kuov.png",
//         "size": "M"
//     },
//     {
//         "id": "CdAhGESxNkUBRHWYydKQ",
//         "price": 500,
//         "name": "LASO\n",
//         "company": "EN",
//         "img": "https://res.cloudinary.com/ddxfj8knl/image/upload/v1755649000/frjayw85lvexj9llayb2.png",
//         "size": "L"
//     },
//     {
//         "id": "QoW4OejarjYdagVLTG4P",
//         "price": 500,
//         "name": "Polo Ralph lueran",
//         "company": "Polo",
//         "img": "https://res.cloudinary.com/ddxfj8knl/image/upload/v1755379919/products/main/main_product_1755379923472.png",
//         "size": "M"
//     },
//     {
//         "id": "moKjyuvYlxxiUJE4sFyy",
//         "price": 11,
//         "name": "Polo Ralph lueran",
//         "company": "Polo",
//         "img": "https://res.cloudinary.com/ddxfj8knl/image/upload/v1755380242/vfhjsx89m7wyhphfrtkl.png",
//         "size": "XL"
//     },
//     {
//         "id": "p8wBeNH1G8bPcBtGhhxH",
//         "price": 2500,
//         "name": "Center Swoosh hoodie",
//         "company": "Nike",
//         "img": "https://res.cloudinary.com/ddxfj8knl/image/upload/v1755745111/plaapye5pk4x274rrara.png",
//         "size": "L"
//     },
//     {
//         "id": "s3bYxy1aX78dFWIiJGlf",
//         "price": 1500,
//         "name": "CREAM HOODIE",
//         "company": "Carhart",
//         "img": "https://res.cloudinary.com/ddxfj8knl/image/upload/v1755744622/kbbxjhjm2dhduhyizzcb.png",
//         "size": "L"
//     }
// ]

//   const products = [
//   {
//     id: 1,
//     price: 3999,
//     img: "hoodies/fog-essentials-hoodie-v0-koqz2g505nib1.png",
//     details: ["hoodies/detail1.png", "hoodies/detail2.png"]
//   },
//   {
//     id: 2,
//     price: 4999,
//     img: "hoodies/ralph-lauren-sweater-and-hoodie-pandabuy-v0-pb37o61tmhmb1.png",
//     details: ["hoodies/detail3.png", "hoodies/detail4.png"]
//   },
//   {
//     id: 3,
//     price: 2999,
//     img: "shirts/shirt.png",
//     details: ["shirts/detail1.png", "shirts/detail2.png"]
//   },
//   {
//     id: 4,
//     price: 3999,
//     img: "hoodies/fog-essentials-hoodie-v0-koqz2g505nib1.png",
//     details: ["hoodies/detail1.png", "hoodies/detail2.png"]
//   },
//   {
//     id: 1,
//     price: 3999,
//     img: "hoodies/fog-essentials-hoodie-v0-koqz2g505nib1.png",
//     details: ["hoodies/detail1.png", "hoodies/detail2.png"]
//   },
//   {
//     id: 2,
//     price: 4999,
//     img: "hoodies/ralph-lauren-sweater-and-hoodie-pandabuy-v0-pb37o61tmhmb1.png",
//     details: ["hoodies/detail3.png", "hoodies/detail4.png"]
//   },
//   {
//     id: 3,
//     price: 2999,
//     img: "shirts/shirt.png",
//     details: ["shirts/detail1.png", "shirts/detail2.png"]
//   },
//   {
//     id: 4,
//     price: 3999,
//     img: "hoodies/fog-essentials-hoodie-v0-koqz2g505nib1.png",
//     details: ["hoodies/detail1.png", "hoodies/detail2.png"]
//   },
//   {
//     id: 1,
//     price: 3999,
//     img: "hoodies/fog-essentials-hoodie-v0-koqz2g505nib1.png",
//     details: ["hoodies/detail1.png", "hoodies/detail2.png"]
//   },
//   {
//     id: 2,
//     price: 4999,
//     img: "hoodies/ralph-lauren-sweater-and-hoodie-pandabuy-v0-pb37o61tmhmb1.png",
//     details: ["hoodies/detail3.png", "hoodies/detail4.png"]
//   },
//   {
//     id: 3,
//     price: 2999,
//     img: "shirts/shirt.png",
//     details: ["shirts/detail1.png", "shirts/detail2.png"]
//   },
//   {
//     id: 4,
//     price: 3999,
//     img: "hoodies/fog-essentials-hoodie-v0-koqz2g505nib1.png",
//     details: ["hoodies/detail1.png", "hoodies/detail2.png"]
//   },
// ];


  renderProducts(products);

}


function renderProducts(products) {
  function createProductItem(product) {
    const item = document.createElement("div");
    item.classList.add("item");

    const img = document.createElement("img");
    img.src = product.img;
    img.alt = `Product ${product.id}`;
    item.appendChild(img);
    img.id = product.id;

    return item;
  }

  if (!container) return;
  container.innerHTML = "";

  const columns = 4;
  const columnData = Array.from({ length: columns }, () => []);

  // Filter out sold products first
  const visibleProducts = products.filter(p => !p.sold);

  // Split products into two halves: first half goes to col 1 & 2, second half to col 3 & 4
  const half = Math.ceil(visibleProducts.length / 2);
  const firstHalf = visibleProducts.slice(0, half);
  const secondHalf = visibleProducts.slice(half);

  function distribute(pairProducts, colA, colB) {
    pairProducts.forEach((p, i) => {
      if (i % 2 === 0) {
        columnData[colA].push(p);
      } else {
        columnData[colB].push(p);
      }
    });
  }

  distribute(firstHalf, 0, 1); // distribute to columns 1 & 2
  distribute(secondHalf, 2, 3); // distribute to columns 3 & 4

  // Render
  columnData.forEach(colProducts => {
    const column = document.createElement("div");
    column.classList.add("column");
    colProducts.forEach(product => {
      column.appendChild(createProductItem(product));
    });
    container.appendChild(column);
  });
}



// function renderProducts(products) {
//   container.innerHTML = ""; // clear existing columns first

//   const columns = 4;
//   const columnData = Array.from({ length: columns }, () => []);

//   // Distribute products into 4 columns as evenly as possible
//   products.forEach((product, idx) => {
//     if (product.sold) return;
//     const columnIndex = idx % columns;
//     columnData[columnIndex].push(product);
//   });

//   columnData.forEach(colProducts => {
//     const column = document.createElement("div");
//     column.classList.add("column");

//     colProducts.forEach(product => {
//       column.appendChild(createProductItem(product));
//     });

//     container.appendChild(column);
//   });
// }



// Load data on page load
async function displayDetails(productId) {
 return products.find(p => p.id === productId);
}

loadProducts().then(() => {
  console.log("Products loaded:", products);
})



function shuffleText() {
  const name = document.querySelector(".item-name");
  const company = document.querySelector(".brand");
  const size = document.querySelector(".item-size");
  const price = document.querySelector(".item-price");

  name.classList.toggle("js-shuffle");
  company.classList.toggle("js-shuffle");
  size.classList.toggle("js-shuffle");
  price.classList.toggle("js-shuffle");

}

if (container) {
  // click product image
  container.addEventListener("click", async (e) => {
    if (!container) return;
    if (!e.target.closest(".item img")) return;
    const img = e.target.closest(".item img");
    if (!img) return;
  if (img.classList.contains('origin-zoom')) {
    img.classList.remove('origin-zoom');
  }

  productId = img.id;
  console.log(productId);
  const product = await displayDetails(productId);

  const name = document.querySelector(".item-name");
  const company = document.querySelector(".brand");
  const size = document.querySelector(".item-size");
  const price = document.querySelector(".item-price");

  name.textContent = product.name;
  company.textContent = 'company: ' + product.company;
  size.textContent = 'size: ' + product.size;
  price.textContent = `$${(product.price / 100).toFixed(2)}`;

  const clothingPhotos = product.clothingPhotos || [];

  createCarousel("js-carousel-root", clothingPhotos);


  if (document.querySelector(".zoom-wrapper")) return;
  
  
  const rect = img.getBoundingClientRect();

  const wrapper = document.createElement("div");
  wrapper.className = "zoom-wrapper";
  Object.assign(wrapper.style, {
    position: "fixed",
    top: rect.top + "px",
    left: rect.left + "px",
    width: rect.width + "px",
    height: rect.height + "px",
    margin: "0",
    zIndex: "100",
    transition: "transform .5s cubic-bezier(.21,.61,.35,1), opacity .2s ease",
    cursor: "pointer",
    background: "rgba(0,0,0,0)" // avoids flicker
  });

  // clone the IMG, not the div
  const clone = img.cloneNode(true);
  Object.assign(clone.style, {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block"
  });
  wrapper.appendChild(clone);

  // close button
  const btn = document.createElement("button");
  btn.className = "zoom-close";
  btn.textContent = "Close";
  Object.assign(btn.style, {
    position: "fixed",
    top: "16px",
    right: "16px",
    zIndex: "103",
    opacity: "0",
  });

  document.body.append(wrapper, btn);

  // hide original
  img.style.opacity = "0";

  // center + scale
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const wrapperCx = rect.left + rect.width / 2;
  const wrapperCy = rect.top + rect.height / 2;
  const translateX = cx - wrapperCx;
  const translateY = cy - wrapperCy;
  const scale = 1.5;

  // animate to center + scale

  requestAnimationFrame(() => {
    wrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    btn.style.opacity = "1";
  });

  const topDescriptor = document.querySelector(".top-disc");
  const bottomDescriptor = document.querySelector(".bottom-disc");
  const background = document.querySelector(".background-color");
  const carousel = document.querySelector(".carousel");

  const rightArrow = document.querySelector(".carousel-arrow.right");
  const leftArrow = document.querySelector(".carousel-arrow.left");

    toggleClass(topDescriptor, "zero-out", "zero-in-negy");
    toggleClass(bottomDescriptor, "zero-out", "zero-in-posy");
    toggleClass(background, "fullHeight", "hideHeight");

    toggleClass(rightArrow, "zero-out", "zero-in-negx");
    toggleClass(leftArrow, "zero-out", "zero-in-posx");
    toggleClass(carousel, "carousel-out", "carousel-in");

  const close = () => {
    btn.style.opacity = "0";

    wrapper.classList.add("zoom-out-js");

    toggleClass(topDescriptor, "zero-out", "zero-in-negy");
    toggleClass(bottomDescriptor, "zero-out", "zero-in-posy");
    toggleClass(background, "hideHeight", "fullHeight");

    toggleClass(rightArrow, "zero-out", "zero-in-posx");
    toggleClass(leftArrow, "zero-out", "zero-in-negx");
    toggleClass(carousel, "carousel-out", "carousel-in");


    wrapper.addEventListener(
      "transitionend",
      () => {
        wrapper.remove();
        btn.remove();
        img.classList.add('origin-zoom');
        img.style.opacity = "1";
      },
      { once: true }
    );
  };

  btn.addEventListener("click", close);
});
}

function addToCart(e) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  if (productId) {
    if (cart.includes(productId)) {
      alert("Item already in cart");
      return;
    }
    cart.push(productId);
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();

    // Temporarily change button text and add class
    const btn = e.currentTarget;
    const originalText = btn.textContent;
    btn.textContent = "Added to cart!";
    btn.classList.add("added");
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove("added");
    }, 1000);
  }
}

const addToCartButton = document.querySelectorAll(".add-to-cart");
addToCartButton.forEach(button => {
  button.addEventListener("click", addToCart);
});


async function updateOrderSummary(userid) {
  const userOrdersRef = collection(db, "users", userid, "userOrders");
  const userOrdersSnap = await getDocs(userOrdersRef);

  if (userOrdersSnap.empty) {
    console.log("No orders found for this user!");
    return;
  }

  // Make sure products are loaded so we can look up product images/names
  if (!products || products.length === 0) {
    await loadProducts();
  }

  const orderItemsRenderSection = document.querySelector(".order-items");
  if (!orderItemsRenderSection) return;
  orderItemsRenderSection.innerHTML = "";

  for (const userOrderDoc of userOrdersSnap.docs) {
    const { orderId } = userOrderDoc.data();
    if (!orderId) continue;

    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) continue;

    const order = orderSnap.data();
    if (order.status !== "verified") continue;

    // Convert timestamp to readable date
    const date = order.createdAt?.toDate().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Calculate total
    let total = 0;
    order.products.forEach(p => {
      const prod = products.find(pr => pr.id === p.id);
      if (prod) total += (prod.price / 100) * (p.quantity || 1);
    });

    const images = order.products.map(p => {
      const prod = products.find(pr => pr.id === p.id);
      return prod ? `<img src="${prod.img}" alt="${prod.name}">` : "";
    }).join("");

    console.log("order:", order);

    const location = order.pickup;

    // Render
    orderItemsRenderSection.innerHTML += `
      <div class="order-item">
      <div class="order-imgs">
        ${images}
      </div>
      <div class="order-item-details">
        <span class="order-date">${date}</span>
        <span class="order-total">Total: $${total.toFixed(2)}</span>
        <span class="order-items-count">${order.products.length} ${order.products.length === 1 ? 'item' : 'items'}</span>
        <span class="order-location">${location}</span>

      </div>
      </div>
    `;
  }
}

async function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const count = cart.length;
  const cartNav = document.querySelector(".cart");
  if (!cartNav) return;

  if (count === 0) {
    cartNav.classList.add("dn");
  } else {
    cartNav.classList.remove("dn");
  }

  document.querySelectorAll(".cart-count-js").forEach(el => {
    el.textContent = count;
  });

  const cartItemSection = document.querySelector(".cart-item-section");
  if (!cartItemSection) return;
  cartItemSection.innerHTML = ""; // Clear existing items

  // Show loading while waiting for products
  const loadingMsg = document.createElement("div");
  loadingMsg.className = "cart-loading";
  loadingMsg.textContent = "Loading cart...";
  cartItemSection.appendChild(loadingMsg);

  // Wait for products to be loaded if not yet available
  if (!Array.isArray(products) || products.length === 0) {
    if (typeof loadProducts === "function") {
      await loadProducts();
    }
  }

  // Remove loading message
  loadingMsg.remove();

  const cartItems = cart
    .map(id => {
      const product = products.find(p => p.id === id);
      return product ? { 
        id: product.id, 
        name: product.name, 
        price: product.price, 
        company: product.company, 
        img: product.img, 
        size: product.size,
        sold: product.sold
      } : null;
    })
    .filter(item => item !== null);

  if (cartItems.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "cart-empty";
    emptyMsg.textContent = "No products in cart";
    cartItemSection.appendChild(emptyMsg);
    return;
  }



  cartItems.forEach(item => {
    console.log(item);
    const div = document.createElement("div");
    div.className = "cart-item" + (item.sold ? " sold" : "");
    div.innerHTML = `
      ${item.sold ? '<span class="cart-item-sold">Sold</span>' : ""}
      <img src="${item.img}" alt="${item.name}" class="cart-item-img">
      <div class="cart-items-details">
        <span class="cart-item-name">${item.name}</span>
        <button class="cart-item-delete icono-s" data-id="${item.id}" title="Remove from cart" style="margin-left:8px;">
          <img src="icons/trash.png" alt="Remove from cart" />
        </button>
        <span class="cart-item-company">${item.company}</span>
        <span class="cart-item-size">Size: ${item.size}</span>
        <span class="cart-item-condition">Condition: 4</span>
        <span class="cart-item-price">$${(item.price / 100).toFixed(2)}</span>
      </div>
    `;
    cartItemSection.appendChild(div);
  });

  const totalElem = document.querySelector(".cart-total");
  const total = cartItems
    .filter(item => !item.sold)
    .reduce((sum, item) => sum + item.price, 0);
  totalElem.textContent = `$${(total / 100).toFixed(2)}`;

  // Add event listeners for delete buttons
  cartItemSection.querySelectorAll(".cart-item-delete").forEach(btn => {
    btn.addEventListener("click", function () {
      const id = btn.getAttribute("data-id");
      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      const idx = cart.indexOf(id);
      if (idx !== -1) {
        cart.splice(idx, 1);
        localStorage.setItem("cart", JSON.stringify(cart));
        updateCartCount();
      }
    });
  });
}

function toggleCart() {
  const cart = document.querySelector(".checkout-section");
  if (!cart) return;
  if (cart.classList.contains("cart-in")) {
    cart.classList.remove("cart-in");
    cart.classList.add("cart-out");
  } else {
    cart.classList.remove("cart-out");
    cart.classList.add("cart-in");
  }
}

function toggleOrderSummary() {
  const order = document.querySelector(".order-section");
  if (!order) return;
  if (order.classList.contains("order-in")) {
    order.classList.remove("order-in");
    order.classList.add("order-out");
  } else {
    order.classList.remove("order-out");
    order.classList.add("order-in");
  }
}

const toggleCartBtns = document.querySelectorAll(".cart-toggle-js");
toggleCartBtns.forEach(btn => {
  btn.addEventListener("click", toggleCart);
});

const toggleOrderBtns = document.querySelectorAll(".order-toggle-js");
toggleOrderBtns.forEach(btn => {
  btn.addEventListener("click", toggleOrderSummary);
});



document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
});

function clearCart() {
  localStorage.removeItem("cart");
  updateCartCount();
}

// clearCart();


// CustomEase.create(".checkout-section", "M0,0 C0.343,0.203 0.254,0.806 0.485,0.835 0.739,0.866 0.74,0.117 1,0 ");