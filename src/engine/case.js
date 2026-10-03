export async function loadCase(id) {
  const res = await fetch(`data/cases/${id}/case.json`);
  if (!res.ok) throw new Error(`Failed to load case ${id}`);
  return res.json();
}
