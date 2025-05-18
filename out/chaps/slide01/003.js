// const [todos, setTodos] = State([]);
function TodoApp() {
    return (element("root", null,
        element("form", { class: "todo-app", onsubmit: handleSubmit },
            element("h1", null, "Minimal TODO App"),
            element("input", { name: "task", placeholder: "Add a task" }),
            element("button", { type: "submit" }, "ADD"),
            element("ul", null, todos().map((todo, index) => (element("li", null,
                element("span", null, todo),
                element("button", { type: "button", onclick: () => removeTodo(index) }, "x"))))))));
}
