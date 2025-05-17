




const ELEMENT = "element";

function element(tag, props = {}, ...children) {
	return {
		type: ELEMENT,
		tag: tag,
		props: props,
		children: children
	}
}

function createDOM(vdom) {
	switch (vdom.type) {
		case ELEMENT: {
			break;
		}
		default: {
			console.log(vdom);
			throw "Unkonwn type"
		}
	}
}

function display(vdom) {

}

let comp = <div></div>

console.log(comp)

const root = document.getElementById("root");