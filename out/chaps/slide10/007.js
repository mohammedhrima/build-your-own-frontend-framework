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
            });
        }
        else if (Array.isArray(child))
            result.push(...check(child));
        else
            result.push(child);
    });
    return result;
}
function element(tag, props = {}, ...children) {
    if (typeof tag === "function") {
        try {
            return tag(props, children);
        }
        catch (error) {
            console.error("failed to execute functag", tag);
        }
        return [];
    }
    return {
        type: ELEMENT,
        tag: tag,
        props: props,
        children: check(children)
    };
}
function removeProps(vdom) {
    try {
        const props = vdom.props;
        for (const key of Object.keys(props || {})) {
            if (key == "func")
                continue;
            if (vdom.dom) {
                if (key.startsWith("on")) {
                    const eventType = key.slice(2).toLowerCase();
                    vdom.dom?.removeEventListener(eventType, props[key]);
                }
                else if (key === "style") {
                    Object.keys(props.style || {}).forEach((styleProp) => {
                        vdom.dom.style[styleProp] = "";
                    });
                }
                else if (vdom.dom) {
                    vdom.dom?.removeAttribute(key);
                }
            }
            else
                delete props[key];
        }
        vdom.props = {};
    }
    catch (error) {
    }
}
function setProps(vdom) {
    const props = vdom.props || {};
    Object.keys(props).forEach((key) => {
        if (key.startsWith("on")) {
            const eventType = key.slice(2).toLowerCase();
            vdom.dom.addEventListener(eventType, props[key]);
        }
        else
            vdom.dom.setAttribute(key, props[key]);
    });
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
            vdom.dom = document.createElement(vdom.tag);
            setProps(vdom);
            vdom.children.forEach(child => {
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
            console.log(vdom);
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
function reconciliate(prev, next) { }
let globalVODM = null;
function display(vdom) {
    if (!globalVODM) {
        execute(CREATE, vdom);
        globalVODM = vdom;
    }
    else
        reconciliate(globalVODM, vdom);
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
    return (element("div", { class: "container" },
        element("h1", null,
            "Hello World [",
            count(),
            "]"),
        element("button", { onclick: HandleClick }, "click me")));
}
function updateView() {
    let comp = display(element(Component, null));
    console.log(comp);
    const root = document.getElementById("root");
    root.innerHTML = "";
    root.appendChild(comp.dom);
}
updateView();
