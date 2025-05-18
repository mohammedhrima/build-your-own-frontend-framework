function element(tag, props = {}, ...children) {
	return {
		type: "element",
		tag: tag,
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
