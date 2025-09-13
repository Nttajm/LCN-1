import { products, reloadProducts, loadProducts} from "./idx.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";


products;
async function init() {
  await loadProducts();   // wait until products are loaded
  loadprices();           // only then calculate totals
}
init();


let userid;
let userName;

onAuthStateChanged(getAuth(), user => {
  userid = user.uid;
  userName = user ? user.displayName : 'Guest';
  console.log("User ID:", userid);
  console.log("User Name:", userName);
});


const banner = document.querySelector(".banner"); // ✅ get banner element
const button = document.querySelector(".checkout-btn");
button.addEventListener("click", async () => {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  if (cart.length === 0) {
    alert("No products in cart");
    return;
  }

  // Get cart items from products array
  const cartItems = cart
    .map(id => products.find(p => p.id === id))
    .filter(item => item && !item.sold);

  if (cartItems.length === 0) {
    alert("All products in cart are sold or unavailable.");
    return;
  }

  // Check if pickup option is selected
  const pickupSelected = document.querySelector(".pick-up-options .order-box.selected");
  if (!pickupSelected) {
    alert("Please select a pickup option before continuing.");
    return;
  }

  banner.style.display = "flex";

  try {
    const res = await fetch("https://backend2-b76r.onrender.com/create-checkout-session", {
    // const res = await fetch("http://localhost:3005/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: userid,
        userName: userName,
        pickup: pickupSelected.dataset.value,
        items: cartItems.map(item => ({
          id: item.id,
          quantity: 1
        })),
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create checkout session");
    }

    const { url } = await res.json();
    banner.style.display = "none";
    window.location = url;

  } catch (e) {
    console.error("Checkout error:", e.message);
    alert("Something went wrong. Please try again.");
  }
});


    const pickup = document.getElementById("pickup");
    const pickupOptions = document.getElementById("pickup-options");

    pickup.addEventListener("click", () => {
      pickup.classList.toggle("selected");
      pickupOptions.classList.toggle("show");
    });

    // Allow clicking pickup options to select one
    document.querySelectorAll(".pick-up-options .order-box").forEach(option => {
      option.addEventListener("click", () => {
        document.querySelectorAll(".pick-up-options .order-box").forEach(o => o.classList.remove("selected"));
        option.classList.add("selected");
      });
    });



function loadprices() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  const cartItems = cart
    .map(id => {
      const product = products.find(p => p.id === id);
      return product ? {
        id: product.id,
        name: product.name,
        // ✅ Convert price from cents to dollars
        price: product.price / 100,
        company: product.company,
        img: product.img,
        size: product.size,
        sold: product.sold
      } : null;
    })
    .filter(item => item !== null);

  // ✅ Only sum non-sold items
  const totalPrice = cartItems
    .filter(item => !item.sold)
    .reduce((sum, item) => sum + item.price, 0);

  const tax = (totalPrice * 0.085).toFixed(2);
  document.querySelector("#est-tax").textContent = `$${tax}`;

  const handling = (totalPrice * 0.03).toFixed(2);
  document.querySelector("#est-handling").textContent = `$${handling}`;

  const finalTotal = (totalPrice + parseFloat(tax) + parseFloat(handling)).toFixed(2);
  document.querySelector(".final-cart-total").textContent = `$${finalTotal}`;
}

