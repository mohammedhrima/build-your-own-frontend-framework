const slide = document.getElementById("slide");

slide.innerHTML = `
<div class="slide-content">
  <p>Now it's time to work on <strong>functional components</strong>.</p>
  <br/>
  <p>
    When the first character of a tag is <em>lowercase</em>, <br/>
    the JSX transpiler treats it as a native HTML element and passes the tag name as a string.
  </p>

  <br/>
  <p>
    But if the first character is <em>uppercase</em>, <br/>
    it assumes it's a component and passes it as a identifier.
  </p>

  <br/>
  <p>Example:</p>

  <pre><code>&lt;div&gt;&lt;/div&gt;</code></pre>
  <p>Transpiles to:</p>
  <pre><code>element("div", null, null)</code></pre>

  <hr style="margin: 2rem 0; border: none; border-top: 1px solid #ccc;" />

  <pre><code>&lt;Div&gt;&lt;/Div&gt;</code></pre>
  <p>Transpiles to:</p>
  <pre><code>element(Div, null, null)</code></pre>

  <p>
    That's why in ReactJS and other virtual DOM frameworks, component names always start with a capital letter.
  </p>
</div>
`;
