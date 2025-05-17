







// this
const ELEMENT = "element";

function element(tag, props = {}, ...children) {
    return {
        type: ELEMENT,
        tag: tag,
        props: props,
        children: children
    };
}

let comp = element("div", null);

console.log(comp);

/*
	+ This code will give us this output:
			{
				type: "element",
				tag: "div",
				props: null,
				children: []
			}

	+ And this is simply the virtual DOM
	+ Throughout the talk, we will represent virtual DOM for HTML elements as above
	+ And for text nodes, we will do:
			{
				type: "text",
				value: "text value"
			}	
*/