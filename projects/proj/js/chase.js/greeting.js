function updateGreeting() {
    var greetingElement = document.getElementById('greeting');
    var currentTime = new Date().getHours();

    var greeting;

    if (currentTime >= 4 && currentTime < 12) {
      greeting = 'Good morning';
    } else if (currentTime >= 12 && currentTime < 21) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Welcome, have a nice night';
    }

    greetingElement.textContent = greeting;
  }

  function updateCurrentTime() {
    var currentTimeElement = document.getElementById('current-time');
    var currentDate = new Date();

    var options = { year: 'numeric', month: 'short', day: 'numeric' };
    var formattedDate = currentDate.toLocaleDateString('en-US', options);

    currentTimeElement.textContent = formattedDate;
  }

  // Update the greeting and current time immediately when the page loads
  updateGreeting();
  updateCurrentTime();

  // Update the greeting and current time every second (1000 milliseconds)
  setInterval(function () {
    updateGreeting();
    updateCurrentTime();
  }, 1000);