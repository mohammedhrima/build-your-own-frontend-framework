function element(tag, props = {}, ...children) {
    return {
        type: "element",
        tag: tag,
        dom: null,
        props: props,
        children: children,
    };
}
