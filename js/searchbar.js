var searchInput = document.getElementById('searchInput');

// Event listener for keydown event
    document.addEventListener('keydown', function(event) {
    // Check if the pressed key is the Enter key (keyCode 13)
    if (event.keyCode === 13) {
        // Prevent the default form submission behavior
        event.preventDefault();

        // Get the user's input from the search input
        var userInput = searchInput.value.trim();

        // If the user input is not empty, redirect to the specified URL
        if (userInput !== "") {
            // Construct the URL by appending user input to the base URL
            var redirectURL = "https://lcnjoel.com/" + userInput;

            // Redirect to the constructed URL
            window.location.href = redirectURL;
        }
    }
});
