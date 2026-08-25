"use client";

import { createContext, useContext } from "react";
import type { ProjectItem } from "@/lib/project-types";

type ProjectsContextValue = {
  projects: ProjectItem[];
  isLoading: boolean;
  onSelectProject: (projectId: string) => void;
};

const ProjectsContext = createContext<ProjectsContextValue>({
  projects: [],
  isLoading: true,
  onSelectProject: () => {},
});

export const ProjectsProvider = ProjectsContext.Provider;

export const useProjects = () => useContext(ProjectsContext);
