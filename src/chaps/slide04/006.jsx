const ELEMENT = "element";
const TEXT = "text";

function check(children) {
	const result = [];
	children.forEach((child) => {
		// if child is string or a number, let's create TEXT VDOM
		if (["string", "number"].includes(typeof child)) {
			result.push({
				type: TEXT,
				value: child,
				dom: null,
			});
		}
	});
	return result;
}

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
			setProps(vdom);
			vdom.children.forEach((child) => {
				createDOM(child);
				vdom.dom.appendChild(child.dom);
			});
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
	let comp = display(
		<div class="container">
			<h1></h1>
		</div>
	);
	console.log(comp);

	const root = document.getElementById("root");
	root.appendChild(comp.dom);
} catch (error) {
	console.error(error);
}
