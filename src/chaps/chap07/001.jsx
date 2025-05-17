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

function removeProps(vdom) {
	try {
		const props = vdom.props;
		for (const key of Object.keys(props || {})) {
			if (key == "func") continue;
			if (vdom.dom) {
				if (key.startsWith("on")) {
					const eventType = key.slice(2).toLowerCase();
					vdom.dom?.removeEventListener(eventType, props[key]);
				} else if (key === "style") {
					Object.keys(props.style || {}).forEach((styleProp) => {
						vdom.dom.style[styleProp] = "";
					});
				} else if (vdom.dom) {
					vdom.dom?.removeAttribute(key);
				}
			} else delete props[key];
		}
		vdom.props = {};
	} catch (error) {
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

function destroyDOM(vdom) {
	removeProps(vdom);
	vdom.dom?.remove();
	vdom.dom = null;
	vdom.children?.map(destroyDOM);
}

function createDOM(vdom) {
	switch (vdom.type) {
		case ELEMENT: {
			if (vdom.tag === "root") {
                vdom.dom = document.getElementById("root");
            } else {
				vdom.dom = document.createElement(vdom.tag);
			}
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

			if (prev.dom && next.dom) prev.dom.replaceWith(next.dom);

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
	if (prev.type != next.type || prev.tag != next.tag ||
		(prev.type == TEXT && prev.value != next.value))
		return execute(REPLACE, prev, next);

	const prevs = prev.children || [];
	const nexts = next.children || [];
	for (let i = 0; i < Math.max(prevs.length, nexts.length); i++) {
		let child1 = prevs[i];
		let child2 = nexts[i];

		if (child1 && child2) {
			reconciliate(child1, child2);
		} else if (!child1 && child2) {
			if (i >= prevs.length) { // append
				execute(CREATE, child2);
				prevs.push(child2);
				prev.dom.appendChild(child2.dom);
			}
			else { // replace
				execute(CREATE, child2);
				prevs[i] = child2;
			}
		} else if (child1 && !child2) {
			execute(REMOVE, child1);
			prevs[i] = null;
		}
	}
}


let globalVODM = null;
function display(vdom) {
	if (!globalVODM) {
		execute(CREATE, vdom);
		globalVODM = vdom;
	}
	else reconciliate(globalVODM, vdom);
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