export type NavigationGroup =
  | "overview"
  | "content"
  | "distribution"
  | "system";

export type NavigationItem = {
  title: string;
  href: string;
  description: string;
  group: NavigationGroup;
};
