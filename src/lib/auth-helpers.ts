import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { authId: authUser.id } });
  return user;
}
