// file.jsx
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
	let comp = <div></div>;
	console.log(comp);
} catch (error) {
	console.error(error);
}

// this JSX code will turn into ->
