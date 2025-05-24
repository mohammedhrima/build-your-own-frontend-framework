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

function createDOM(vdom) {}

function display(vdom) {
	createDOM(vdom); // call create dom
	return vdom;
}

try {
	let comp = <div></div>;
	console.log(comp);
} catch (error) {
	console.error(error);
}
