const ELEMENT = "element";
const TEXT = "text";

const CREATE = "create";
const REPLACE = "replace";
const REMOVE = "remove";

function check(children) {
	const result = [];
	children.forEach((child) => {
		if (["string", "number"].includes(typeof child)) {
			result.push({
				type: TEXT,
				value: child,
				dom: null,
			});
		} else if (Array.isArray(child)) {
			result.push(...check(child));
		} else {
			result.push(child);
		}
	});
	return result;
}

function element(tag, props = {}, ...children) {
	if (typeof tag === "function") {
		return tag(props, children);
	}
	return {
		type: ELEMENT,
		tag: tag,
		dom: null,
		props: props,
		children: check(children),
	};
}

function setProps(vdom) {
	const props = vdom.props || {};
	Object.keys(props).forEach((key) => {
		if (key.startsWith("on")) {
			const eventType = key.slice(2).toLowerCase();
			vdom.dom.addEventListener(eventType, props[key]);
		} else vdom.dom.setAttribute(key, props[key]);
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
		case TEXT: {
			vdom.dom = document.createTextNode(vdom.value);
			break;
		}
		default: {
			console.error(vdom);
			throw "Unkonwn type";
		}
	}
}

function execute(mode, prev, next = null) {
	switch (mode) {
		case CREATE: {
			createDOM(prev);
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

let states = {};
let index = 1;

const State = (initValue) => {
	const stateIndex = index++;
	states[stateIndex] = initValue;

	const getter = () => states[stateIndex];
	const setter = (newValue) => {
		states[stateIndex] = newValue;
		display(<Component />);
	};
	return [getter, setter];
};

const [count, setCount] = State(1);
const HandleClick = () => setCount(count() + 1);

function Component() {
	return (
		<div class="container">
			<h1>Hello World [{count()}]</h1>
			<button onclick={HandleClick}>click me</button>
		</div>
	);
}

try {
	let comp = display(<Component />);
	console.log(comp);

	const root = document.getElementById("root");
	root.innerHTML = "";
	root.appendChild(comp.dom);
} catch (error) {
	console.error(error);
}
