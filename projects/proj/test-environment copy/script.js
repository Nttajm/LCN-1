/*
document.getElementById('message-input').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        // sendMessage();
    }
});
*/

const words = [
  { 
    word: 'i',
    vector: 'pronoun'
  },
  {
    word: 'you',
    vector: 'pronoun'
  },
  {
    word: 'we',
    vector: 'pronoun'
  },
  {
    word: 'can',
    vector: 'verb'
  },
  { 
    word: 'not',
    vector: 'esll'
  },
  {
    word: 'do',
    vector: 'verb'
  },
  {
    word: 'are',
    vector: 'verb'
  },
  {
    word: 'work',
    vector: 'verb'
  },
  {
    word: 'drive',
    vector: 'verb'
  },
  {
    word: '.',
    vector: 'ender'
  },
  {
    word: ',',
    vector: 'ender'
  }
];



function generateText(text) {
  const vector = getVector(text, words);
  if (!vector) {
    return null;
  }
  const wordAfter = nextWord(vector, words);
  return text + ' ' + wordAfter;
}


function getVector(avilwords, library) {
  const words = avilwords.split(" ");
  
  let combinedVector = '';

  words.forEach(word => {
    const wordObj = library.find(token => token.word === word);
    if (wordObj) {
      combinedVector += wordObj.vector + " ";
    }
  });
  return combinedVector || null; // Return null if no vectors were found
}

console.log(getVector('i can do work', words))

function nextWord(vector, library) {
  
  const transVector = vector.split(" ");
  if (transVector)
  console.log(transVector)
  return null;
}

console.log(generateText('you'));

let interval = 4 


