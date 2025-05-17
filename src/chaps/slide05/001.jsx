const ELEMENT = "element";

function element(tag, props = {}, ...children) {
	return {
		type: ELEMENT,
		tag: tag,
		props: props,
		children: children
	}
}

let comp = <div></div>

console.log(comp)

const root = document.getElementById("root");