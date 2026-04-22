import { ContentLibrarySection } from "@/components/dashboard/content-library-section";
import { listContents } from "@/services/database/content-repository";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const items = await listContents({
    order: "newest",
    limit: 30,
  });

  return (
    <ContentLibrarySection
      kicker="Historico"
      title="Historico consolidado de conteudo"
      description="Visao unificada dos registros gerados pelo dashboard rapido e pelo planner automatico."
      items={items}
      emptyTitle="A biblioteca historica ainda esta vazia"
      emptyCopy="Assim que a primeira geracao for salva, o historico completo passa a ser exibido aqui."
    />
  );
}
