import "server-only";

type CanvaServiceOptions = {
  accessToken: string;
};

type CanvaCapabilitiesResponse = {
  capabilities?: string[];
};

export class CanvaService {
  private readonly accessToken: string;

  constructor(options: CanvaServiceOptions) {
    this.accessToken = options.accessToken;
  }

  async testConnection() {
    const response = await fetch(
      "https://api.canva.com/rest/v1/users/me/capabilities",
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Canva connection failed: ${response.status} ${errorBody}`,
      );
    }

    return (await response.json()) as CanvaCapabilitiesResponse;
  }

  async composeCreative() {
    return null;
  }
}

export function createCanvaServiceFromEnv() {
  const accessToken =
    process.env.CANVA_ACCESS_TOKEN?.trim() ||
    process.env.CANVA_API_KEY?.trim() ||
    "";

  if (!accessToken) {
    return null;
  }

  return new CanvaService({
    accessToken,
  });
}
