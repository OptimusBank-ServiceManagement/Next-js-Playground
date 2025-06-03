import { PrismaClient, PrismaPromise } from '@prisma/client';
import { customers, invoices, revenue, users } from '../lib/placeholder-data';
import bcryptjs from 'bcryptjs';

type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

const client = new PrismaClient();

async function seedUsers(tx: TransactionClient) {
    return Promise.all(users.map(async (user) => {
        const hashedPassword = await bcryptjs.hash(user.password, 10);
        return tx.user.create({
            data: {
                name: user.name,
                email: user.email,
                password: hashedPassword
            }
        });
    }));
}

async function seedInvoices(tx: TransactionClient, customers: {id: string, name: string, email: string}[]) {
    return Promise.all(invoices.map(async (invoice) => {
        return tx.invoice.create({
            data: {
                customerId: customers[Math.floor(Math.random() * customers.length)].id,
                status: invoice.status,
                amount: invoice.amount,
                date: new Date(invoice.date)
            }
        });
    }));
}

async function seedCustomers(tx: TransactionClient) {
    return Promise.all(customers.map(async (customer) => {
        return tx.customer.create({
            data: {
                name: customer.name,
                email: customer.email,
                imageUrl: customer.image_url
            }
        });
    }));
}

async function seedRevenue(tx: TransactionClient) {
    return Promise.all(revenue.map(async (rev) => {
        return tx.revenue.create({
            data: {
                revenue: rev.revenue,
                month: rev.month
            }
        });
    }));
}

export async function GET() {
    try {
        let customers;
        await client.$transaction(async (tx) => {
            await seedUsers(tx);
            customers = await seedCustomers(tx);
            await seedInvoices(tx, customers);
            await seedRevenue(tx);
        })
        return Response.json({message: 'Database seeded successfully'}, {status: 200});
    } catch (e) {
        console.log(e);
        console.error('Error seeding db:', e);
        return Response.json({message: 'Error seeding db', error: e}, {status: 500});
    } finally {
        client.$disconnect();
    }
}