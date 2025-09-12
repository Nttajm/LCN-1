import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
    import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

    // Firebase config
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

    // Cloudinary config
    const CLOUD_NAME = "ddxfj8knl";       // replace with your Cloudinary cloud name
    const UPLOAD_PRESET = "clothing"; // replace with your unsigned upload preset

    const form = document.getElementById("productForm");
    const status = document.getElementById("status");

    async function uploadToCloudinary(file) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      return data.secure_url; // the uploaded image URL
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      status.textContent = "Uploading...";

      const name = document.getElementById("name").value;
      const company = document.getElementById("company").value;
      const condition = document.getElementById("condition").value;
      const type = document.getElementById("type").value;
      const clothingType = document.getElementById("clothingType").value;
      const size = document.getElementById("size").value;
      const price = document.getElementById("price").value;

      const mainPhotoFile = document.getElementById("mainPhoto").files[0];
      const clothingFiles = document.getElementById("clothingPhotos").files;

      try {
        // Upload main photo
        const mainUrl = await uploadToCloudinary(mainPhotoFile);

        // Upload clothing photos
        const clothingUrls = [];
        for (let file of clothingFiles) {
          const url = await uploadToCloudinary(file);
          clothingUrls.push(url);
        }

        // Save doc to Firestore
        await addDoc(collection(db, "products"), {
          name,
          company,
          condition: Number(condition),
          type,
          clothingType,
          size,
          price: Number(price) * 100, // convert to cents
          mainPhoto: mainUrl,
          clothingPhotos: clothingUrls,
          createdAt: new Date()
        });

        status.textContent = "✅ Product uploaded!";
        form.reset();
      } catch (err) {
        console.error(err);
        status.textContent = "❌ Upload failed: " + err.message;
      }
    });