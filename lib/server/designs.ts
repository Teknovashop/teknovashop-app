export async function claimDesign(db: any, designId: string, userId: string) {
  const updated = await db.from("designs").update({ user_id: userId }).eq("id", designId).is("user_id", null);
  if (updated.error) throw updated.error;

  const result = await db.from("designs").select("user_id").eq("id", designId).maybeSingle();
  if (result.error) throw result.error;
  return result.data?.user_id === userId;
}