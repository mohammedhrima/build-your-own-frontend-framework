import { arr, obj } from "./data.js";

const lang = document.getElementsByClassName("language-jsx")[0];

let i = 0;
const current = [];

arr.forEach(e => {
  console.log(e);
  obj[e].forEach(n => {
    current.push(`./out/chaps/${e}/${n}`);
  })
})

console.log(current);

function open_file(filename) {
  console.log("open file", filename);

  fetch(filename)
    .then(res => {
      if (!res.ok) throw new Error("Network response was not ok");
      return res.text();
    })
    .then(data => {
      console.log("File contents:", data);
      lang.innerHTML = data;
      Prism.highlightAll();
    })
    .catch(err => {
      console.error("Fetch error:", err);
    });
}

open_file(current[0]);
document.getElementById("prev").onclick = () => {
  if (i > 0) {
    i--;
    open_file(current[i]);
  }
};

document.getElementById("next").onclick = () => {
  if (i < current.length - 1) {
    i++;
    open_file(current[i]);
  }
};
