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
			break;
		}
		default: {
			console.error(vdom);
			throw "Unkonwn type";
		}
	}
}

function display(vdom) {}

try {
	let comp = <div></div>;
	console.log(comp);
} catch (error) {
	console.error(error);
}
