








const ELEMENT = "element";

function element(tag, props = {}, ...children) {
	return {
		type: ELEMENT,
		tag: tag,
		props: props,
		children: children
	}
}

// this function will be used to create
// real DOM from virtual DOM
function createDOM(vdom) {

}

function display(vdom) {

}

let comp = <div></div>

console.log(comp)

const root = document.getElementById("root");