const slide = document.getElementById("slide");
slide.innerHTML = `
<div class="slide-content">
  <p>Now it's time for the serious stuff.</p>
  <p>We'll start working on reusable components.</p>
  <p>When the first character of a tag is lowercase, the TypeScript (or JSX) transpiler treats it as a native HTML element and passes the tag name as a string.</p>
  <p>However, if the first character is uppercase, it assumes it's a component and passes it as a reference (identifier).</p>

  <p>Example:</p>
  <pre><code>&lt;div&gt;&lt;/div&gt;</code></pre>
  <p>Becomes:</p>
  <pre><code>element("div", null, null)</code></pre>

  <hr style="margin: 2rem 0; border: none; border-top: 1px solid #ccc;" />

  <pre><code>&lt;Div&gt;&lt;/Div&gt;</code></pre>
  <p>Becomes:</p>
  <pre><code>element(Div, null, null)</code></pre>

  <p>That's why, when using ReactJS or any framework that uses a virtual DOM, we start component names with an uppercase letter.</p>
</div>
`;
