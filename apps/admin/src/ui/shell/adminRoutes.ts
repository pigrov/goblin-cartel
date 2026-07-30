export type AdminSection = "dashboard" | "content" | "credentials";

export function readAdminRoutePath(path: string): { contentVersionSlug: string | null; section: AdminSection } {
  const normalizedPath = path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;

  if (normalizedPath === "/admin/content" || normalizedPath.startsWith("/admin/content/")) {
    const contentVersionSlug = normalizedPath.startsWith("/admin/content/")
      ? decodeURIComponent(normalizedPath.slice("/admin/content/".length))
      : null;

    return {
      contentVersionSlug: contentVersionSlug || null,
      section: "content"
    };
  }

  if (normalizedPath === "/admin/credentials") {
    return {
      contentVersionSlug: null,
      section: "credentials"
    };
  }

  return {
    contentVersionSlug: null,
    section: "dashboard"
  };
}

export function adminSectionPath(section: AdminSection): string {
  switch (section) {
    case "content":
      return "/admin/content";
    case "credentials":
      return "/admin/credentials";
    default:
      return "/admin/";
  }
}

export function adminContentVersionPath(version: string): string {
  return `/admin/content/${encodeURIComponent(version)}`;
}
