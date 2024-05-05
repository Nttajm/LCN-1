const wordToGuess = "hello";
let guessesLeft = 6;

function checkGuess() {
  const guessInput = document.getElementById("guess-input").value.toLowerCase();
  if (guessInput.length !== 5 || !/^[a-z]+$/.test(guessInput)) {
    alert("Please enter a 5-letter word containing only lowercase letters.");
    return;
  }

  if (guessInput === wordToGuess) {
    displayResult("🎉 You guessed the word! 🎉", "green");
  } else {
    guessesLeft--;
    if (guessesLeft === 0) {
      displayResult("😔 You're out of guesses. The word was 'hello'.", "red");
    } else {
      const matches = getMatches(guessInput);
      displayResult(`Matches: ${matches}`, "yellow");
    }
  }
}

function getMatches(guess) {
  let count = 0;
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === wordToGuess[i]) {
      count++;
    }
  }
  return count;
}

function displayResult(message, color) {
  const resultElement = document.getElementById("result");
  resultElement.textContent = message;
  resultElement.style.color = color;
}
