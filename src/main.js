import { arr, obj } from "./data.js";

const lang = document.getElementsByClassName("language-jsx")[0];

const JsxFiles = [];
const JsFiles = [];

// Populate file lists
arr.forEach(e => {
  obj[e].forEach(n => {
    JsxFiles.push(`./src/chaps/${e}/${n}x`);
    JsFiles.push(`./out/chaps/${e}/${n}`);
  });
});

console.log("JSX Files:", JsxFiles);

// Load file at given index
function open_file(index) {
  const filename = JsxFiles[index];
  const jsFile = JsFiles[index];

  if (!filename || !jsFile) {
    console.warn("Invalid index:", index);
    return;
  }

  console.log("open file", filename);
  console.log("JS File:", jsFile);

  // Remove old script
  const oldScript = document.getElementById("code");
  if (oldScript) {
    oldScript.remove();
  }

  // Load new script
  const script = document.createElement("script");
  script.id = "code";
  script.src = jsFile;
  script.type = "module";
  script.onload = () => console.log("Script loaded:", jsFile);
  script.onerror = () => console.error("Failed to load script:", jsFile);
  document.body.appendChild(script);

  // Fetch and highlight JSX source
  fetch(filename)
    .then(res => {
      if (!res.ok) throw new Error("Network response was not ok");
      return res.text();
    })
    .then(data => {
      lang.textContent = data;
      Prism.highlightAll();
    })
    .catch(err => {
      console.error("Fetch error:", err);
    });
}

// Read index from location.hash and load file
function load_from_hash() {
  const index = parseInt(location.hash.slice(1), 10);
  if (!isNaN(index)) {
    open_file(index);
  } else {
    location.hash = "0";
  }
}

// Event handlers for navigation
document.getElementById("prev").onclick = () => {
  let index = parseInt(location.hash.slice(1), 10) || 0;
  if (index > 0) {
    location.hash = `${index - 1}`;
  }
};

document.getElementById("next").onclick = () => {
  let index = parseInt(location.hash.slice(1), 10) || 0;
  if (index < JsxFiles.length - 1) {
    location.hash = `${index + 1}`;
  }
};

// Listen to hash change
window.addEventListener("hashchange", load_from_hash);

// Initial load
load_from_hash();
