function element(tag, props = {}, ...children) {
    return {
        type: "element",
        tag: tag,
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
