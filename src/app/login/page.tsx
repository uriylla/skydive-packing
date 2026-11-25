import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar · Plegados" };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <section className="mx-auto max-w-sm pt-8">
      <h1 className="text-2xl font-semibold">Acceso responsables</h1>
      <p className="mt-1 mb-6 text-sm opacity-70">
        Para gestionar paracaídas, plegadores y jornadas, o autorizar un dispositivo.
      </p>
      <Suspense>
        <LoginFormWithNext searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}

async function LoginFormWithNext({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}
