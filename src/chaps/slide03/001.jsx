const slide = document.getElementById("slide");

slide.innerHTML = `
  <div class="slide-content">
    <h1>What is JSX?</h1>
    <ul class="bullet-list">
      <li><strong>extension</strong>: enables writing XML-like syntax in JS/TS</li>
      <li><strong>relies on a parser</strong> to transpile the XML syntax to JavaScript equivalent code</li>
      <li>such as <code>Babel</code>, <code>Parcel</code>, <code>swc</code>, but we will use <strong>TypeScript</strong></li>
      <li>in <code>tsconfig.json</code>:</li>
    </ul>
    <pre><code>{
  "compilerOptions": {
    ...
    "jsx": "react",
    "jsxFactory": "element",
    "jsxFragmentFactory": "fragment"
  }
}</code></pre>
    <p>Example:</p>
    <pre><code>&lt;div id="main"&gt;Hello World&lt;/div&gt;</code></pre>
    <p>Becomes:</p>
    <pre><code>element("div", { id: "main" }, "Hello World")</code></pre>
  </div>
`;
