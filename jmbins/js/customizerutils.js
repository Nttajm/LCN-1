import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getFirestore, collection, getDocs, getDoc, doc, setDoc , addDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import { toggleClass } from "./service.js";
import { retriggerShuffleOnShow } from "./shuffle.js";
import { createCarousel } from "./carousel.js";
import { tutorial } from "./tutorial.js";
import { designElements, exportDesign} from "./customizer.js";

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

// --- Helpers ---
function getProductIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("productId");
}

const products = [];

async function loadProducts() {
  const querySnapshot = await getDocs(collection(db, "products"));

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    products.push({
      id: docSnap.id,
      price: data.price,
      name: data.name,
      company: data.company,
      img: data.mainPhoto,
      size: data.size,
      sold: data.sold ?? false,
      customizable: data.customizable ?? false,
      customPrice: data.customPrice ?? 0,
      clothingPhotos: Array.isArray(data.clothingPhotos) ? data.clothingPhotos : []
    });
  });
}

function getProduct() {
  const productId = getProductIdFromURL();
  return products.find((p) => p.id === productId);
}

function loadProductDetails(product) {
  const mainImage = document.getElementById("shirtImage");
  if (product && mainImage) {
    mainImage.src = product.customizerimg || product.img;
  }
}

let selectedProduct;

// --- Init ---
async function init() {
  await loadProducts();
  selectedProduct = getProduct();
  loadProductDetails(selectedProduct);
}

init();

function displayCustomizationDetails(product) { 
  const finalDetailsDiv = document.querySelector(".finalization-prices-cont");
  finalDetailsDiv.classList.toggle('dn');

  const pricesSection = document.querySelector(".price-cont");
  pricesSection.classList.toggle('final');
  pricesSection.innerHTML = ""; // reset

  // Base item price from product doc
  const itemPrice = parseFloat(product?.price || 0) / 100;

  // --- add item price row ---
  pricesSection.innerHTML += `
    <div class="price">
      <span class="name">Item Price</span>
      <span class="value" id="itemPrice">$${itemPrice.toFixed(2)}</span>
    </div>
  `;

  // normalize designElements into an array
  let elementsArr = [];
  if (Array.isArray(designElements)) {
    elementsArr = designElements;
  } else if (designElements && typeof designElements === "object") {
    elementsArr = Object.values(designElements);
  }

  let customFeeTotal = 0;

  // Loop through customizations
  elementsArr.forEach((el, i) => {
    let label = "";
    let fee = 0;

    if (el.type === "text" && el.cutout) {
      label = `Cutout Text: "${el.text}"`;
      fee = 5.99; // your fee for text
    }else if (el.type === "text") {
      label = `Text: "${el.text}"`;
      fee = 2.99; // your fee for text
    } else if (el.type === "image") {
      label = `Image: "${el.name}"`;
      fee = 2.99; // your fee for image
    }

    customFeeTotal += fee;
    pricesSection.innerHTML += `
      <div class="price total">
        <span class="name">${label}</span>
        <span class="value">$${fee.toFixed(2)}</span>
      </div>
    `;
  });

    let baseCustomFee = parseFloat(product?.customPrice || 0) / 100;


  // --- customization fee row (sum) ---
  pricesSection.innerHTML += `
    <div class="price">
      <span class="name">Customization Fee</span>
      <span class="value" id="customPrice">$${baseCustomFee.toFixed(2)}</span>
    </div>
  `;

  // --- grand total ---
  const grandTotal = itemPrice + customFeeTotal + baseCustomFee;
  pricesSection.innerHTML += `
    <div class="price grand-total">
      <span class="name">Grand Total</span>
      <span class="value">$${grandTotal.toFixed(2)}</span>
    </div>
  `;

  console.log("Customization totals calculated:", calculateCustomizationTotals(product));
}




const nextbtn = document.getElementById("nextbtn");
nextbtn.addEventListener("click", () => {
  displayCustomizationDetails(getProduct());
});

function calculateCustomizationTotals(product) {
  // base item price from product doc (assuming stored in cents)
  const itemPrice = parseFloat(product?.price || 0) / 100;

  // normalize designElements into an array
  let elementsArr = [];
  if (Array.isArray(designElements)) {
    elementsArr = designElements;
  } else if (designElements && typeof designElements === "object") {
    elementsArr = Object.values(designElements);
  }

  const breakdown = [];
  let customFeeTotal = 0;
  let basePrice = parseFloat(product?.customPrice || 0) / 100;
  let shirtImgfees = 0;

  elementsArr.forEach((el) => {
    let fee = 0;
    let label = "";

    if (el.type === "text") {
      fee = 0.80; // per text fee
      label = `Text: "${el.text}"`;
    } else if (el.type === "image") {
      fee = 2.50; // per image fee
      label = `Image: "${el.name}"`;
      
    }

    breakdown.push({
      type: el.type,
      label,
      fee: fee,
    });

    customFeeTotal += fee;
  });

  const grandTotal = itemPrice + customFeeTotal + basePrice;

  return {
    itemPrice,
    productId: product?.id || null,
    customFeeTotal,
    grandTotal,
    breakdown, // list of individual text/image entries
  };
}

    const CLOUD_NAME = "ddxfj8knl";       // replace with your Cloudinary cloud name
    const UPLOAD_PRESET = "clothing"; // replace with your unsigned upload preset

// upload a Blob to Cloudinary
async function uploadDesignToCloudinary(blob) {
  const formData = new FormData();
  formData.append("file", blob);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  return data.secure_url; // Cloudinary reference link
}

async function saveCustomDesign(product) {
  try {
    // 1. Export design as Blob
    const blob = await new Promise((resolve) => {
      exportDesign((b) => resolve(b));  // modify exportDesign to accept a callback w/ blob
    });

    // 2. Upload design to Cloudinary
    const cloudinaryUrl = await uploadDesignToCloudinary(blob);

    // 3. Calculate totals
    const totals = calculateCustomizationTotals(product);

    // 4. Create Firestore doc in "customs"
    const docRef = await addDoc(collection(db, "customs"), {
      productId: totals.productId,
      designUrl: cloudinaryUrl,
      grandTotal: totals.grandTotal,
      customFeeTotal: totals.customFeeTotal,
      itemPrice: totals.itemPrice,
      breakdown: totals.breakdown,
      createdAt: new Date()
    });

    // 5. Update doc with its own ID
    await setDoc(doc(db, "customs", docRef.id), { id: docRef.id }, { merge: true });

    console.log("✅ Custom design saved:", docRef.id);
    return docRef.id;

  } catch (err) {
    console.error("❌ Error saving custom design:", err);
    throw err;
  }
}

const done = document.getElementById("donebtn");
done.addEventListener("click", async () => {

  await saveCustomDesign(selectedProduct);

  // window.location.href = "index.html"; // redirect to cart
});


const iphoneTutorial = [
  { icon: "👕", title: "Welcome Jmbins Customizer", text: "Let's walk you through the basics of customizing your clothing." },
  { img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop", title: "Importing Images", text: "When importing images, make sure the borders are smooth and not jagged or complex for best results." },
  { img: "shirts/later.webp", title: "Guidelines", text: "Not recommended but, please keep logos on designs for personal use only. what i have to say: By uploading this design you warrant and represent that you own all intellectual property rights." },
  { icon: "🚚", title: "Shipping Notice", text: "Customizations will add 3-4 days to your shipping order for processing. small business :)" },
  { icon: "☁️", title: "Save Your Work", text: "Remember to save your custom designs locally for personal use." }
];

// Launch tutorial
tutorial(iphoneTutorial, "customSetup");