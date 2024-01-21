// Function to generate random date within a range
function getRandomDate() {
    const startDate = new Date('2023-12-12'); // 12th December 2023
    const endDate = new Date(); // Current date

    const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
    const randomDate = new Date(randomTime);

    // Format the date as mm/dd/yy
    const formattedDate = `${(randomDate.getMonth() + 1).toString().padStart(2, '0')}/${randomDate.getDate().toString().padStart(2, '0')}/${randomDate.getFullYear().toString().slice(-2)}`;

    return formattedDate;
  }

  // Generate 8 random dates and create div elements
  for (let i = 1; i <= 8; i++) {
    const randomDate = getRandomDate();

    // Create a new div element
    const divElement = document.createElement('div');
    
    // Set the div's id and content
    divElement.id = `date${i}`;
    divElement.textContent = randomDate;

    // Append the div to the body
    document.body.appendChild(divElement);
  }