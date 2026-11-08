import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  const placeId = Deno.env.get("GOOGLE_PLACE_ID");

  if (!apiKey || !placeId) {
    return new Response(JSON.stringify({
      reviews: [],
      message: "Google reviews will appear here once the Google Business Profile integration is configured."
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "displayName,rating,userRatingCount,reviews,googleMapsUri,attributions",
      },
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("Google Places API error", response.status, details);
      return new Response(JSON.stringify({ reviews: [], message: "Google reviews are temporarily unavailable. Please read them on Google." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const place = await response.json();
    return new Response(JSON.stringify({
      displayName: place.displayName?.text || "Sunil Stickering & Digitals",
      rating: place.rating ?? null,
      userRatingCount: place.userRatingCount ?? null,
      googleMapsUri: place.googleMapsUri || null,
      attributions: place.attributions || [],
      reviews: (place.reviews || []).slice(0, 5),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=900" },
    });
  } catch (error) {
    console.error("Google reviews function failed", error);
    return new Response(JSON.stringify({ reviews: [], message: "Google reviews are temporarily unavailable. Please read them on Google." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
