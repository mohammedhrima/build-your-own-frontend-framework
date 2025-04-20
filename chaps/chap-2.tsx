
function element(tag, props, children) {
	return {
		type: "element",
		tag: tag,
		props: props,
		children: children
	}
}

function setProps(vdom) {
	const props = vdom.props || {};
	Object.keys(props).forEach(key => {
		vdom.dom.setAttribute(key, props[key]);
	})
}

function createDOM(vdom) {
	switch (vdom.type) {
		case "element": {
			vdom.dom = document.createElement(vdom.tag);
			break;
		}
		default:
			break;
	}
	setProps(vdom);
	return vdom;
}


function display(vdom) {
	createDOM(vdom);
	return vdom;
}

let tag = <div className="container"></div>



document.getElementById("root").appendChild(display(tag).dom);
