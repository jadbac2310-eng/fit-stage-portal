import { createAdminClient } from "./supabase";

export interface WikiPage {
  id: string;
  title: string;
  slug: string;
  folder: string;
  category?: string;
  content: string;
  createdBy?: string;
  authorName?: string;
  authorAvatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

type DbRow = {
  id: string;
  title: string;
  slug: string;
  folder: string;
  category: string | null;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function fromDb(row: DbRow): WikiPage {
  return {
    id:        row.id,
    title:     row.title,
    slug:      row.slug,
    folder:    row.folder,
    category:  row.category  ?? undefined,
    content:   row.content,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function buildAuthorMap(): Promise<Map<string, { name: string; avatarUrl?: string }>> {
  const { data } = await createAdminClient()
    .from("members")
    .select("auth_user_id, name, avatar_url");
  const map = new Map<string, { name: string; avatarUrl?: string }>();
  for (const m of data ?? []) {
    if (m.auth_user_id) map.set(m.auth_user_id, { name: m.name, avatarUrl: m.avatar_url ?? undefined });
  }
  return map;
}

function withAuthor(page: WikiPage, authorMap: Map<string, { name: string; avatarUrl?: string }>): WikiPage {
  if (!page.createdBy) return page;
  const author = authorMap.get(page.createdBy);
  return { ...page, authorName: author?.name, authorAvatarUrl: author?.avatarUrl };
}

export async function getWikiPages(): Promise<WikiPage[]> {
  const [pagesRes, authorMap] = await Promise.all([
    createAdminClient().from("wiki_pages").select("*").order("updated_at", { ascending: false }),
    buildAuthorMap(),
  ]);
  if (pagesRes.error) throw pagesRes.error;
  return (pagesRes.data as DbRow[]).map(fromDb).map((p) => withAuthor(p, authorMap));
}

export async function getWikiPagesByFolder(folder: string): Promise<WikiPage[]> {
  const [pagesRes, authorMap] = await Promise.all([
    createAdminClient().from("wiki_pages").select("*").eq("folder", folder).order("updated_at", { ascending: false }),
    buildAuthorMap(),
  ]);
  if (pagesRes.error) throw pagesRes.error;
  return (pagesRes.data as DbRow[]).map(fromDb).map((p) => withAuthor(p, authorMap));
}

export async function getWikiPage(slug: string): Promise<WikiPage | null> {
  const [pageRes, authorMap] = await Promise.all([
    createAdminClient().from("wiki_pages").select("*").eq("slug", slug).single(),
    buildAuthorMap(),
  ]);
  if (pageRes.error || !pageRes.data) return null;
  return withAuthor(fromDb(pageRes.data as DbRow), authorMap);
}

export async function createWikiPage(
  input: Pick<WikiPage, "title" | "slug" | "folder" | "content"> & { category?: string; createdBy?: string }
): Promise<WikiPage> {
  const { data, error } = await createAdminClient()
    .from("wiki_pages")
    .insert({
      title:      input.title,
      slug:       input.slug,
      folder:     input.folder,
      category:   input.category  ?? null,
      content:    input.content,
      created_by: input.createdBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function updateWikiPage(
  slug: string,
  input: Partial<Pick<WikiPage, "title" | "folder" | "category" | "content">>
): Promise<WikiPage | null> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title    !== undefined) patch.title    = input.title;
  if (input.folder   !== undefined) patch.folder   = input.folder;
  if (input.category !== undefined) patch.category = input.category ?? null;
  if (input.content  !== undefined) patch.content  = input.content;

  const { data, error } = await createAdminClient()
    .from("wiki_pages")
    .update(patch)
    .eq("slug", slug)
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function deleteWikiPage(slug: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("wiki_pages")
    .delete()
    .eq("slug", slug);
  if (error) throw error;
}

export async function getWikiFolders(): Promise<string[]> {
  const { data, error } = await createAdminClient()
    .from("wiki_folders")
    .select("name")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: { name: string }) => r.name);
}

export async function createWikiFolder(name: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("wiki_folders")
    .insert({ name })
    .select()
    .single();
  if (error && error.code !== "23505") throw error; // ignore duplicate
}

export async function deleteWikiFolder(name: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("wiki_pages").delete().eq("folder", name);
  const { error } = await supabase.from("wiki_folders").delete().eq("name", name);
  if (error) throw error;
}

export async function wikifolderExists(name: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from("wiki_folders")
    .select("name")
    .eq("name", name)
    .maybeSingle();
  return !!data;
}
