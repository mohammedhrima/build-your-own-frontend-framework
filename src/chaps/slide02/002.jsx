// final result
// metion the difference between html and JSX
function TodoApp() {
	const { render, State } = init();

	const [todos, setTodos] = State([]);
	const [text, setText] = State("");

	const toggleTodo = (index) => {
		const updated = todos().map(
			(todo, i) => i === index ? { ...todo, done: !todo.done } : todo);
		setTodos(updated);
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		const input = e.target.task;
		const value = input.value.trim();
		if (value) {
			setTodos([...todos(), { text: value, done: false }]);
			input.value = "";
		}
	}

	return render(() => (
		<form class="todo-app" onsubmit={handleSubmit}>
			<h1>Minimal TODO App</h1>
			<input name="task" placeholder="Add a task" value={text()} />
			<button type="submit">ADD</button>
			<ul>
				{todos().map((todo, index) => (
					<li class={todo.done ? "done" : ""} onclick={() => toggleTodo(index)} >
						{todo.text}
					</li>
				))}
			</ul>
		</form>
	));
}

function Component() {
	const { render } = init();

	return render(() => (
		<root>
			<TodoApp />
		</root>
	));
}
