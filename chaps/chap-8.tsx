const ELEMENT = "element";
const TEXT = "text";

const CREATE = "create";
const REPLACE = "replace";
const REMOVE = "remove";


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

function createDOM(vdom) {
	console.log("createDOM", vdom);

	switch (vdom.type) {
		case ELEMENT: {
			if (vdom.tag === "root") {
				vdom.dom = document.getElementById("root");
			}
			else {
				vdom.dom = document.createElement(vdom.tag);
			}
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


function destroy(vdom: VDOM): void {
    removeProps(vdom);
    vdom.dom?.remove();
    vdom.dom = null;
    vdom.children?.map(destroy);
 }
 
function execute(mode: number, prev: VDOM, next: VDOM = null) {
    switch (mode) {
       case CREATE: {
          createDOM(prev);
          prev.children?.map((child) => {
             if (child) {
                child = execute(mode, child as VDOM);
                prev.dom.appendChild((child as VDOM).dom);
             }
          });
          break;
       }
       case REPLACE: {
          removeProps(prev);
          execute(CREATE, next);
 
          if (prev.dom && next.dom) prev.dom.replaceWith(next.dom);
 
          prev.dom = next.dom;
          prev.children = next.children;
          // I commented it because it caused me an error
          // in the slider
          // removeProps(prev);
          prev.props = next.props;
          break;
       }
       case REMOVE: {
          destroy(prev);
          break;
       }
       default:
          break;
    }
    return prev;
 }

function deepEqual(a, b) {
	if (a !== a && b !== b) return true; // NaN is the only value that is not equal to itself
	if (a === b) return true; // Handle primitive type comparison
	if (a == null || b == null) return false;
	if (typeof a !== typeof b) return false;
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (!deepEqual(a[i], b[i])) return false;
		}
		return true;
	}
	if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
	if (a instanceof RegExp && b instanceof RegExp) return a.toString() === b.toString();
	if (typeof a === "function" && typeof b === "function") return a.toString() === b.toString();
	if (typeof a === "object" && typeof b === "object") {
		const keysA = Object.keys(a);
		const keysB = Object.keys(b);
		if (keysA.length !== keysB.length) return false;
		for (let key of keysA) {
			if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
		}
		return true;
	}
	return false;
}


function reconciliate(prev, next) {
	if (prev.type != next.type || prev.tag != next.tag || (prev.type == TEXT && prev.props.value != next.props.value))
		return execute(REPLACE, prev, next);

	const prevs = prev.children || [];
	const nexts = next.children || [];
	for (let i = 0; i < Math.max(prevs.length, nexts.length); i++) {
		let child1 = prevs[i];
		let child2 = nexts[i];

		if (child1 && child2 && (child1.isfunc || child2.isfunc)) {
			if (!deepEqual(child1.func, child2.func)) {
				execute(REPLACE, child1, child2);
				prevs[i] = child2;
			}
			else if (!deepEqual(child1.funcProps, child2.funcProps)) {
				execute(REPLACE, child1, child2);
				prevs[i] = child2;
			}
		}
		else if (child1 && child2) {
			reconciliate(child1, child2);
		}
		else if (!child1 && child2) {
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

let globalVDOM = null;
function display(vdom) {
	if (!globalVDOM) {
		execute(CREATE, vdom);
		globalVDOM = vdom;
	}
	else reconciliate(globalVDOM, vdom);
	return vdom;
}

function init() {
	let vdom = null;
	let view = null;
	let states = {};
	let index = 1;

	const State = (initValue) => {
		const stateIndex = index++;
		states[stateIndex] = initValue;

		const getter = () => states[stateIndex];
		const setter = (newValue: any) => {
			states[stateIndex] = newValue;
			updateState();
		}
		return [getter, setter];
	}

	const updateState = () => {
		const newVDOM = view();
		if (vdom !== null) reconciliate(vdom, newVDOM);
		else vdom = newVDOM;
	};

	const render = (callback) => {
		view = callback;
		vdom = view();
		return vdom;
	}

	return { State, render };
}


function Component() {
	const { render, State } = init();
	const [count, setCount] = State(1);
	//@ts-ignore
	const HandleClique = () => setCount(count() + 1);
	return render(() =>
		<root>
			<div className="container" onclick={HandleClique}>
				{/*@ts-ignore */}
				<button>Counter {count()}</button>
			</div>
		</root>)
}

function updateView() {
	display(<Component />);
}

updateView();