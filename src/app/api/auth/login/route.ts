import { NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'fees_hisab_session';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const usernameInput = body.username || body.email || 'Babita';

    let teacherId = 'teacher-demo-uuid-001';
    let teacherName = 'Babita';
    let teacherSalutation = "Ma'am";
    const email = usernameInput.includes('@') ? usernameInput : 'babita@fees-hisab.in';

    // Attempt DB lookup if Postgres connection is available
    try {
      let teacher = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { name: { contains: 'Babita', mode: 'insensitive' } }],
        },
      });

      if (!teacher) {
        teacher = await prisma.user.findFirst();
      }

      if (!teacher) {
        teacher = await prisma.user.create({
          data: {
            email: 'babita@fees-hisab.in',
            passwordHash: 'seeded_teacher_password_hash',
            name: 'Babita',
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
