function TodoApp() {
    const { render, State } = init();
    const [todos, setTodos] = State([]);
    const [text, setText] = State("");
    const toggleTodo = (index) => {
        const updated = todos().map((todo, i) => i === index ? { ...todo, done: !todo.done } : todo);
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
    };
    return render(() => (element("form", { class: "todo-app", onsubmit: handleSubmit },
        element("h1", null, "Minimal TODO App"),
        element("input", { name: "task", placeholder: "Add a task", value: text() }),
        element("button", { type: "submit" }, "ADD"),
        element("ul", null, todos().map((todo, index) => (element("li", { class: todo.done ? "done" : "", onclick: () => toggleTodo(index) }, todo.text)))))));
}
function Component() {
    const { render } = init();
    return render(() => (element("root", null,
        element(TodoApp, null))));
}
