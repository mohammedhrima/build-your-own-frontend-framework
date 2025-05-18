const ELEMENT = "element";

function element(tag, props = {}, ...children) {
	return {
		type: ELEMENT,
		tag: tag,
		dom: null,
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
	let comp = display(<div></div>);
	console.log(comp);

	// append the real dom to the #root
	// open browser devTools
	const root = document.getElementById("root");
	root.appendChild(comp.dom);
} catch (error) {
	console.error(error);
}
