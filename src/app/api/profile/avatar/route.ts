import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser, withSessionClaims } from "@/lib/auth";

// No object storage (Supabase Storage, S3, etc.) is wired up in this
// deployment, and Render's free tier has an ephemeral filesystem that
// wouldn't survive a redeploy — so the resized photo (already downscaled to
// a small JPEG client-side, see src/lib/imageResize.ts) is stored directly
// as a data URI in the existing profiles.avatar_url text column. This cap
// is a generous ceiling above the client's own output size, guarding
// against a request that skipped the client-side resize.
const MAX_AVATAR_BYTES = 600 * 1024;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "That file isn't an image." }, { status: 400 });
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json(
      { error: "That photo is too large. Try a smaller image." },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

  try {
    const result = await withSessionClaims((client) =>
      client.query(`update public.profiles set avatar_url = $1 where id = auth.uid()`, [
        dataUri,
      ]),
    );
    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "You must be signed in to update your photo." },
        { status: 401 },
      );
    }
  } catch {
    return NextResponse.json({ error: "Couldn't save your photo. Please try again." }, { status: 500 });
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return NextResponse.json({ ok: true, avatarUrl: dataUri });
}
