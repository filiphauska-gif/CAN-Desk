"use server";

export async function generateBudgetHtml(projectId: string) {
  // This will be called to get the HTML for printing
  return { url: `/api/budget-print/${projectId}` };
}
