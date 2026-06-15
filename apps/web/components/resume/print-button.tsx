'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="fixed right-4 top-4 z-10 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-neutral-700 print:hidden"
    >
      Print / Save PDF
    </button>
  );
}
