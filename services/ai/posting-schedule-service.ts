import "server-only";

import type {
  ContentGenerationRequest,
  PostingSuggestion,
} from "@/types/content-generation";

type ScheduleSlot = {
  weekday: PostingSuggestion["weekday"];
  time: PostingSuggestion["time"];
  rationale: string;
};

const WEEKDAY_INDEX: Record<PostingSuggestion["weekday"], number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

const DEFAULT_SLOTS: ScheduleSlot[] = [
  {
    weekday: "segunda",
    time: "11:00",
    rationale:
      "Segunda no fim da manha costuma ter boa abertura para conteudos estrategicos e comerciais.",
  },
  {
    weekday: "terca",
    time: "12:30",
    rationale:
      "Terca no horario de almoco tende a performar bem para conteudos educativos e de autoridade.",
  },
  {
    weekday: "quarta",
    time: "18:30",
    rationale:
      "Quarta no inicio da noite favorece alcance e resposta de empresarios que revisitam o celular apos o expediente.",
  },
  {
    weekday: "quinta",
    time: "11:30",
    rationale:
      "Quinta no fim da manha cria uma boa janela para conversao antes do pico de tarefas da tarde.",
  },
  {
    weekday: "sexta",
    time: "19:00",
    rationale:
      "Sexta a noite ajuda conteudos com apelo comercial e decisao de compra para a semana seguinte.",
  },
  {
    weekday: "sabado",
    time: "10:30",
    rationale:
      "Sabado de manha pode render boa atencao para conteudos leves, visuais e de posicionamento.",
  },
  {
    weekday: "domingo",
    time: "20:00",
    rationale:
      "Domingo a noite costuma ser forte para planejamento da semana e conteudos de presenca digital.",
  },
];

const FORMAT_SLOT_PRIORITY: Record<
  ContentGenerationRequest["format"],
  PostingSuggestion["weekday"][]
> = {
  post: ["segunda", "quinta", "sexta", "terca", "quarta", "sabado", "domingo"],
  carousel: [
    "terca",
    "quarta",
    "quinta",
    "segunda",
    "sexta",
    "domingo",
    "sabado",
  ],
  reel: ["quarta", "sexta", "domingo", "quinta", "terca", "sabado", "segunda"],
};

const PLATFORM_PREFERRED_TIMES: Record<
  ContentGenerationRequest["platform"],
  PostingSuggestion["time"][]
> = {
  instagram: ["18:30", "19:00", "20:00", "12:30", "11:30", "11:00", "10:30"],
  facebook: ["11:30", "12:30", "11:00", "18:30", "19:00", "20:00", "10:30"],
  both: ["18:30", "12:30", "11:30", "19:00", "11:00", "20:00", "10:30"],
};

function resolvePreferredSlot(request: ContentGenerationRequest) {
  const preferredWeekdays = FORMAT_SLOT_PRIORITY[request.format];
  const preferredTimes = PLATFORM_PREFERRED_TIMES[request.platform];

  const slot = DEFAULT_SLOTS.find((candidate) => {
    return (
      preferredWeekdays.includes(candidate.weekday) &&
      preferredTimes.includes(candidate.time)
    );
  });

  return slot ?? DEFAULT_SLOTS[0];
}

function buildNextOccurrence(weekday: number, time: string) {
  const now = new Date();
  const [hours, minutes] = time.split(":").map(Number);
  const scheduled = new Date(now);

  scheduled.setHours(hours ?? 0, minutes ?? 0, 0, 0);

  const dayOffset = (weekday - now.getDay() + 7) % 7;
  scheduled.setDate(now.getDate() + dayOffset);

  if (scheduled.getTime() <= now.getTime()) {
    scheduled.setDate(scheduled.getDate() + 7);
  }

  return scheduled;
}

export function buildPostingSuggestion(
  request: ContentGenerationRequest,
): PostingSuggestion {
  const slot = resolvePreferredSlot(request);
  const scheduledAt = buildNextOccurrence(
    WEEKDAY_INDEX[slot.weekday],
    slot.time,
  );

  return {
    weekday: slot.weekday,
    time: slot.time,
    isoDateTime: scheduledAt.toISOString(),
    rationale: `${slot.rationale} O formato ${request.format} para ${request.platform === "both" ? "Instagram e Facebook" : request.platform} encaixa melhor nessa janela.`,
  };
}

export function formatPostingSuggestionLabel(suggestion: PostingSuggestion) {
  return `${suggestion.weekday} ${suggestion.time}`;
}
