"use client";
export function PrintButton() {
  return <button type="button" className="btn ghost sm" onClick={() => window.print()}>인쇄</button>;
}
