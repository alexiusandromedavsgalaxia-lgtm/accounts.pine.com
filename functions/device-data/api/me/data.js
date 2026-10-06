export async function onRequestGet(c) {
  return Response.json({
    endpoint: "/device-data/api/me/data",
    message: "Use the authenticated account-data endpoint.",
  });
}
