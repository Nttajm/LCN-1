function generateRandomNumbers() {
    const firstRandomNumber = Math.floor(Math.random() * (53300 - 159 + 1)) + 159;
    const formattedFirstNumber = firstRandomNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const firstElements = document.querySelectorAll('.randomNumber');
    firstElements.forEach((element) => {
      element.innerText = formattedFirstNumber;
    });

    const secondRandomNumber = firstRandomNumber * 0.4;
    const formattedSecondNumber = secondRandomNumber.toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const secondElements = document.querySelectorAll('.secondGeneration');
    secondElements.forEach((element) => {
      element.innerText = formattedSecondNumber;
    });

    const thirdRandomNumber = firstRandomNumber * 0.57;
    const formattedThirdNumber = thirdRandomNumber.toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const thirdElements = document.querySelectorAll('.thirdGeneration');
    thirdElements.forEach((element) => {
      element.innerText = formattedThirdNumber;
    });

  }

  generateRandomNumbers();

    // Function to generate a random card number using Faker.js
    function generateRandomCardNumber() {
      const cardNumber = faker.finance.creditCardNumber();
      return cardNumber;
    }

    // Call the function when the page is loaded or refreshed
    window.onload = function() {
      const randomCardNumber = generateRandomCardNumber();
      document.getElementById("cardNumber").innerText = `Random Card Number: ${randomCardNumber}`;
    };