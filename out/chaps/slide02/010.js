slide.innerHTML = `
  <div class="slide-content">
    <h1>Virtual DOM Format</h1>
    <ul class="bullet-list">
      <li>This is how we represent <strong>HTML elements</strong> in our virtual DOM:</li>
    </ul>
    <pre><code>{
  type: "element",
  tag: "div",
  props: null,
  children: []
}</code></pre>
    <p><strong>Explanation:</strong></p>
    <ul class="bullet-list">
      <li>type	   : distinguishes between an element or a text node</li>
      <li>tag	     : the tag name of the element (e.g., <code>"div"</code>, <code>"span"</code>)</li>
      <li>props	   : attributes or properties of the element (can be <code>null</code> or an object)</li>
      <li>children : array of child virtual nodes (can be empty)</li>
      <li>dom      : we will be using it later to save the real DOM</li>
    </ul>
	<br/>
    <p>This is simply the <strong>virtual DOM</strong>.</p>
    <p>And when representing <strong>text nodes</strong>, we use:</p>
    <pre><code>{
  type: "text",
  value: "text value"
}</code></pre>
    <p>remember this one, we will get to it later</p>
  </div>
`;
