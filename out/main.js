const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;
console.log = function (...args) {
    originalLog.apply(console, args);
    appendToConsole("log", args);
};
console.error = function (...args) {
    originalError.apply(console, args);
    appendToConsole("error", args);
};
console.warn = function (...args) {
    originalWarn.apply(console, args);
    appendToConsole("warn", args);
};
console.info = function (...args) {
    originalInfo.apply(console, args);
    appendToConsole("info", args);
};
const originalClear = console.clear;
console.clear = function () {
    originalClear.apply(console);
    consoleView.innerHTML = "";
};
import { obj } from "./data.js";
const lang = document.getElementsByClassName("language-jsx")[0];
const slide = document.getElementById("slide");
const body = document.body;
const resizer = document.getElementById("resizer");
const root = document.getElementById("root");
const consolePane = document.getElementById("console");
const code = document.getElementById("code");
const consoleView = document.getElementById("console");
const JsxFiles = [];
const JsFiles = [];
Object.keys(obj).forEach(key => {
    obj[key].forEach(elem => {
        JsxFiles.push({ ...elem, filename: `./src/chaps/${key}/${elem.filename}x` });
        JsFiles.push(`./out/chaps/${key}/${elem.filename}`);
    });
});
function open_file(index) {
    slide.innerHTML = "";
    root.innerHTML = "";
    slide.classList.remove("show");
    const { filename, scroll, highlight, isCode } = JsxFiles[index];
    const jsFile = JsFiles[index];
    code?.remove();
    console.clear();
    console.log();
    console.info("view file:", jsFile);
    const script = document.createElement("script");
    script.id = "code";
    script.src = jsFile + "?v=" + Date.now();
    script.type = "module";
    script.onerror = () => console.error("Failed to load script:", jsFile);
    body.appendChild(script);
    if (!isCode)
        slide.classList.add("show");
    fetch(filename)
        .then(res => {
        if (!res.ok)
            throw new Error("Network response was not ok");
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
                }
                else {
                    newNodes.push(node);
                }
            });
            code.replaceChildren(...newNodes);
        });
        const tokens = Array.from(document.getElementsByClassName("token"));
        highlight.forEach(([start, end]) => {
            for (let i = start; i <= start + end && i < tokens.length; i++) {
                tokens[i].classList.add("highlighted");
            }
        });
    })
        .catch(err => {
        console.error("Fetch error:", err);
    });
}
function load_from_hash() {
    const index = parseInt(location.hash.slice(1), 10);
    if (!isNaN(index))
        open_file(index);
    else
        location.hash = "0";
}
document.getElementById("prev").onclick = () => {
    let index = parseInt(location.hash.slice(1), 10) || 0;
    if (index > 0)
        location.hash = `${index - 1}`;
};
document.getElementById("next").onclick = () => {
    let index = parseInt(location.hash.slice(1), 10) || 0;
    if (index < JsxFiles.length - 1)
        location.hash = `${index + 1}`;
};
document.addEventListener("keydown", (event) => {
    const index = parseInt(location.hash.slice(1), 10) || 0;
    if (event.key === "ArrowLeft" && index > 0)
        location.hash = `${index - 1}`;
    else if (event.key === "ArrowRight" && index < JsxFiles.length - 1)
        location.hash = `${index + 1}`;
});
window.addEventListener("hashchange", load_from_hash);
load_from_hash();
function draw_red_line() {
    const line = document.createElement('div');
    line.style.position = 'fixed';
    line.style.top = '50%';
    line.style.left = '0';
    line.style.width = '100%';
    line.style.height = '2px';
    line.style.backgroundColor = 'red';
    line.style.zIndex = '9999';
    body.appendChild(line);
}
// draw_red_line();
function appendToConsole(type, args) {
    const line = document.createElement("div");
    line.classList.add("console-line", type);
    const message = args
        .map((arg) => {
        if (typeof arg === "function") {
            return arg.toString(); // or use String(arg)
        }
        else if (typeof arg === "object") {
            try {
                return JSON.stringify(arg, null, 2);
            }
            catch {
                return "[Circular]";
            }
        }
        return String(arg);
    })
        .join(" ");
    line.textContent = message;
    consoleView.appendChild(line);
}
let isResizing = false;
resizer.addEventListener("mousedown", function (e) {
    isResizing = true;
    document.body.style.cursor = "row-resize";
});
document.getElementById("show-hide-terminal").onclick = (e) => {
    e.preventDefault();
    const consolePane = document.getElementById("console");
    const root = document.getElementById("root");
    const resizer = document.getElementById("resizer");
    const isHidden = consolePane.style.display === "none";
    if (isHidden) {
        consolePane.style.display = "block";
        resizer.style.display = "block";
        root.style.height = "70%"; // adjust as needed
        consolePane.style.height = "30%"; // adjust as needed
    }
    else {
        consolePane.style.display = "none";
        resizer.style.display = "none";
        root.style.height = "100%";
    }
};
document.addEventListener("mousemove", function (e) {
    if (!isResizing)
        return;
    const containerTop = document.getElementById("container").getBoundingClientRect().top;
    const offset = e.clientY - containerTop;
    const minHeight = 50;
    const maxHeight = window.innerHeight - 50;
    const rootHeight = Math.max(minHeight, Math.min(offset, maxHeight));
    const consoleHeight = window.innerHeight - rootHeight - resizer.offsetHeight;
    root.style.flex = "none";
    root.style.height = `${rootHeight}px`;
    consolePane.style.flex = "none";
    consolePane.style.height = `${consoleHeight}px`;
});
document.addEventListener("mouseup", function () {
    isResizing = false;
    document.body.style.cursor = "";
});
