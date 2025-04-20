const ELEMENT = "element";
const TEXT = "text";

const CREATE = "create";
const REPLACE = "replace";
const REMOVE = "remove";

function check(children) {
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
	if (vdom.type == TEXT) return;
	const { props } = vdom;
	const style = {};
	Object.keys(props || {}).forEach((key) => {
		if (key.startsWith("on")) {
			const eventType = key.slice(2).toLowerCase();
			vdom.dom.addEventListener(eventType, props[key]);
		} else if (key === "style") Object.assign(style, props[key]);
		else {
			vdom.dom.setAttribute(key, props[key]);
		}
	});
	if (Object.keys(style).length > 0) {
		vdom.dom.style.cssText = Object.keys(style).map((styleProp) => {
			const Camelkey = styleProp.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
			return `${Camelkey}:${style[styleProp]}`;
		}).join(";");
	}
}

function createDOM(vdom) {
	console.log("createDOM", vdom);
	switch (vdom.type) {
		case ELEMENT: {
			vdom.dom = document.createElement(vdom.tag);
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
			vdom.children?.forEach(child => {
				execute(mode, child);
				vdom.dom.appendChild(child.dom);
			});
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
function State(initValue) {
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

const HandleClique = () => {
	//@ts-ignore
	setCount(count() + 1)
}

function Component() {
	return (
		<div className="container" >
			{/*@ts-ignore */}
			<h1>Hello World [{count()}]</h1>
			<button
            onclick={HandleClique}
            style={{
                backgroundColor: "#e2e8f0", cursor: "pointer",
                padding: "10px 15px", fontSize: "25px", margin: "10px 50px"
            }}
        >clique me</button>
		</div>
	)
}
const root = document.getElementById("root");
function updateView() {
	root.innerHTML = ""
	const res = display(<Component />);
	root.appendChild(res.dom);
}

updateView();