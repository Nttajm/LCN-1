import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getFirestore, collection, getDocs, getDoc, doc, setDoc 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import { toggleClass } from "./service.js";
import { retriggerShuffleOnShow } from "./shuffle.js";
import { createCarousel } from "./carousel.js";
import { tutorial } from "./tutorial.js";

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

// --- Init ---
async function init() {
  await loadProducts();
  const selectedProduct = getProduct();
  loadProductDetails(selectedProduct);
}

init();


const iphoneTutorial = [
  { icon: "👕", title: "Welcome Jmbins Customizer", text: "Let's walk you through the basics of customizing your clothing." },
  { img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop", title: "Importing Images", text: "When importing images, make sure the borders are smooth and not jagged or complex for best results." },
  { img: "shirts/later.webp", title: "Guidelines", text: "Not recommended but, please keep logos on designs for personal use only. what i have to say: By uploading this design you warrant and represent that you own all intellectual property rights." },
  { icon: "🚚", title: "Shipping Notice", text: "Customizations will add 3-4 days to your shipping order for processing. small business :)" },
  { icon: "☁️", title: "Save Your Work", text: "Remember to save your custom designs locally for personal use." }
];

// Launch tutorial
tutorial(iphoneTutorial, "lols_iphones");