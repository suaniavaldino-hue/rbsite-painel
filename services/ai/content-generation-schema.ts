export const GENERATED_CONTENT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "subtitle",
    "hook",
    "artText",
    "visualIdea",
    "bestPostingTime",
    "postingSuggestion",
    "captions",
    "hashtags",
  ],
  properties: {
    title: { type: "string" },
    subtitle: { type: "string" },
    hook: { type: "string" },
    artText: { type: "string" },
    visualIdea: { type: "string" },
    bestPostingTime: { type: "string" },
    postingSuggestion: {
      type: "object",
      additionalProperties: false,
      required: ["weekday", "time", "isoDateTime", "rationale"],
      properties: {
        weekday: { type: "string" },
        time: { type: "string" },
        isoDateTime: { type: "string" },
        rationale: { type: "string" },
      },
    },
    captions: {
      type: "object",
      additionalProperties: false,
      required: ["instagram", "facebook"],
      properties: {
        instagram: { type: "string" },
        facebook: { type: "string" },
      },
    },
    hashtags: {
      type: "object",
      additionalProperties: false,
      required: ["instagram", "facebook"],
      properties: {
        instagram: {
          type: "array",
          items: { type: "string" },
          maxItems: 15,
        },
        facebook: {
          type: "array",
          items: { type: "string" },
          maxItems: 8,
        },
      },
    },
    carousel: {
      type: "object",
      additionalProperties: false,
      required: ["coverHook", "slides", "finalSlideCta"],
      properties: {
        coverHook: { type: "string" },
        slides: {
          type: "array",
          minItems: 5,
          maxItems: 8,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "body"],
            properties: {
              title: { type: "string" },
              body: { type: "string" },
            },
          },
        },
        finalSlideCta: { type: "string" },
      },
    },
    reel: {
      type: "object",
      additionalProperties: false,
      required: ["openingHook", "scenes", "shortCaption"],
      properties: {
        openingHook: { type: "string" },
        shortCaption: { type: "string" },
        scenes: {
          type: "array",
          minItems: 3,
          maxItems: 8,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["scene", "visual", "spokenLine", "onScreenText"],
            properties: {
              scene: { type: "string" },
              visual: { type: "string" },
              spokenLine: { type: "string" },
              onScreenText: { type: "string" },
            },
          },
        },
      },
    },
  },
} as const;
