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

function removeProps(vdom) {
	const props = vdom.props;
	for (const key of Object.keys(props || {})) {
		if (vdom.dom && key.startsWith("on")) {
			const eventType = key.slice(2).toLowerCase();
			vdom.dom?.removeEventListener(eventType, props[key]);
		} else if (vdom.dom) {
			vdom.dom?.removeAttribute(key);
		} else delete props[key];
	}
	vdom.props = {};
}

function destroyDOM(vdom) {
	removeProps(vdom);
	vdom.dom?.remove();
	vdom.dom = null;
	vdom.children?.map(destroyDOM);
}

function execute(mode, prev, next = null) {
	switch (mode) {
		case CREATE: {
			createDOM(prev);
			break;
		}
		case REMOVE: {
			destroyDOM(prev);
			break;
		}
		case REPLACE: {
			removeProps(prev);
			execute(CREATE, next);

			prev.dom.replaceWith(next.dom);
			prev.dom = next.dom;
			prev.children = next.children;
			prev.props = next.props;
			break;
		}
		default:
			break;
	}
}

function reconciliate(prev, next) {
	if (
		typeof prev != typeof next ||
		prev.type != next.type ||
		(prev.type == TEXT && prev.value != next.value)
	)
		return execute(REPLACE, prev, next);

	const prevs = prev.children || [];
	const nexts = next.children || [];
	for (let i = 0; i < Math.max(prevs.length, nexts.length); i++) {
		let child1 = prevs[i];
		let child2 = nexts[i];

		if (child1 && child2) {
			reconciliate(child1, child2);
		} // child removed from next view
		else if (child1 && !child2) {
			execute(REMOVE, child1);
			prevs[i] = null;
		}
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
		updateView();
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

function updateView() {
	let comp = display(<Component />);
	console.log(comp);

	const root = document.getElementById("root");
	root.innerHTML = "";
	root.appendChild(comp.dom);
}

try {
	updateView();
} catch (error) {
	console.error(error);
}
