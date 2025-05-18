function element(tag, props = {}, ...children) {
    return {
        type: "element",
        tag: tag,
        props: props,
        children: children,
    };
}
