"use server";

import { signIn } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: true,
      redirectTo: "/",
    });
  } catch (error) {
    if ((error as any)?.code === "REDIRECT_ERROR") throw error;
    return { error: "Neplatný email nebo heslo" };
  }
}
