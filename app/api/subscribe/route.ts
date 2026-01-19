import { Resend } from 'resend';
import { NextResponse } from 'next/server';
export async function POST(request: Request) {
    const { email } = await request.json();
    console.log(`New subscription from: ${email}`);
    
    // 验证电子邮件格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        return new NextResponse(JSON.stringify({ message: 'Please enter a valid email address.' }), { status: 400 });
    }
    
    // save to contacts list
    const resend = new Resend(process.env.RESEND_API_KEY as string);

    // 1.create an account
    const {error:createError} = await resend.contacts.create({
        email: email,
    });
    if (createError) {
        console.error(createError);
        // 检查是否为验证错误
        if (createError.statusCode === 422) {
            return new NextResponse(JSON.stringify({ message: 'Please enter a valid email address.' }), { status: 400 });
        }
        return new NextResponse(JSON.stringify({ message: 'Subscription failed' }), { status: 500 });
    }
    // 2.add account to contact list
    const {error:addError} = await resend.contacts.segments.add({
        email: email,
        segmentId: process.env.RESEND_SEGMENT_ID as string,
    });

    if (addError) {
        console.error(addError);
        // 检查是否为验证错误
        if (addError.statusCode === 422) {
            return new NextResponse(JSON.stringify({ message: 'Please enter a valid email address.' }), { status: 400 });
        }
        return new NextResponse(JSON.stringify({ message: 'Subscription failed' }), { status: 500 });
    }

    return new NextResponse(JSON.stringify({ message: 'Subscription successful' }), { status: 200 });
}
