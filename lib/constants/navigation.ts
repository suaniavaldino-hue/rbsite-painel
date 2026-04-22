import type { NavigationItem } from "@/types/navigation";

export const DASHBOARD_NAVIGATION: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    description: "Indicadores centrais, atividade recente e visao executiva.",
    group: "overview",
  },
  {
    title: "Planejamento",
    href: "/planejamento",
    description: "Definicao de objetivos, pilares, frequencia e plano mensal.",
    group: "content",
  },
  {
    title: "Calendario",
    href: "/calendario",
    description: "Grade editorial com leitura mensal e semanal.",
    group: "distribution",
  },
  {
    title: "Posts",
    href: "/posts",
    description: "Geracao e organizacao de posts unicos por plataforma.",
    group: "content",
  },
  {
    title: "Carrosseis",
    href: "/carrosseis",
    description: "Estrutura de slides para narrativa, autoridade e oferta.",
    group: "content",
  },
  {
    title: "Reels",
    href: "/reels",
    description: "Roteiros, ganchos e cenas orientadas a retencao.",
    group: "content",
  },
  {
    title: "Legendas",
    href: "/legendas",
    description: "Textos por plataforma com foco comercial e estrategico.",
    group: "content",
  },
  {
    title: "Hashtags",
    href: "/hashtags",
    description: "Agrupamentos separados para Instagram e Facebook.",
    group: "content",
  },
  {
    title: "Agendamentos",
    href: "/agendamentos",
    description: "Controle de horarios, reagendamentos e status de publicacao.",
    group: "distribution",
  },
  {
    title: "Historico",
    href: "/historico",
    description: "Biblioteca de conteudos gerados, aprovados e publicados.",
    group: "distribution",
  },
  {
    title: "Templates",
    href: "/templates",
    description: "Modelos reaproveitaveis para acelerar producao de conteudo.",
    group: "system",
  },
  {
    title: "Integracoes",
    href: "/integracoes",
    description: "Conexao segura com OpenAI, Meta e futuras automacoes.",
    group: "system",
  },
  {
    title: "Configuracoes",
    href: "/configuracoes",
    description: "Parametros da marca, CTA, subdominio e identidade da RB Site.",
    group: "system",
  },
];
