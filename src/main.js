import { obj } from "./data.js";

const lang = document.getElementsByClassName("language-jsx")[0];

const JsxFiles = [];
const JsFiles = [];

Object.keys(obj).forEach(e => {
	obj[e].forEach(n => {
		JsxFiles.push({ file: `./src/chaps/${e}/${n.file}x`, scroll: n.scroll, highlight: n.highlight, isCode: n.isCode });
		JsFiles.push(`./out/chaps/${e}/${n.file}`);
	});
});

function open_file(index) {
	const slide = document.getElementById("slide");
	slide.innerHTML = "";
	slide.classList.remove("show");

	const filename = JsxFiles[index].file;
	const scroll = JsxFiles[index].scroll;
	const highlight = JsxFiles[index].highlight;


	const isCode = JsxFiles[index].isCode;

	const jsFile = JsFiles[index];

	// Remove old script
	const oldScript = document.getElementById("code");
	if (oldScript) {
		oldScript.remove();
	}

	console.clear();

	console.info("view file:", jsFile);
	const root = document.getElementById("root");
	root.innerHTML = "";
	const script = document.createElement("script");
	script.id = "code";
	script.src = jsFile + "?v=" + Date.now();
	script.type = "module";
	// script.onload = () => console.log("Script loaded:", jsFile);
	script.onerror = () => console.error("Failed to load script:", jsFile);
	document.body.appendChild(script);


	if (!isCode) slide.classList.add("show");

	// Fetch and highlight JSX source
	fetch(filename)
		.then(res => {
			if (!res.ok) throw new Error("Network response was not ok");
			return res.text();
		})
		.then(data => {
			lang.textContent = data;
			Prism.highlightAll();
			const ide = document.getElementById("ide");
			ide?.scrollTo({ top: scroll, behavior: 'smooth' });

			document.querySelectorAll("code.language-jsx").forEach((code) => {
				const newNodes = [];

				code.childNodes.forEach((node) => {
					if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "") {
						const span = document.createElement("span");
						span.className = "token";
						span.textContent = node.textContent;
						newNodes.push(span);
					} else {
						newNodes.push(node);
					}
				});
				// Replace content with normalized nodes
				code.replaceChildren(...newNodes);
			});
			// Step 2: Now safely highlight tokens by index
			const tokens = Array.from(document.getElementsByClassName("token"));
			highlight.forEach(([start, end]) => {
				for (let i = start; i <= end && i < tokens.length; i++) {
					tokens[i].classList.add("highlighted");
				}
			});

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

document.addEventListener("keydown", (event) => {
	const index = parseInt(location.hash.slice(1), 10) || 0;

	if (event.key === "ArrowLeft" && index > 0) {
		location.hash = `${index - 1}`;
	} else if (event.key === "ArrowRight" && index < JsxFiles.length - 1) {
		location.hash = `${index + 1}`;
	}
});

// Listen to hash change
window.addEventListener("hashchange", load_from_hash);

// Initial load
load_from_hash();

// const line = document.createElement('div');
// line.style.position = 'fixed';
// line.style.top = '50%';
// line.style.left = '0';
// line.style.width = '100%';
// line.style.height = '2px';
// line.style.backgroundColor = 'red';
// line.style.zIndex = '9999';
// document.body.appendChild(line);