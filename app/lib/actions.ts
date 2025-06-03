'use server'

import { signIn } from '@/auth';
import { PrismaClient } from '@prisma/client';
import { AuthError } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

export type State = {
    errors?: {
      customerId?: string[];
      amount?: string[];
      status?: string[];
    };
    message?: string | null;
};

const dbClient = new PrismaClient();

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        message: 'Please select a customer'
    }),
    amount: z.coerce
    .number()
    .gt(0, {message: 'Please input an amount greater than $0'}),
    status: z.enum(['pending', 'paid'], {message: 'Please select an invoice status'}),
    date: z.string()
});

const CreateInvoice = FormSchema.omit({id: true, date: true});

export async function createInvoice(prevState: State, formData: FormData): Promise<State> {
    const rawData = Object.fromEntries(formData.entries());

    const validatedData = CreateInvoice.safeParse(rawData);

    if (!validatedData.success) {
        console.log(validatedData.error)
        return {
            message: 'Missing Fields. Failed to Create Invoice',
            errors: validatedData.error.flatten().fieldErrors
        }
    }

    const {customerId, amount, status} = validatedData.data;
    const amountInCents = amount * 100;

    try {
        await dbClient.invoice.create({
            data: {
                customerId: customerId,
                amount: amountInCents,
                status: status,
                date: new Date()
            }
        });
    } catch (e) {
        console.log('did you get to error',e)
        return {message: 'DB Error. Could not create invoice'};
    } finally {
        console.log('did you get to finally')
        dbClient.$disconnect();
    }
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

const UpdateInvoice = FormSchema.omit({id: true, date: true})
export async function updateInvoice(id: string, formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());

    const validatedData = UpdateInvoice.parse(rawData);
    try {
        await dbClient.invoice.update({
            where: {id: id},
            data: {
                customerId: validatedData.customerId,
                amount: validatedData.amount * 100,
                status: validatedData.status,
            }
        });
    } catch (e) {
        return {success: false, message: 'Could not update invoice'};
    } finally {
        dbClient.$disconnect();
    }
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    try {
        await dbClient.invoice.delete({
            where: {id: id},
        });
        revalidatePath('/dashboard/invoices');
    } catch (e) {
        console.log(e)
        return {success: false, message: 'Could not delete invoice'};
    } finally {dbClient.$disconnect()}
}

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
  ) {
    try {
      await signIn('credentials', formData);
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.type) {
          case 'CredentialsSignin':
            return 'Invalid credentials.';
          default:
            return 'Something went wrong.';
        }
      }
      throw error;
    }
  }