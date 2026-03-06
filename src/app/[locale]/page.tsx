import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("app");
  return (
    <main style={{ padding: "2rem" }}>
      <h1>{t("title")}</h1>
      <p>{t("tagline")}</p>
    </main>
  );
}
