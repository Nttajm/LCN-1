/**
 * Toggle the selected state across a NodeList of .v-item elements,
 * then call onSelect with the chosen id.
 */
export function select(items, id, onSelect) {
  items.forEach(el => el.classList.toggle('selected', el.dataset.id === id));
  onSelect(id);
}
