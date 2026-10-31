module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.status(200).json({
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    modelConfigured: Boolean(process.env.SOPHRON_MODEL)
  });
};
