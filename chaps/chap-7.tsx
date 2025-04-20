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

function reconciliate(prev, next) {
    if (prev.type != next.type || prev.tag != next.tag || (prev.type == TEXT && prev.props.value != next.props.value))
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

let globalVDOM = null;
const root = document.getElementById("root");
function display(vdom) {
	if (!globalVDOM) {
		execute(CREATE, vdom);
		root.innerHTML = ""
		root.appendChild(vdom.dom);
		globalVDOM = vdom;
	}
	else reconciliate(globalVDOM, vdom);
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

//@ts-ignore
const HandleClique = () => setCount(count() + 1);

function Component() {
	//@ts-ignore
	return <div className="container" onclick={HandleClique} ><button>Counter {count()}</button></div>
}

function updateView() {
	display(<Component />);
}

updateView();