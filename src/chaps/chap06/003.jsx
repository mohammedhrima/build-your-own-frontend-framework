const ELEMENT = "element";
const TEXT = "text";

const CREATE = "create";
const REPLACE = "replace";
const REMOVE = "remove";

function check(children) {
	let result = [];
	children.forEach(child => {
		if (["string", "number"].includes(typeof child)) {
			result.push({
				type: TEXT,
				value: child
			})
		}
		else if (Array.isArray(child)) result.push(...check(child));
		else result.push(child);
	})
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
		children: check(children)
	}
}

function setProps(vdom) {
	const props = vdom.props || {};
	const style = {};

	Object.keys(props || {}).forEach((key) => {
		if (key.startsWith("on")) {
			const eventType = key.slice(2).toLowerCase();
			vdom.dom.addEventListener(eventType, props[key]);
		}
		else if (key === "style") Object.assign(style, props[key]);
		else vdom.dom.setAttribute(key, props[key]);
	});
	if (Object.keys(style).length > 0) {
		vdom.dom.style.cssText = Object.keys(style).map((styleProp) => {
			const Camelkey = styleProp.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
			return `${Camelkey}:${style[styleProp]}`;
		}).join(";");
	}
}

function createDOM(vdom) {
	switch (vdom.type) {
		case ELEMENT: {
			vdom.dom = document.createElement(vdom.tag);
			setProps(vdom);
			vdom.children.forEach(child => {
				createDOM(child);
				vdom.dom.appendChild(child.dom)
			})
			break;
		}
		case TEXT: {
			vdom.dom = document.createTextNode(vdom.value);
			break;
		}
		default:
			throw "Unkonwn type"
	}
}

function execute(mode, prev, next = null) { }

function display(vdom) {
	createDOM(vdom);
	return vdom
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
	}
	return [getter, setter];
}

const [count, setCount] = State(1);

const HandleClique = () => setCount(count() + 1)

function Component() {
	return (
		<div className="container" >
			<h1>Hello World [{count()}]</h1>
			<button onclick={HandleClique}
				style={{
					backgroundColor: "#e2e8f0", cursor: "pointer",
					padding: "10px 15px", fontSize: "25px", margin: "10px 50px"
				}}
			>click me</button>
		</div>
	)
}

function updateView() {
	let comp = display(<Component />)
	console.log(comp)
	const root = document.getElementById("root");
	root.innerHTML = ""
	root.appendChild(comp.dom);
}

updateView();