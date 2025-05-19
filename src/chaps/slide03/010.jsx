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

function setProps(vdom) {
	const props = vdom.props || {};
	Object.keys(props).forEach((key) => {
		vdom.dom.setAttribute(key, props[key]);
	});
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
	let comp = display(<div class="container"></div>);
	console.log(comp);

	const root = document.getElementById("root");
	root.appendChild(comp.dom);
} catch (error) {
	console.error(error);
}
