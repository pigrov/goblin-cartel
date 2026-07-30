import { useEffect, useState } from "react";

import { type ContentVersion } from "../../api/adminApi";
import { adminContentVersionPath, adminSectionPath, readAdminRoutePath, type AdminSection } from "./adminRoutes";

export function useAdminRoute() {
  const initialRoute = readAdminRoute();
  const [activeSection, setActiveSection] = useState<AdminSection>(initialRoute.section);
  const [contentVersionSlug, setContentVersionSlug] = useState<string | null>(initialRoute.contentVersionSlug);

  useEffect(() => {
    function handlePopState() {
      const route = readAdminRoute();
      setActiveSection(route.section);
      setContentVersionSlug(route.contentVersionSlug);
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  function navigateToSection(section: AdminSection) {
    const nextPath = adminSectionPath(section);
    window.history.pushState(null, "", nextPath);
    setActiveSection(section);
    setContentVersionSlug(null);
  }

  function navigateToContentList() {
    window.history.pushState(null, "", adminSectionPath("content"));
    setActiveSection("content");
    setContentVersionSlug(null);
  }

  function navigateToContentVersion(version: ContentVersion) {
    window.history.pushState(null, "", adminContentVersionPath(version.version));
    setActiveSection("content");
    setContentVersionSlug(version.version);
  }

  return {
    activeSection,
    contentVersionSlug,
    navigateToContentList,
    navigateToContentVersion,
    navigateToSection
  };
}

function readAdminRoute(): { contentVersionSlug: string | null; section: AdminSection } {
  return readAdminRoutePath(window.location.pathname);
}
