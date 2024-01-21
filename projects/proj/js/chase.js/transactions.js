function generaterandomTran() {
    // Get all elements with the class "randomTran"
    const elements = document.getElementsByClassName('randomTran');

    // Generate and apply a different random number to each element
    for (const element of elements) {
      const randomTran = Math.floor(Math.random() * (900 - 159 + 1)) + 159;
      const formattedNumber = randomTran.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      element.innerText = ` ${formattedNumber}`;
    }
  }

  // Call the function when the page loads
  generaterandomTran();