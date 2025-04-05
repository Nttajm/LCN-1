var suggestions = [
  "time",
  "calc",
  "help",
  "bk",
  "rec",
  "rec ()",
  "timex",
  "lcn",
  "reset",
  "rand",
  "timer",
  "timeu",
  "timeus",
  "flip coin",
  "config log ",
  "show log",
  "log",
  "run js/ ",
  "system-ready",
  "stwatch",
  "npm i",
  "npm ",
  "npm s",
  "spam",
  "system-info",
  "system-ready",
  'system-valid',
  'stwatch stop',
  "change-theme",
  "text-color",
  "user.name",
  "db / ",
  "db / i",
  "db / s",
  "db / a",
  'e /',
  'dis log',
  'r',
  'devColors',
  'theme',
  'th calm',
  'th night',
  'bitly',
  't--devlOAD',
  't--et',
];

    // Function to create autocomplete suggestions
    function autocomplete(inp, arr) {
        var currentFocus;

        // Function to execute when someone writes in the input field
        inp.addEventListener("input", function(e) {
          var val = this.value;
          closeAllLists();
          if (val.length < 2) {
              return false;
          }
          currentFocus = -1;

            // Create a DIV element that will contain the items (suggestions)
            var a = document.createElement("div");
            a.setAttribute("id", this.id + "autocomplete-list");
            a.setAttribute("class", "autocomplete-items");
            this.parentNode.appendChild(a);

            // For each item in the array...
            for (var i = 0; i < arr.length; i++) {
                // Check if the item starts with the same letters as the text field value
                if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
                    // Create a DIV element for each matching element
                    var b = document.createElement("div");
                    // Bold the matching letters
                    b.innerHTML = "<strong class='char-u'>" + arr[i].substr(0, val.length) + "</strong>";
                    b.innerHTML += arr[i].substr(val.length);
                    // Insert a hidden input field with the current array item's value
                    b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
                    // Execute a function when someone clicks on the item value (DIV element)
                    b.addEventListener("click", function(e) {
                        // Insert the value for the autocomplete text field
                        inp.value = this.getElementsByTagName("input")[0].value;
                        closeAllLists();
                    });
                    a.appendChild(b);
                }
            }
        });

        // Function to handle keyboard navigation
        inp.addEventListener("keydown", function(e) {
          var x = document.getElementById(this.id + "autocomplete-list");
          if (x) x = x.getElementsByTagName("div");
          if (e.keyCode == 40) {
            e.preventDefault();
              // If the arrow DOWN key is pressed, increase the currentFocus variable
              currentFocus++;
              // Highlight the active item
              addActive(x);
          } else if (e.keyCode == 38) {
            e.preventDefault();
              // If the arrow UP key is pressed, decrease the currentFocus variable
              currentFocus--;
              // Highlight the active item
              addActive(x);
          } else if (e.keyCode == 13) {
            e.preventDefault();
            closeAllLists();
            if (currentFocus > -1) {
                // Simulate a click on the active item
                if (x) x[currentFocus].click();
                // Close the suggestion list
                closeAllLists();
            }
          } else if (e.keyCode == 9) {
              // If the TAB key is pressed, select the first suggestion
              e.preventDefault();
              if (x && x.length > 0) {
                  inp.value = x[0].getElementsByTagName("input")[0].value;
                  closeAllLists();
              }
          }
      });

        // Function to add the "active" class to an item
        function addActive(x) {
            if (!x) return false;
            // Remove the "active" class from all autocomplete items
            removeActive(x);
            if (currentFocus >= x.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = (x.length - 1);
            // Add class "autocomplete-active" to the current item
            x[currentFocus].classList.add("autocomplete-active");
        }

        // Function to remove the "active" class from all autocomplete items
        function removeActive(x) {
            for (var i = 0; i < x.length; i++) {
                x[i].classList.remove("autocomplete-active");
            }
        }

        // Function to close all autocomplete lists
        function closeAllLists(elmnt) {
            var x = document.getElementsByClassName("autocomplete-items");
            for (var i = 0; i < x.length; i++) {
                if (elmnt != x[i] && elmnt != inp) {
                    x[i].parentNode.removeChild(x[i]);
                }
            }
        }

        // Function to execute when someone clicks in the document
        document.addEventListener("click", function(e) {
            closeAllLists(e.target);
        });
    }

    autocomplete(document.querySelector(".input"), suggestions);                                                              