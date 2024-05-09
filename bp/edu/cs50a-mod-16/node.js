const fs = require('fs');
const path = require('path');

// Define the directory path
const directory = 'bp/edu/cs50a-mod-16/node.js';

// Read the contents of the directory
fs.readdir(directory, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  if (files.length === 0) {
    console.log('Directory is empty.');
    return;
  }

  // Iterate through the files and print out their full paths
  files.forEach(file => {
    const filePath = path.join(directory, file);
    console.log(filePath);
  });
});
