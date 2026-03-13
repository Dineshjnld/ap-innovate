import type { Project } from "@/data/mockData";
import {
  fetchProjectById,
  subscribeAllProjects,
  subscribeProjects,
  type ProjectFilterQuery,
} from "@/services/database";

export type { ProjectFilterQuery };

const normalize = (value: string) => value.trim().toLowerCase();

export const buildProjectsQueryString = (query: ProjectFilterQuery) => {
  const params = new URLSearchParams();

  if (query.categories.length > 0) {
    params.set(
      "categories",
      query.categories.map((item) => normalize(item)).join(","),
    );
  }

  if (query.districts.length > 0) {
    params.set(
      "districts",
      query.districts.map((item) => normalize(item)).join(","),
    );
  }

  if (query.search && query.search.trim().length > 0) {
    params.set("q", normalize(query.search));
  }

  return params.toString();
};

export const fetchProjects = (query: ProjectFilterQuery) =>
  new Promise<Project[]>((resolve) => {
    const unsubscribe = subscribeProjects(query, (projects) => {
      unsubscribe();
      resolve(projects);
    });
  });

export const subscribeProjectsLive = subscribeProjects;
export const subscribeAllProjectsLive = subscribeAllProjects;
export { fetchProjectById };
