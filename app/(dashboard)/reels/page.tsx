import { ContentLibrarySection } from "@/components/dashboard/content-library-section";
import { listContents } from "@/services/database/content-repository";

export const dynamic = "force-dynamic";

export default async function ReelsPage() {
  const items = await listContents({
    type: "reel",
    order: "newest",
    limit: 24,
  });

  return (
    <ContentLibrarySection
      kicker="Reels"
      title="Roteiros e ganchos para Reels"
      description="A biblioteca de reels reune os conteudos pensados para mais retencao, distribuicao e alcance comercial."
      items={items}
      emptyTitle="Nenhum reel salvo ainda"
      emptyCopy="Gere reels pelo planner automatico para alimentar este modulo com roteiros e melhores janelas de postagem."
    />
  );
}
