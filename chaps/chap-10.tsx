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
        else if (Array.isArray(child)) {
            result.push(...check(child));
        }
        else if (child != undefined && child) result.push(child);
    });
    return result;
}

function fragment(props = {}, ...children) {
    return children;
}

function element(tag, props = {}, ...children) {
    if (typeof tag === "function") {
        let funcTag;
        try {
            funcTag = tag(props, children);
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
    if (prev.type != next.type || prev.tag != next.tag || !deepEqual(prev.props, next.props))
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
    let index = 1;
    let vdom = null;
    let states = {};

    let View = () => <empty></empty>;

    const State = (initValue) => {
        const stateIndex = index++;
        states[stateIndex] = initValue;

        const getter = () => states[stateIndex];
        const setter = (newValue) => {
            if (!deepEqual(states[stateIndex], newValue)) {
                states[stateIndex] = newValue;
                updateState();
            }
        };
        return [getter, setter];
    };


    const updateState = () => {
        const newVDOM = View();
        if (vdom !== null) reconciliate(vdom, newVDOM);
        else vdom = newVDOM;
    };

    const render = (call) => {
        View = call;
        updateState();
        return vdom;
    };
    return { render, State };
}


function Component() {
    const { render, State } = init();
    const [count, setCount] = State(1);
    //@ts-ignore
    const HandleClique = () => setCount(count() + 1);
    return render(() =>
        <div className="container-2" onclick={HandleClique}>
            {/*@ts-ignore */}
            <button>Counter {count()}</button>
        </div>)
}

function Home() {
    const { render, State } = init();
    return render(() =>
        <root>
            <>
                <Component />
                <Component />
            </>
            <>
                <Component />
                <Component />
            </>
        </root>
    )
}

function updateView() {
    display(<Home />);
}

updateView();