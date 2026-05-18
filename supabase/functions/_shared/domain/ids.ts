const DISPLAY_ID_PATTERN = /^(USR|HSP|AMB|REQ|VIST|ORG|DOC)-[A-F0-9]{3,6}$/i;

export const maybeResolveDisplayId = async (
  supabaseAdmin: any,
  rawId: string | null | undefined,
): Promise<string | null> => {
  if (!rawId) return null;
  const id = String(rawId).trim();
  if (!id) return null;

  if (DISPLAY_ID_PATTERN.test(id)) {
    const { data: uuid, error } = await supabaseAdmin.rpc("get_entity_id", {
      p_display_id: id.toUpperCase(),
    });
    if (error || !uuid) {
      throw new Error(`Could not resolve ID: ${id}`);
    }
    return uuid as string;
  }

  return id;
};
