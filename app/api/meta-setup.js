export default async function handler(req, res) {
  try {
    const token = process.env.META_GRAPH_API_TOKEN;

    if (!token) {
      return res.status(400).json({
        error: "META_GRAPH_API_TOKEN não configurado"
      });
    }

    const response = await fetch(
      `https://graph.facebook.com/v25.0/me/accounts?fields=id,name,category,access_token,instagram_business_account{id,username}&access_token=${token}`
    );

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({
        error: data.error
      });
    }

    const pages = data.data.map(page => ({
      page_name: page.name,
      META_FACEBOOK_PAGE_ID: page.id,
      META_GRAPH_API_TOKEN: page.access_token,
      META_INSTAGRAM_BUSINESS_ID:
        page.instagram_business_account?.id || "NÃO CONECTADO",
      instagram_username:
        page.instagram_business_account?.username || null
    }));

    return res.json({
      success: true,
      pages
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}
