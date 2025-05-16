import { arr, obj } from "./data.js";

const lang = document.getElementsByClassName("language-jsx")[0];

let i = 0;
const JsxFiles = [];
const JsFiles = [];

arr.forEach(e => {
	console.log(e);
	obj[e].forEach(n => {
		JsxFiles.push(`./src/chaps/${e}/${n}x`);
		JsFiles.push(`./out/chaps/${e}/${n}`);
	})
})

console.log(JsxFiles);

function open_file() {
	window.location.hash = i;

	const filename = JsxFiles[i];
	const jsFile = JsFiles[i];

	console.log("open file", filename);
	console.log("JS File:", jsFile);

	// Remove old script if it exists
	const oldScript = document.getElementById("code");
	if (oldScript) {
		oldScript.remove();
	}

	// Create new script element
	const script = document.createElement("script");
	script.id = "code";
	script.src = jsFile;
	script.type = "module"; // Optional: use "module" if you’re importing/exporting
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

open_file();

document.getElementById("prev").onclick = () => {
	if (i > 0) {
		i--;
		open_file();
	}
};

document.getElementById("next").onclick = () => {
	if (i < JsxFiles.length - 1) {
		i++;
		open_file();
	}
};
