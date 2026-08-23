export interface Assets {
  baseUrl: string;
  frames: {
    idle: string;
    talking: string[];
    closed?: string;
    emotes: Record<string, string>;
  };
}

export function defineAssets(spec: Assets): Assets {
  return spec;
}
