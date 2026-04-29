export const wikiFolder = (folder: string) =>
  `/wiki/${encodeURIComponent(folder)}`;

export const wikiPage = (folder: string, slug: string) =>
  `/wiki/${encodeURIComponent(folder)}/${slug}`;

export const wikiAgent = (opts?: { folder?: string; edit?: string }) => {
  const params = new URLSearchParams();
  if (opts?.folder) params.set("folder", opts.folder);
  if (opts?.edit)   params.set("edit",   opts.edit);
  const qs = params.toString();
  return qs ? `/wiki/agent?${qs}` : "/wiki/agent";
};
