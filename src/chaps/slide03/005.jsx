const ELEMENT = "element";

function element(tag, props = {}, ...children) {
	return {
		type: ELEMENT,
		tag: tag,
		props: props,
		children: children,
	};
}

function createDOM(vdom) {
	switch (vdom.type) {
		case ELEMENT: {
			vdom.dom = document.createElement(vdom.tag);
			break;
		}
		default: {
			console.error(vdom);
			throw "Unkonwn type";
		}
	}
}

function display(vdom) {
	createDOM(vdom);
	return vdom;
}

try {
	let comp = <div></div>;
	console.log(comp);
} catch (error) {
	console.error(error);
}
