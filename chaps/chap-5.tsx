const ELEMENT = 1;
const TEXT = 2;

const CREATE = 3;


function check(children: any): any {
	let result = [];
	children.forEach((child) => {
		if (typeof child === "string" || typeof child === "number") {
			result.push({
				type: TEXT,
				props: {
					value: child,
				},
			});
		}
		else if (child != undefined && child) {
			result.push(child);
		}
	});
	return result;
}

function element(tag, props = {}, ...children) {
	if (typeof tag === "function") {
		let funcTag;
		try {
			funcTag = tag(props);
		} catch (error) {
			console.error("failed to execute functag", tag);
			return [];
		}
		funcTag.func = tag;
		funcTag.funcProps = props;
		funcTag.isfunc = true;
		return funcTag;
	}
	return {
		type: ELEMENT,
		tag: tag,
		props: props,
		children: check(children || [])
	}
}

function setProps(vdom) {
	const { props } = vdom;
	Object.keys(props || {}).forEach((key) => {
		if (key.startsWith("on")) {
			const eventType = key.slice(2).toLowerCase();
			vdom.dom.addEventListener(eventType, props[key]);
		}
		else vdom.dom[key] = props[key];
	});
}

function createDOM(vdom) {
	switch (vdom.type) {
		case ELEMENT: {
			vdom.dom = document.createElement(vdom.tag);
			vdom.children?.forEach(child => {
				createDOM(child);
				vdom.dom.appendChild(child.dom);
			});
			break;
		}
		case TEXT: {
			vdom.dom = document.createTextNode(vdom.props.value);
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

const root = document.getElementById("root");

const HandleClique = () => {
	alert("Cliqued me")
}

function Component() {
	return <div className="container" onclick={HandleClique} ><button>Hello World</button></div>
}

root.appendChild(display(<Component />).dom);
