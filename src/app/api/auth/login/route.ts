import { NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'fees_hisab_session';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email || 'demo.teacher@fees-hisab.in';

    let teacherId = 'teacher-demo-uuid-001';
    let teacherName = 'Sunita Sharma';
    let teacherSalutation = "Ma'am";

    // Attempt DB lookup if Postgres connection is available
    try {
      let teacher = await prisma.user.findFirst({
        where: { email },
      });

      if (!teacher) {
        teacher = await prisma.user.create({
          data: {
            email,
            passwordHash: 'seeded_teacher_password_hash',
            name: 'Sunita Sharma',
            salutation: "Ma'am",
          },
        });
      }

      teacherId = teacher.id;
      teacherName = teacher.name;
      teacherSalutation = teacher.salutation;
    } catch {
      // Postgres not running locally; generate teacher token
    }

    const payload = {
      userId: teacherId,
      email,
      name: teacherName,
      salutation: teacherSalutation,
    };

    const token = await createSessionToken(payload);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return NextResponse.json({ success: true, teacher: payload });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
