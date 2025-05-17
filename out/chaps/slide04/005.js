const slide = document.getElementById("slide");
slide.innerHTML = `
  <div class="slide-content">
    <h1>This code will give us this output:</h1>
    <pre style="background: #1e1e1e; color: #dcdcdc; padding: 1rem; border-radius: 0.5rem; font-family: monospace;">
{
  type: "element",
  tag: "div",
  props: null,
  children: []
}
    </pre>
    <p>And this is simply the virtual DOM.</p>

    <p>Throughout the talk, we will represent virtual DOM for HTML elements as above.</p>
    <p>And for text nodes, we will do:</p>

    <pre style="background: #1e1e1e; color: #dcdcdc; padding: 1rem; border-radius: 0.5rem; font-family: monospace;">
{
  type: "text",
  value: "text value"
}
    </pre>
  </div>
`;
