export const analyzeItemImage = async (base64Image: string) => {
  console.log("analyzeItemImage called (via server)");
  if (!base64Image) {
    throw new Error("No image data provided");
  }

  try {
    const response = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to analyze image");
    }

    return await response.json();
  } catch (error: any) {
    console.error("Analysis Error:", error);
    throw error;
  }
};

export const removeBackground = async (base64Image: string) => {
  console.log("removeBackground called (via server)");
  if (!base64Image) {
    throw new Error("No image data provided");
  }

  try {
    const response = await fetch("/api/ai/remove-background", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to remove background");
    }

    const data = await response.json();
    return data.image;
  } catch (error: any) {
    console.error("Background Removal Error:", error);
    throw error;
  }
};
