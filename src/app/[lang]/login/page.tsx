import { Suspense } from "react";
import { getI18n } from "@/i18n/server";
import { pageTitle } from "@/i18n/metadata";
import { LoginForm } from "./login-form";

export const generateMetadata = pageTitle((d) => d.login.pageTitle);

export default async function LoginPage(props: PageProps<"/[lang]/login">) {
  const { d } = await getI18n();
  return (
    <section className="mx-auto max-w-sm pt-8">
      <h1 className="text-2xl font-semibold">{d.login.title}</h1>
      <p className="mt-1 mb-6 text-sm opacity-70">{d.login.intro}</p>
      <Suspense>
        <LoginFormWithNext searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}

async function LoginFormWithNext({ searchParams }: Pick<PageProps<"/[lang]/login">, "searchParams">) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}
