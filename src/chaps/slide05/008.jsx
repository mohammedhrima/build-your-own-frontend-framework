const ELEMENT = "element";

function element(tag, props = {}, ...children) {
	return {
		type: ELEMENT,
		tag: tag,
		props: props,
		children: children
	}
}

function setProps(vdom) {

}

function createDOM(vdom) {
	switch (vdom.type) {
		case ELEMENT: {
			vdom.dom = document.createElement(vdom.tag);
			setProps(vdom);
			break;
		}
		default: {
			console.log(vdom);
			throw "Unkonwn type"
		}
	}
}

function display(vdom) {
	createDOM(vdom);
	return vdom
}

let comp = display(<div></div>)

console.log(comp)

const root = document.getElementById("root");
root.appendChild(comp.dom);