// Function to fetch random user data from the API
async function fetchRandomUserData() {
    try {
      const response = await fetch('https://randomuser.me/api/');
      const data = await response.json();
      return data.results[0].name;
    } catch (error) {
      console.error('Error fetching random user data:', error);
    }
  }

  // Function to generate and store a random name in a variable
  async function generateRandomName() {
    const userData = await fetchRandomUserData();
    return `${userData.first} ${userData.last}`;
  }

  // Call the function when the page is loaded or refreshed
  window.onload = async function() {
    const randomName = await generateRandomName();

    // Display the random name in each container
    const containers = document.querySelectorAll('.randomNameContainer');
    containers.forEach(container => {
      container.innerText = randomName;
    });
  };