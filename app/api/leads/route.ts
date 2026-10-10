import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received lead submission:', body);
    return NextResponse.json({ success: true, message: 'Lead received successfully' });
  } catch (error) {
    console.error('Error handling lead submission:', error);
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
