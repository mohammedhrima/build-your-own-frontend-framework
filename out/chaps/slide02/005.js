function element(tag, props = {}, ...children) {
    return {
        type: "element",
        tag: tag,
        dom: null,
        props: props,
        children: children,
    };
}
// add try catch block
try {
    let comp = element("div", null);
    console.log(comp);
}
catch (error) {
    console.error(error);
}
