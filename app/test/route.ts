import { fetchLatestInvoices, fetchRevenue } from "../lib/prisma-data";

export async function GET() {
    const latest = await fetchLatestInvoices();
    return Response.json({latest})
}