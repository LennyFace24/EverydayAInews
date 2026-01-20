import { Resend } from 'resend';
import { NextResponse } from 'next/server';
export async function POST(request: Request) {
    const { email } = await request.json();
    console.log(`New subscription from: ${email}`);
    
    // save to contacts list
    const resend = new Resend(process.env.RESEND_API_KEY as string);

    // 1.create an account
    const {error:createError} = await resend.contacts.create({
        email: email,
    });
    if (createError) {
        console.error(createError);
        return new NextResponse(JSON.stringify({ message: 'Subscription failed' }), { status: 500 });
    }
    // 2.add account to contact list
    const {error:addError} = await resend.contacts.segments.add({
        email: email,
        segmentId: process.env.RESEND_SEGMENT_ID as string,
    });

    if (addError) {
        console.error(addError);
        return new NextResponse(JSON.stringify({ message: 'Subscription failed' }), { status: 500 });
    }

    return new NextResponse(JSON.stringify({ message: 'Subscription successful' }), { status: 200 });
}
