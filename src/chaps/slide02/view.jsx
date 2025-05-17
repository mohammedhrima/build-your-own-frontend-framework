// What we’ll build: a minimal frontend framework with JSX, TS, VDOM, etc.
function Component() {
	const { render } = init();

	return render(() => (
		<root>
			<Navbar />
			<>
				<h1 className="page-title">Welcome </h1>
				<Body />
			</>
			<Footer />
		</root>
	))
}
