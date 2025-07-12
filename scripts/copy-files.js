const fs = require('fs');
const path = require('path');

// Function to copy files recursively
function copyFileSync(source, target) {
  let targetFile = target;

  // If target is a directory, a new file with the same name will be created
  if (fs.existsSync(target) && fs.lstatSync(target).isDirectory()) {
    targetFile = path.join(target, path.basename(source));
  }

  fs.writeFileSync(targetFile, fs.readFileSync(source));
}

// Function to copy directory recursively
function copyFolderRecursiveSync(source, target) {
  let files = [];

  // Check if folder needs to be created or integrated
  const targetFolder = path.join(target, path.basename(source));
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder);
  }

  // Copy
  if (fs.lstatSync(source).isDirectory()) {
    files = fs.readdirSync(source);
    files.forEach(function (file) {
      const curSource = path.join(source, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, targetFolder);
      } else {
        copyFileSync(curSource, targetFolder);
      }
    });
  }
}

// Create dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Files to copy
const filesToCopy = [
  'package.json',
  '.env.example',
  'README.md'
];

// Directories to copy
const dirsToCopy = [
  'uploads',
  'public'
];

console.log('Copying files to dist folder...');

// Copy individual files
filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      copyFileSync(file, 'dist');
      console.log(`✓ Copied ${file}`);
    } catch (error) {
      console.log(`⚠ Could not copy ${file}: ${error.message}`);
    }
  } else {
    console.log(`⚠ File ${file} not found, skipping...`);
  }
});

// Copy directories
dirsToCopy.forEach(dir => {
  if (fs.existsSync(dir)) {
    try {
      copyFolderRecursiveSync(dir, 'dist');
      console.log(`✓ Copied directory ${dir}`);
    } catch (error) {
      console.log(`⚠ Could not copy directory ${dir}: ${error.message}`);
    }
  } else {
    console.log(`⚠ Directory ${dir} not found, skipping...`);
  }
});

console.log('File copying completed!'); 