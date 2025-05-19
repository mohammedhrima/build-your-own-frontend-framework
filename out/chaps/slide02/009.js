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
try {
    let comp = element("div", null);
    console.log(comp);
}
catch (error) {
    console.error(error);
}
// what you seen now in the console is what
// we call (VIRTUAL DOM)
