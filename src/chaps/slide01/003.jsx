// const [todos, setTodos] = State([]);

function TodoApp() {
	return (
		<root>
			<form class="todo-app" onsubmit={handleSubmit}>
				<h1>Minimal TODO App</h1>
				<input name="task" placeholder="Add a task" />
				<button type="submit">ADD</button>
				<ul>
					{todos().map((todo, index) => (
						<li>
							<span>{todo}</span>
							<button
								type="button"
								onclick={() => removeTodo(index)}
							>
								x
							</button>
						</li>
					))}
				</ul>
			</form>
		</root>
	);
}
