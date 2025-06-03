import { PrismaClient } from '@prisma/client';
import { Invoice, PLatestInvoice } from "./definitions";
import { formatCurrency } from "./utils";
import { equal } from 'assert';

const client = new PrismaClient();

export async function fetchRevenue() {
    console.log('fetching revenue');
    await new Promise((res, rej) => setTimeout(res, 10000));
    console.log('done fetching revenue');
    try {
        const rev = await client.revenue.findMany();
        return rev;
    } catch (error) {
        throw error;
    } finally {
        await client.$disconnect();
    }
}

export async function fetchLatestInvoices() {
    console.log('fetching latest invoices');
    await new Promise((res, rej) => setTimeout(res, 5000));
    console.log('done fetching invoices');
    try {
        const last5Invoices = await client.invoice.findMany({
            select: {
                id: true,
                amount: true,
                customer: {
                    select: {
                        name: true,
                        email: true,
                        imageUrl: true,
                    }
                }
            },
            take: 5,
            orderBy: {date: 'desc'},
        });
        return last5Invoices.map(invoice => ({...invoice, amount: formatCurrency(invoice.amount)}));
    } catch (e) {
        throw e;
    } finally {
        client.$disconnect();
    }
}

export async function fetchCardData() {
    await new Promise((res, rej) => setTimeout(res, 1000));
    try {
        const data = await Promise.all([
            client.customer.count(),
            client.invoice.count(),
            client.invoice.aggregate({
                _sum: {amount: true},
                where: {status: 'paid'}
            }),
            client.invoice.aggregate({
                _sum: {amount: true},
                where: {status: 'pending'}
            })
        ]);
        const numberOfCustomers = data[0];
        const numberOfInvoices = data[1];
        const totalPaidInvoices = data[2];
        const totalPendingInvoices = data[3];

        return {
            numberOfCustomers,
            numberOfInvoices,
            totalPaidInvoices: formatCurrency(totalPaidInvoices._sum.amount as number),
            totalPendingInvoices: formatCurrency(totalPendingInvoices._sum.amount as number),
        };
    } catch (e) {
        throw e;
    } finally {
        client.$disconnect();
    }
}

export async function fetchInvoiceById(id: string) {
    try {
        const invoice = await client.invoice.findUnique({ where: { id } });
        
        if (!invoice) {
            return null; // Explicitly return null if no invoice is found
        }
        
        // Only transform the amount if an invoice was found
        return { ...invoice, amount: invoice.amount / 100 };
    } catch (e) {
        console.error('Error fetching invoice:', e);
        throw e;
    } finally {
        await client.$disconnect();
    }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(query: string, currentPage: number) {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;
    
    try {
        const filteredInvoices = await client.invoice.findMany({
            select: {
                id: true,
                amount: true,
                date: true,
                status: true,
                customer: {
                    select: {
                        name: true,
                        email: true,
                        imageUrl: true,
                    }
                }
            },
            orderBy: {date: 'desc'},
            take: ITEMS_PER_PAGE,
            skip: offset,
            where: {
                OR: [
                    {customer: {name: {contains: query, mode: 'insensitive'}}},
                    {customer: {email: {contains: query, mode: 'insensitive'}}},
                    {status: {contains: query, mode: 'insensitive'}}
                ]
            }
        });
        console.log(filteredInvoices)
        return filteredInvoices;
    } catch (e) {
        throw e;
    } finally {
        client.$disconnect();
    }
}

export async function fetchInvoicesPages(query: string) {
    try {
        const allInvoices = await client.invoice.count({
            where: {
                OR: [
                    {customer: {name: {contains: query, mode: 'insensitive'}}},
                    {customer: {email: {contains: query, mode: 'insensitive'}}},
                    {status: {contains: query, mode: 'insensitive'}}
                ]
            }
        });
        return Math.ceil(allInvoices / ITEMS_PER_PAGE);
    } catch (e) {
        throw e;
    } finally {
        client.$disconnect();
    }
}

export async function fetchCustomers() {
    try {
        const customers = await client.customer.findMany({
            select: {id: true, name: true},
            orderBy: {name: 'asc'}
        });
        return customers;
    } catch (e) {
        throw e;
    } finally {
        client.$disconnect();
    }
}

export async function getUserByEmail(email: string) {
    try {
        const user = await client.user.findUnique({where: {email}});
        return user;
    } catch (e) {
        throw e;
    } finally {
        client.$disconnect();
    }
}