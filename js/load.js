document.getElementById("loadButton").addEventListener("click", function() {
    const iterationInput = document.getElementById("iterationInput");
    let inputValue = iterationInput.value.replace(/,/g, ''); // Remove commas from input value
    const iterations = parseInt(inputValue);

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
        const text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
    }

    const endTime = performance.now();

    const loadTime = (endTime - startTime) / 1000; // Convert milliseconds to seconds

    const resultElement = document.querySelector(".result"); 
    resultElement.textContent = loadTime.toFixed(3); // Display load time with 3 decimal places
});

function load() {
    const iterationInput = document.getElementById("iterationInput");
    let inputValue = iterationInput.value.replace(/,/g, ''); // Remove commas from input value
    const iterations = parseInt(inputValue);

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
        const text = `Lorem ipsum dolor sit amet, consectetur adipiscing elit.`;
    }

    const endTime = performance.now();

    const loadTime = (endTime - startTime) / 1000; // Convert milliseconds to seconds

    const resultElement = document.querySelector(".result");
    resultElement.textContent = loadTime.toFixed(3);
}

load();

