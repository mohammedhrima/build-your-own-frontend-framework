const ELEMENT = "element";
function element(tag, props = {}, ...children) {
    return {
        type: ELEMENT,
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
// in the console you will see something like this
// 	{
// 		"type": "element",
// 		"tag": "div",
// 		"props": null,
// 		"children": []
// 	}
