const ELEMENT = 1;
const TEXT = 2;

const CREATE = 3;


function check(children) {
	return (children || []).map(child => {
		return child;
	})
}

function element(tag, props, ...children) {
	return {
		type: ELEMENT,
		tag: tag,
		props: props,
		children: check(children)
	}
}

function setProps(vdom) {
	const props = vdom.props || {};
	Object.keys(props).forEach(key => {
		vdom.dom.setAttribute(key, props[key]);
	})
}

function createDOM(vdom) {
	console.log(vdom);

	switch (vdom.type) {
		case ELEMENT: {
			vdom.dom = document.createElement(vdom.tag);
			vdom.children?.forEach(child => {
				createDOM(child);
				console.log(child);

				vdom.dom.appendChild(child.dom);
			});
			break;
		}
		default:
			break;
	}
	setProps(vdom);
	return vdom;
}

function execute(mode, vdom) {
	switch (mode) {
		case CREATE: {
			createDOM(vdom);
			break;
		}
		default:
			break;
	}
}


function display(vdom) {
	execute(CREATE, vdom);
	return vdom;
}

let tag = <div className="container"><h1></h1></div>

document.getElementById("root").appendChild(display(tag).dom);
