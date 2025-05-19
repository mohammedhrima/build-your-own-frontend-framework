const slide = document.getElementById("slide");
slide.innerHTML = `
<div class="slide-content">
  <h1>Reconciliation Algorithm</h1>
  <p>So far, we've been re-rendering the entire view whenever the state changes.</p>
  <p>This approach isn't efficient.</p>
  <p>Reconciliation is an algorithm that helps update only the parts</p>
  <p>of the view that actually changed.</p>
</div>
`;
