/** Keep the mobile scripture actions on the opposite side of the selected text. */
export function mobileSelectionSheetEdge(
  selectionTop: number,
  selectionBottom: number,
  viewportTop: number,
  viewportHeight: number,
): 'top' | 'bottom' {
  const midpoint = (selectionTop + selectionBottom) / 2;
  return midpoint >= viewportTop + viewportHeight / 2 ? 'top' : 'bottom';
}

export function selectionSheetEdgeForRect(rect: Pick<DOMRect, 'top' | 'bottom'>): 'top' | 'bottom' {
  const viewport = window.visualViewport;
  return mobileSelectionSheetEdge(rect.top, rect.bottom, viewport?.offsetTop ?? 0, viewport?.height ?? window.innerHeight);
}
