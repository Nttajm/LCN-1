
var searchInput = document.getElementById('searchInput');
var suggestionsContainer = document.getElementById('suggestions');

var suggestions = [
 
];

searchInput.addEventListener('input', function() {
    var userInput = searchInput.value.trim().toLowerCase();
    var filteredSuggestions = suggestions.filter(function(suggestion) {
        return suggestion.toLowerCase().includes(userInput);
    });

    displaySuggestions(filteredSuggestions.slice(0, 3), userInput);
});

function displaySuggestions(suggestionsArray, userInput) {
    suggestionsContainer.innerHTML = '';

    if (suggestionsArray.length > 0) {
        suggestionsContainer.style.display = 'block'; // Show the suggestions container

        suggestionsArray.forEach(function(suggestion) {
            var suggestionElement = document.createElement('div');
            suggestionElement.innerHTML = highlightMatchedCharacters(suggestion, userInput);
            suggestionElement.setAttribute('onclick', 'redirectToSuggestion(this.innerText)');

            suggestionsContainer.appendChild(suggestionElement);
        });
    } else {
        suggestionsContainer.style.display = 'none'; // Hide the suggestions container
    }
}

function redirectToSuggestion(suggestion) {
    var redirectURL = "./" + suggestion;
    window.location.href = redirectURL;
}

function highlightMatchedCharacters(suggestion, userInput) {
    var regex = new RegExp(userInput, 'ig');
    return suggestion.replace(regex, match => `<span style="background-color: blue; color: white;">${match}</span>`);
}

document.addEventListener('click', function(event) {
    // Close suggestions if the user clicks outside the input and suggestions container
    if (event.target !== searchInput && event.target !== suggestionsContainer) {
        suggestionsContainer.style.display = 'none'; // Hide the suggestions container
    }
});

