// Assuming data is an empty array
let data = [];

// Check if data is empty
if (data.length === 0) {
    // Array of names
    let names = ['Kareem', 'John', 'Alice', 'Emily']; // Add more names as needed

    // Create a container element to hold the rows
    let container = document.createElement('div');

    // Loop through the names array to create rows
    names.forEach((name, index) => {
        // Create row element
        let row = document.createElement('div');
        row.classList.add('row');

        // Create rank element
        let rank = document.createElement('div');
        rank.classList.add('rank', 'it', 't-i');
        rank.textContent = `${index + 1}.`;
        row.appendChild(rank);

        // Create name element
        let nameElement = document.createElement('div');
        nameElement.classList.add('name', 'it', 't-i');
        nameElement.textContent = name;
        row.appendChild(nameElement);

        // Create game element
        let game = document.createElement('div');
        game.classList.add('game', 'it', 't-i');
        game.textContent = '30/13'; // Assuming this is static for all names
        row.appendChild(game);

        // Create button section
        let buttonSection = document.createElement('div');
        buttonSection.classList.add('button-sec');

        // Create challenge buttons
        let challengeButton1 = createChallengeButton('sports_tennis', '-1');
        let challengeButton2 = createChallengeButton('sports_tennis', '');
        let challengeButton3 = createChallengeButton('sports_tennis', '+2');

        // Append buttons to button section
        buttonSection.appendChild(challengeButton1);
        buttonSection.appendChild(challengeButton2);
        buttonSection.appendChild(challengeButton3);

        // Append button section to row
        row.appendChild(buttonSection);

        // Append row to container
        container.appendChild(row);
    });

    // Append container to the document body or any other desired parent element
    document.body.appendChild(container);
}

// Function to create a challenge button
function createChallengeButton(iconClass, text) {
    let button = document.createElement('button');
    button.classList.add('c-h', 'p-1');
    button.id = 'challange';

    let span = document.createElement('span');
    span.classList.add('material-symbols-outlined', 'rh');
    span.textContent = iconClass;

    button.appendChild(span);
    button.appendChild(document.createTextNode(text));

    return button;
}
