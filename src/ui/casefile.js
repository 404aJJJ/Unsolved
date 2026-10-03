export function renderCase(root, c) {
  root.innerHTML = `
    <article class="casefile">
      <h1>${c.title}</h1>
      <p>${c.summary}</p>
      <h2>Evidence</h2>
      <ul>${c.evidence.map((e) => `<li><strong>${e.name}</strong>: ${e.description}</li>`).join("")}</ul>
      <h2>Suspects</h2>
      <ul>${c.suspects.map((s) => `<li><strong>${s.name}</strong>: ${s.bio}</li>`).join("")}</ul>
    </article>`;
}
