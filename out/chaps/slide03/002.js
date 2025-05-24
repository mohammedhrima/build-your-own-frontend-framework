const ELEMENT = "element";
function element(tag, props = {}, ...children) {
    return {
        type: ELEMENT,
        tag: tag,
        dom: null,
        props: props,
        children: children,
    };
}
// create real DOM from virtual DOM
function createDOM(vdom) { }
// display the view
function display(vdom) { }
try {
    let comp = element("div", null);
    console.log(comp);
}
catch (error) {
    console.error(error);
}
