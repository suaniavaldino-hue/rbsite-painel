import { ContentLibrarySection } from "@/components/dashboard/content-library-section";
import { listContents } from "@/services/database/content-repository";

export const dynamic = "force-dynamic";

export default async function CarouselsPage() {
  const items = await listContents({
    type: "carousel",
    order: "newest",
    limit: 24,
  });

  return (
    <ContentLibrarySection
      kicker="Carrosseis"
      title="Carrosseis prontos para narrativa e conversao"
      description="Espaco para os carrosseis gerados automaticamente com foco em autoridade, educacao e fechamento comercial."
      items={items}
      emptyTitle="Nenhum carrossel salvo ainda"
      emptyCopy="Use o planner automatico para criar carrosseis em massa com imagem, estrutura e agenda sugerida."
    />
  );
}
