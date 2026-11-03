(function () {
  "use strict";
  const selector = "input[data-credit],input[data-merge-total],input[data-activity]";
  function cells(table) {
    const rows = [...table.querySelectorAll("tbody>tr,tfoot>tr.activity-row")];
    return [...table.querySelectorAll(selector)].filter(input => !input.disabled && !input.readOnly).map(input => {
      const td = input.closest("td"), row = rows.indexOf(td.closest("tr"));
      const activity = input.dataset.activity?.split(":");
      const col = activity ? Number(activity[1]) : Number(td.dataset.col);
      const key = input.dataset.credit ? "credit:" + input.dataset.credit
        : input.dataset.mergeTotal ? "merge:" + input.dataset.mergeTotal : "activity:" + input.dataset.activity;
      return { input, key, row, col, span: td.rowSpan || 1 };
    }).filter(cell => cell.row >= 0);
  }
  function nextCell(list, current, key) {
    const vertical = key === "ArrowUp" || key === "ArrowDown";
    const step = key === "ArrowUp" || key === "ArrowLeft" ? -1 : 1;
    const maxRow = Math.max(...list.map(cell => cell.row + cell.span - 1));
    const maxCol = Math.max(...list.map(cell => cell.col));
    let row = current.row, col = current.col;
    if (key === "ArrowDown") row += current.span;
    else if (key === "ArrowUp") row--;
    else col += step;
    while (row >= 0 && row <= maxRow && col >= 0 && col <= maxCol) {
      const target = list.find(cell => cell.key !== current.key && cell.col === col && row >= cell.row && row < cell.row + cell.span);
      if (target) return target;
      if (vertical) row += step; else col += step;
    }
    return null;
  }
  const table = document.querySelector(".table-wrap table");
  if (!table) return;
  table.addEventListener("keydown", event => {
    if (!event.target.matches(selector) || !/^Arrow(Up|Down|Left|Right)$/.test(event.key)
      || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const list = cells(table), current = list.find(cell => cell.input === event.target);
    if (!current) return;
    event.preventDefault();
    const target = nextCell(list, current, event.key);
    if (!target) return;
    // Save the edited value before render() replaces the table's inputs.
    if (current.input.value !== current.input.defaultValue)
      current.input.dispatchEvent(new Event("change", { bubbles: true }));
    const destination = cells(table).find(cell => cell.key === target.key)?.input;
    if (destination) {
      destination.focus({ preventScroll: true });
      destination.select();
      destination.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  });
})();
