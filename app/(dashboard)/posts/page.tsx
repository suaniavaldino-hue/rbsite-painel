import { ContentLibrarySection } from "@/components/dashboard/content-library-section";
import { listContents } from "@/services/database/content-repository";

export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const items = await listContents({
    type: "post",
    order: "newest",
    limit: 24,
  });

  return (
    <ContentLibrarySection
      kicker="Posts"
      title="Posts unicos da RB Site"
      description="Biblioteca central dos posts gerados pelo painel, com persistencia preparada para evolucao SaaS."
      items={items}
      emptyTitle="Nenhum post salvo ainda"
      emptyCopy="Gere um post rapido no dashboard ou use o planner automatico para preencher esta biblioteca."
    />
  );
}
