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
  const mCount = (vector.match(/m/g) || []).length;
  const eCount = (vector.match(/e/g) || []).length;
  const cCount = (vector.match(/c/g) || []).length;
  const wCount = (vector.match(/w/g) || []).length;
  const wcCount = (vector.match(/w\/c/g) || []).length;
  const emCount = (vector.match(/w\/c/g) || []).length;

  const matchingWords = library.filter(token => {
    const tokenMCount = (token.vector.match(/m/g) || []).length;
    const tokenECount = (token.vector.match(/e/g) || []).length;
    const tokenCCount = (token.vector.match(/c/g) || []).length;
    const tokenWCount = (token.vector.match(/W/g) || []).length;
    const wcToken = (vector.match(/w\/c/g) || []).length;
    const emToken = (vector.match(/w\/c/g) || []).length;
    
    return tokenMCount === eCount || tokenECount === mCount || tokenCCount === wCount || tokenWCount === cCount || emToken === wcCount ||
    wcToken === emCount;
  });

  if (matchingWords.length > 0) {
    return matchingWords[Math.floor(Math.random() * matchingWords.length)].word;
  }

  return null;
}

console.log(generateText('you'));

let interval = 4 


