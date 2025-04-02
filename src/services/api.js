export async function fetchDrugInfo(batchId) {
    const response = await fetch(`http://localhost:3001/api/drug/${batchId}`);
    if (!response.ok) throw new Error("Error fetching drug info");
    return response.json();
}
