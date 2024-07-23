// 1. Run through all files on doc
// 2. Check all image files (/static/img)
// 3. Compare image links found in static to the links found in every other file
// 4. Output any unsued image files
// 5. Auto open PR whcih removes unused images

//
const glob = require("glob"); // For matching files using patterns
const fs = require("fs-extra"); // For file system operations with promises
const path = require("path"); // For path manipulations

const DOCS_DIR = "/Users/jrock/dev/docs.getdbt.com/website";

// Function to get all files matching a pattern, excluding directories
const getFiles = (pattern, options = {}) => {
  const files = glob.sync(pattern, { nodir: true, ...options });
  console.log(`getFiles: pattern = ${pattern}, files found = ${files.length}`);
  return files;
};

// Function to get all image files in the static directory excluding fonts directory
const getImageFiles = () => {
  const imageFiles = getFiles(
    `${DOCS_DIR}/static/**/*.{png,jpg,jpeg,gif,svg}`,
    {
      ignore: `${DOCS_DIR}/static/fonts/**/*`, // Exclude the fonts directory
    }
  );
  console.log(`getImageFiles: image files found = ${imageFiles.length}`);
  return imageFiles;
};

// Function to get all files that might reference images
const getReferenceFiles = () => {
  // Define patterns to match various file types that might reference images
  const patterns = [
    `${DOCS_DIR}/docs/**/*.{md,mdx}`,
    `${DOCS_DIR}/blog/**/*.{md,mdx}`,
    `${DOCS_DIR}/snippets/**/*.{md,mdx}`, // Include snippets
    `${DOCS_DIR}/src/**/*.{js,jsx,ts,tsx,html,css}`, // Include CSS files
    `${DOCS_DIR}/**/*.yml`, // Include YAML files
    `${DOCS_DIR}/src/pages/**/*.{js,jsx,ts,tsx,html,css}`,
    `${DOCS_DIR}/src/components/**/*.{js,jsx,ts,tsx,html,css}`,
    `${DOCS_DIR}/docusaurus.config.js`, // Include the main configuration file
  ];

  // Flatten the array of patterns into an array of file paths
  const referenceFiles = patterns.flatMap((pattern) => getFiles(pattern));

  //console.log(`getReferenceFiles: reference files found = ${referenceFiles.length}`);
  return referenceFiles;
};

// Function to check if an image is used in any of the reference files
const isImageUsed = async (image, referenceFiles) => {
  // Get the relative path of the image from the DOCS_DIR, replacing backslashes with forward slashes for cross-platform compatibility
  const relativeImagePath = path.relative(DOCS_DIR, image).replace(/\\/g, "/");

  // Construct the image path as it would appear in the source files
  const imagePathInSrc = `/static/${relativeImagePath.replace(
    /^static\//,
    ""
  )}`;

  // Get the file name of the image (including extension)
  const imageName = path.basename(image);

  // Get the base name of the image file (without extension)
  const imageBaseName = path.basename(image, path.extname(image));

  // Define patterns to match different possible usages of the image in the reference files
  const patterns = [
    relativeImagePath, // Direct relative path to the image
    imagePathInSrc, // Image path as it would appear in the source files
    imageName, // Image file name
    imageBaseName, // Image base name (without extension)
    `url\\(['"]?${relativeImagePath}['"]?\\)`, // CSS url() syntax
    `src=['"]?${relativeImagePath}['"]?`, // HTML img src attribute
    `icon=['"]?${imageBaseName}['"]?`, // Possible icon attribute usage
  ];

  // Combine the patterns into a single regular expression
  const regex = new RegExp(patterns.join("|"), "g");

  // Iterate over each file in the referenceFiles array
  for (const file of referenceFiles) {
    // Read the content of the file asynchronously
    const content = await fs.readFile(file, "utf8");
    // Test if the regular expression matches any part of the file content
    if (regex.test(content)) {
      return true; // Return true if a match is found
    }
  }
  return false; // Return false if no matches are found in any of the files
};

// Main function to find and report unused images
const findUnusedImages = async () => {
  // Get all image files
  const imageFiles = getImageFiles();
  // Get all reference files
  const referenceFiles = getReferenceFiles();
  const unusedImages = []; // Array to hold unused images

  // Check each image to see if it is used in any reference file
  for (const image of imageFiles) {
    const used = await isImageUsed(image, referenceFiles);
    if (!used) {
      unusedImages.push(image); // Add to unused images if not used
    }
  }

  // Log the unused images and write them to a CSV file if any are found
  if (unusedImages.length > 0) {
    console.log("Unused Images:");
    unusedImages.forEach((image) => console.log(image));
  } else {
    console.log("No unused images found.");
  }
};

findUnusedImages();
