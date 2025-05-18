const ELEMENT = "element";
function element(tag, props = {}, ...children) {
    return {
        type: ELEMENT,
        tag: tag,
        props: props,
        children: children,
    };
}
// this function will be used to create
// real DOM from virtual DOM
function createDOM(vdom) { }
// this function will display the view
function display(vdom) { }
try {
    let comp = element("div", null);
    console.log(comp);
}
catch (error) {
    console.error(error);
}
