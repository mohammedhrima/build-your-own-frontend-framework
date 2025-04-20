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

function destroy(vdom) {
    removeProps(vdom);
    vdom.dom?.remove();
    vdom.dom = null;
    vdom.children?.map(destroy);
}

function execute(mode, prev, next = null) {
    switch (mode) {
        case CREATE: {
            console.log("create", prev);
            createDOM(prev);
            prev.children?.map((child) => {
                if (child) {
                    child = execute(mode, child);
                    prev.dom.appendChild((child).dom);
                }
            });
            break;
        }
        case REPLACE: {
            console.log("replace", prev);
            removeProps(prev);
            execute(CREATE, next);

            if (prev.dom && next.dom) prev.dom.replaceWith(next.dom);

            prev.dom = next.dom;
            prev.children = next.children;
            prev.props = next.props;
            break;
        }
        case REMOVE: {
            console.log("remove", prev);
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
function display(vdom) {
    if (!globalVDOM) {
        execute(CREATE, vdom);
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
    return (
        <root>
            <div className="container-2" onclick={HandleClique} >
                {/*@ts-ignore */}
                <button>Counter {count()}</button>
            </div>
        </root>
    )
}

function updateView() {
    display(<Component />);
}

updateView();